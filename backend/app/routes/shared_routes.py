import datetime
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from app.routes.auth_routes import get_current_user_from_token
from app.store import db

router = APIRouter(prefix="", tags=["Shared"])

class StartQRSessionRequest(BaseModel):
    subject_code: str
    validity_seconds: int = 45

class MarkQRScanRequest(BaseModel):
    token: str

class ManualAttendanceRequest(BaseModel):
    student_id: str
    subject_code: str
    status: str # 'present', 'absent', 'late'

@router.get("/notices")
def list_notices():
    with db.lock:
        return db.notices

@router.post("/attendance/qr/start")
def start_qr_session(req: StartQRSessionRequest, current_user = Depends(get_current_user_from_token)):
    if current_user.get("role") not in ("Faculty", "Admin"):
        raise HTTPException(status_code=403, detail="Only faculty/admin can initiate dynamic QR attendance")

    with db.lock:
        token = f"LW-QR-{uuid.uuid4().hex[:8].upper()}"
        now = datetime.datetime.now(datetime.timezone.utc)
        expires_at = now + datetime.timedelta(seconds=req.validity_seconds)
        
        session_info = {
            "token": token,
            "subject_code": req.subject_code,
            "faculty_id": current_user["id"],
            "created_at": now.isoformat(),
            "expires_at": expires_at.isoformat(),
            "scanned_students": []
        }
        db.qr_sessions[token] = session_info

        return {
            "success": True,
            "token": token,
            "subject_code": req.subject_code,
            "expires_at": expires_at.isoformat(),
            "validity_seconds": req.validity_seconds
        }

@router.get("/attendance/qr/active")
def get_active_qr_session(subject_code: str, current_user = Depends(get_current_user_from_token)):
    with db.lock:
        now = datetime.datetime.now(datetime.timezone.utc)
        for token, sess in list(db.qr_sessions.items()):
            if sess.get("subject_code") == subject_code:
                exp = datetime.datetime.fromisoformat(sess["expires_at"])
                if now < exp:
                    secs_left = int((exp - now).total_seconds())
                    return {
                        "active": True,
                        "token": token,
                        "subject_code": subject_code,
                        "seconds_remaining": secs_left,
                        "scanned_count": len(sess["scanned_students"])
                    }
        return {"active": False, "message": "No active QR session for this course"}

@router.post("/attendance/qr/mark")
def mark_qr_attendance(req: MarkQRScanRequest, current_user = Depends(get_current_user_from_token)):
    if current_user.get("role") != "Student":
        raise HTTPException(status_code=403, detail="Only students can mark attendance via QR token")

    student_id = current_user["id"]
    with db.lock:
        sess = db.qr_sessions.get(req.token.strip().upper())
        if not sess:
            raise HTTPException(status_code=400, detail="Invalid or expired QR code token")

        now = datetime.datetime.now(datetime.timezone.utc)
        exp = datetime.datetime.fromisoformat(sess["expires_at"])
        if now > exp:
            raise HTTPException(status_code=400, detail="QR code token has expired. Please scan the newly refreshed code.")

        if student_id in sess["scanned_students"]:
            return {"success": True, "message": "Attendance already registered for this session"}

        sess["scanned_students"].append(student_id)
        sub_code = sess["subject_code"]
        
        # Update attendance records
        key = f"{student_id}:{sub_code}"
        rec = db.attendance_records.get(key)
        if rec:
            rec["total_classes"] += 1
            rec["attended_classes"] += 1
            rec["percentage"] = round((rec["attended_classes"] / rec["total_classes"]) * 100.0, 1)
        else:
            db.attendance_records[key] = {
                "student_id": student_id,
                "subject_code": sub_code,
                "subject_name": db.subjects.get(sub_code, {}).get("name", sub_code),
                "total_classes": 1,
                "attended_classes": 1,
                "total_course_classes": 45,
                "percentage": 100.0
            }

        db.attendance_history.append({
            "student_id": student_id,
            "subject_code": sub_code,
            "timestamp": now.isoformat(),
            "status": "present"
        })

        return {
            "success": True,
            "message": f"Successfully registered attendance for {sess.get('subject_code')}",
            "scanned_at": now.isoformat()
        }

@router.post("/attendance/manual")
def mark_manual_attendance(req: ManualAttendanceRequest, current_user = Depends(get_current_user_from_token)):
    if current_user.get("role") not in ("Faculty", "Admin"):
        raise HTTPException(status_code=403, detail="Only faculty and admin can manually mark attendance")

    with db.lock:
        student = db.users.get(req.student_id)
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")

        key = f"{req.student_id}:{req.subject_code}"
        rec = db.attendance_records.get(key)
        now = datetime.datetime.now(datetime.timezone.utc)

        is_present = req.status in ("present", "late")

        if rec:
            rec["total_classes"] += 1
            if is_present:
                rec["attended_classes"] += 1
            rec["percentage"] = round((rec["attended_classes"] / rec["total_classes"]) * 100.0, 1)
        else:
            rec = {
                "student_id": req.student_id,
                "subject_code": req.subject_code,
                "subject_name": db.subjects.get(req.subject_code, {}).get("name", req.subject_code),
                "total_classes": 1,
                "attended_classes": 1 if is_present else 0,
                "total_course_classes": 45,
                "percentage": 100.0 if is_present else 0.0
            }
            db.attendance_records[key] = rec

        db.attendance_history.append({
            "student_id": req.student_id,
            "subject_code": req.subject_code,
            "timestamp": now.isoformat(),
            "status": req.status
        })

        db.log_audit("MANUAL_ATTENDANCE_MARKED", current_user["id"], req.student_id, f"Marked {req.status} for {req.subject_code}")

        return {"success": True, "updated_record": rec}

@router.get("/exam-seating/lookup")
def lookup_exam_seating(
    search: Optional[str] = Query(None),
    room_no: Optional[str] = Query(None),
    current_user = Depends(get_current_user_from_token)
):
    with db.lock:
        results = db.exam_seating
        if room_no:
            results = [s for s in results if s.get("room_no", "").lower() == room_no.lower()]
        if search:
            t = search.lower()
            results = [
                s for s in results
                if t in s.get("student_name", "").lower()
                or t in s.get("student_id", "").lower()
                or t in s.get("roll_no", "").lower()
                or t in s.get("subject", "").lower()
            ]
        return results
