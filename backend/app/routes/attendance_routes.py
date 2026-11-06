import datetime
import hashlib
import hmac
import math
import secrets
import time
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from app.config import settings
from app.routes.auth_routes import get_current_user_from_token, require_role
from app.store import db
from app.risk_engine import calculate_student_risk

router = APIRouter(prefix="/attendance", tags=["Attendance"])

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return distance between two GPS coordinates in meters using the Haversine formula."""
    R = 6371000.0  # Earth's radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def generate_qr_token(session_id: str, time_slot: int) -> str:
    """
    Generate an HMAC-SHA256 token for a session and time slot.
    Computed over: session_id + time_slot (floor(unix_time / 7)) using server secret.
    """
    message = f"{session_id}:{time_slot}".encode("utf-8")
    secret = settings.QR_SECRET.encode("utf-8")
    return hmac.new(secret, message, hashlib.sha256).hexdigest()

def get_current_qr_info(session_id: str) -> tuple[str, int, int]:
    """
    Returns (token, seconds_remaining, current_slot).
    Refreshes every QR_ROTATION_SECONDS (default 7 seconds).
    """
    now = time.time()
    rotation_sec = settings.QR_ROTATION_SECONDS
    current_slot = int(now // rotation_sec)
    token = generate_qr_token(session_id, current_slot)
    seconds_remaining = rotation_sec - (int(now) % rotation_sec)
    return token, seconds_remaining, current_slot

# Pydantic Schemas
class StartSessionRequest(BaseModel):
    subject_code: str
    section: Optional[str] = "A"
    branch: Optional[str] = None
    semester: Optional[int] = 4
    lat: float
    lng: float
    accuracy: Optional[float] = None
    duration_minutes: int = Field(default=45, ge=1, le=180)

class StudentScanRequest(BaseModel):
    session_id: str
    token: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    accuracy: Optional[float] = None
    device_id: Optional[str] = None

class OverrideAttendanceRequest(BaseModel):
    student_id: str
    status: str  # "present", "absent", "late"
    reason: Optional[str] = ""

class ManualAttendanceRequest(BaseModel):
    student_id: str
    subject_code: str
    status: str  # "present", "absent", "late"
    reason: Optional[str] = ""

@router.get("/config")
def get_attendance_config():
    """Returns geofence and QR rotation configuration parameters for client awareness."""
    return {
        "geofence_radius_meters": settings.GEOFENCE_RADIUS_METERS,
        "qr_rotation_seconds": settings.QR_ROTATION_SECONDS,
        "max_gps_accuracy_meters": settings.MAX_GPS_ACCURACY_METERS,
        "dev_skip_geofence": settings.DEV_SKIP_GEOFENCE,
        "frontend_url": settings.FRONTEND_URL
    }

@router.post("/config/dev-toggle")
def toggle_dev_geofence(current_user: dict = Depends(get_current_user_from_token)):
    """Toggle DEV_SKIP_GEOFENCE for development and testing on laptops."""
    settings.DEV_SKIP_GEOFENCE = not settings.DEV_SKIP_GEOFENCE
    return {
        "dev_skip_geofence": settings.DEV_SKIP_GEOFENCE,
        "message": f"Geo-fence dev bypass is now {'ENABLED' if settings.DEV_SKIP_GEOFENCE else 'DISABLED'}."
    }

@router.get("/sessions")
def list_attendance_sessions(current_user: dict = Depends(get_current_user_from_token)):
    """List attendance sessions based on user role."""
    role = current_user.get("role")
    with db.lock:
        sessions = list(db.attendance_sessions.values())
        if role == "Faculty":
            sessions = [s for s in sessions if s.get("faculty_id") == current_user["id"]]
        elif role == "Student":
            stu_id = current_user["id"]
            sessions = [s for s in sessions if stu_id in s.get("roster", {})]

        summary_list = []
        for s in sorted(sessions, key=lambda x: x.get("created_at", ""), reverse=True):
            roster = s.get("roster", {})
            present = sum(1 for r in roster.values() if r.get("status") in ("present", "late"))
            summary_list.append({
                "id": s["id"],
                "subject_code": s["subject_code"],
                "subject_name": s["subject_name"],
                "section": s.get("section", "A"),
                "status": s.get("status", "active"),
                "created_at": s.get("created_at"),
                "ends_at": s.get("ends_at"),
                "is_finalized": s.get("is_finalized", False),
                "total_enrolled": len(roster),
                "present_count": present,
                "lat": s.get("lat"),
                "lng": s.get("lng"),
                "radius_meters": s.get("radius_meters", settings.GEOFENCE_RADIUS_METERS)
            })
        return summary_list

@router.post("/sessions")
def start_attendance_session(req: StartSessionRequest, current_user: dict = Depends(require_role(["Faculty", "Admin"]))):
    """
    Teacher flow step 1 & 2:
    Teacher selects class/subject/section and clicks 'Start QR attendance'.
    Saves teacher's browser location as the session's anchor point (lat, lng),
    start time, and active status.
    """
    with db.lock:
        subject = db.subjects.get(req.subject_code.upper())
        subject_name = subject.get("name", req.subject_code.upper()) if subject else req.subject_code.upper()

        target_section = (req.section or "A").strip().upper()
        target_sub_code = req.subject_code.strip().upper()

        # Enrolled students for this section and subject
        enrolled_students = []
        for u in db.users.values():
            if u.get("role") != "Student" or not u.get("is_active", True):
                continue
            
            # Match section (or all if section is ALL)
            u_sec = (u.get("section") or "A").strip().upper()
            if target_section != "ALL" and u_sec != target_section:
                continue

            enrolled_students.append(u)

        if not enrolled_students:
            # Fallback to general students in case specific section has none
            enrolled_students = [u for u in db.users.values() if u.get("role") == "Student"][:20]

        now = datetime.datetime.now(datetime.timezone.utc)
        ends_at = now + datetime.timedelta(minutes=req.duration_minutes)
        session_id = f"SESS-{int(time.time())}-{secrets.token_hex(2).upper()}"

        roster = {}
        for s in enrolled_students:
            roster[s["id"]] = {
                "student_id": s["id"],
                "student_name": s["name"],
                "roll_no": s.get("roll_no", s["id"]),
                "section": s.get("section", target_section),
                "status": "unmarked",
                "marked_at": None,
                "distance_meters": None,
                "accuracy_meters": None,
                "mark_mode": None,
                "history": []
            }

        session_obj = {
            "id": session_id,
            "faculty_id": current_user["id"],
            "faculty_name": current_user.get("name", "Faculty"),
            "subject_code": target_sub_code,
            "subject_name": subject_name,
            "section": target_section,
            "semester": req.semester or 4,
            "status": "active",
            "created_at": now.isoformat(),
            "ends_at": ends_at.isoformat(),
            "duration_minutes": req.duration_minutes,
            "lat": req.lat,
            "lng": req.lng,
            "anchor_accuracy": req.accuracy,
            "radius_meters": settings.GEOFENCE_RADIUS_METERS,
            "is_finalized": False,
            "finalized_at": None,
            "roster": roster,
            "suspicious_attempts": [],
            "scanned_devices": {},
        }

        db.attendance_sessions[session_id] = session_obj
        db.log_audit(
            "START_ATTENDANCE_SESSION",
            current_user["id"],
            details=f"Started QR session {session_id} for {target_sub_code} Sec {target_section} at ({req.lat}, {req.lng})"
        )
        return session_obj

@router.get("/sessions/{session_id}")
def get_attendance_session(session_id: str, current_user: dict = Depends(get_current_user_from_token)):
    """Fetch session details, live stats, roster, and suspicious attempts."""
    with db.lock:
        session = db.attendance_sessions.get(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Attendance session not found")

        role = current_user.get("role")
        if role == "Faculty" and session["faculty_id"] != current_user["id"]:
            pass  # Allowed for department peer review or admin
        elif role == "Student" and current_user["id"] not in session["roster"]:
            raise HTTPException(status_code=403, detail="You are not enrolled in this session")

        roster_list = sorted(list(session["roster"].values()), key=lambda x: x.get("roll_no", ""))
        present_count = sum(1 for r in roster_list if r["status"] == "present")
        late_count = sum(1 for r in roster_list if r["status"] == "late")
        absent_count = sum(1 for r in roster_list if r["status"] == "absent")
        unmarked_count = sum(1 for r in roster_list if r["status"] == "unmarked")

        return {
            "session": {
                "id": session["id"],
                "faculty_id": session["faculty_id"],
                "faculty_name": session.get("faculty_name"),
                "subject_code": session["subject_code"],
                "subject_name": session["subject_name"],
                "section": session.get("section"),
                "status": session.get("status"),
                "created_at": session["created_at"],
                "ends_at": session["ends_at"],
                "duration_minutes": session["duration_minutes"],
                "lat": session["lat"],
                "lng": session["lng"],
                "radius_meters": session.get("radius_meters", settings.GEOFENCE_RADIUS_METERS),
                "is_finalized": session.get("is_finalized", False),
                "finalized_at": session.get("finalized_at"),
            },
            "stats": {
                "total_enrolled": len(roster_list),
                "present_count": present_count,
                "late_count": late_count,
                "absent_count": absent_count,
                "unmarked_count": unmarked_count,
            },
            "roster": roster_list,
            "suspicious_attempts": session.get("suspicious_attempts", [])[-30:],
            "dev_skip_geofence": settings.DEV_SKIP_GEOFENCE
        }

@router.get("/sessions/{session_id}/qr")
def get_session_qr_token(session_id: str, current_user: dict = Depends(require_role(["Faculty", "Admin"]))):
    """
    Teacher flow step 3:
    Returns the current rotating token (refreshes every 7 seconds),
    countdown seconds remaining, full QR scan URL, and live attendee stats.
    Only the teacher/admin can fetch this endpoint.
    """
    with db.lock:
        session = db.attendance_sessions.get(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Attendance session not found")

        if current_user.get("role") == "Faculty" and session["faculty_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="You may only retrieve QR tokens for your own sessions")

        token, seconds_remaining, current_slot = get_current_qr_info(session_id)
        qr_url = f"{settings.FRONTEND_URL}/student/scan?s={session_id}&t={token}"

        roster = session.get("roster", {})
        marked_students = [
            {
                "student_id": r["student_id"],
                "student_name": r["student_name"],
                "roll_no": r["roll_no"],
                "status": r["status"],
                "marked_at": r["marked_at"],
                "distance_meters": r.get("distance_meters"),
                "mark_mode": r.get("mark_mode", "qr")
            }
            for r in roster.values()
            if r.get("status") in ("present", "late") and r.get("marked_at")
        ]
        marked_students.sort(key=lambda x: x.get("marked_at") or "", reverse=True)

        scanned_count = len(marked_students)
        total_count = len(roster)

        return {
            "session_id": session_id,
            "subject_code": session["subject_code"],
            "subject_name": session["subject_name"],
            "section": session.get("section", "A"),
            "token": token,
            "qr_url": qr_url,
            "seconds_remaining": seconds_remaining,
            "rotation_seconds": settings.QR_ROTATION_SECONDS,
            "time_slot": current_slot,
            "status": session.get("status"),
            "scanned_count": scanned_count,
            "total_count": total_count,
            "recent_scanned": marked_students[:20],
            "suspicious_attempts": session.get("suspicious_attempts", [])[-15:],
            "dev_skip_geofence": settings.DEV_SKIP_GEOFENCE,
            "geofence_radius_meters": settings.GEOFENCE_RADIUS_METERS
        }

@router.post("/scan")
@router.post("/qr/mark")
def student_scan_qr(req: StudentScanRequest, request: Request, current_user: dict = Depends(require_role(["Student"]))):
    """
    Student flow step 3:
    Validates in strict order:
      a. Session exists and is active
      b. Token is valid for current or previous slot
      c. Student belongs to that class/section
      d. Student has not already been marked in this session
      e. Distance from teacher anchor point (Haversine) <= 150m
      f. GPS accuracy <= 100m
    Logs every failed attempt to session['suspicious_attempts'].
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    student_id = current_user["id"]
    student_name = current_user.get("name", "Student")
    now_dt = datetime.datetime.now(datetime.timezone.utc)
    now_iso = now_dt.isoformat()

    with db.lock:
        session = db.attendance_sessions.get(req.session_id)

        def log_failure(reason: str, dist_val: Optional[float] = None, acc_val: Optional[float] = None):
            if session:
                session.setdefault("suspicious_attempts", []).append({
                    "student_id": student_id,
                    "student_name": student_name,
                    "reason": reason,
                    "distance_meters": dist_val,
                    "accuracy_meters": acc_val,
                    "token": req.token[:12] if req.token else "None",
                    "ip": client_ip,
                    "device_id": req.device_id,
                    "timestamp": now_iso
                })

        # a. Session exists and is active
        if not session:
            raise HTTPException(status_code=404, detail="Session closed")

        if session.get("status") != "active":
            log_failure("Session closed")
            raise HTTPException(status_code=400, detail="Session closed")

        # b. Token is valid for current or previous slot
        now_ts = time.time()
        curr_slot = int(now_ts // settings.QR_ROTATION_SECONDS)
        valid_tokens = [
            generate_qr_token(req.session_id, curr_slot),
            generate_qr_token(req.session_id, curr_slot - 1)
        ]

        submitted_token = req.token.strip()
        if submitted_token not in valid_tokens:
            log_failure("QR expired")
            raise HTTPException(status_code=400, detail="QR expired")

        # c. The student belongs to that class/section
        if student_id not in session.get("roster", {}):
            log_failure("Not enrolled in this class")
            raise HTTPException(status_code=403, detail="Not enrolled in this class")

        roster_entry = session["roster"][student_id]

        # d. The student has not already been marked in this session
        if roster_entry.get("status") in ("present", "late"):
            log_failure("Already marked")
            raise HTTPException(status_code=400, detail="Already marked")

        # e. Distance from teacher's anchor point (Haversine formula <= 150m)
        if req.lat is None or req.lng is None:
            log_failure("Location permission denied")
            raise HTTPException(status_code=400, detail="Location permission denied")

        dist_m = haversine_distance(session["lat"], session["lng"], req.lat, req.lng)

        if not settings.DEV_SKIP_GEOFENCE:
            if dist_m > settings.GEOFENCE_RADIUS_METERS:
                distance_int = int(round(dist_m))
                reason_msg = f"Outside classroom range ({distance_int} m away)"
                log_failure(reason_msg, dist_val=round(dist_m, 1), acc_val=req.accuracy)
                raise HTTPException(status_code=400, detail=reason_msg)

        # f. Reject if reported GPS accuracy is worse than 100 m
        if not settings.DEV_SKIP_GEOFENCE:
            if req.accuracy is not None and req.accuracy > settings.MAX_GPS_ACCURACY_METERS:
                reason_msg = "Location not accurate enough, move near a window and retry"
                log_failure(reason_msg, dist_val=round(dist_m, 1), acc_val=req.accuracy)
                raise HTTPException(status_code=400, detail=reason_msg)

        # Device conflict check (detect suspicious sharing of device across students)
        if req.device_id:
            dev_id = req.device_id.strip()
            prior_user = session.get("scanned_devices", {}).get(dev_id)
            if prior_user and prior_user != student_id:
                session.setdefault("suspicious_attempts", []).append({
                    "student_id": student_id,
                    "student_name": student_name,
                    "reason": f"Same device used by multiple students ({student_id} and {prior_user})",
                    "distance_meters": round(dist_m, 1),
                    "accuracy_meters": req.accuracy,
                    "token": submitted_token[:12],
                    "ip": client_ip,
                    "device_id": dev_id,
                    "timestamp": now_iso
                })
            session.setdefault("scanned_devices", {})[dev_id] = student_id

        # Mark student Present on success
        roster_entry["status"] = "present"
        roster_entry["marked_at"] = now_iso
        roster_entry["distance_meters"] = round(dist_m, 1) if (req.lat is not None and req.lng is not None) else 0.0
        roster_entry["accuracy_meters"] = round(req.accuracy, 1) if req.accuracy is not None else None
        roster_entry["mark_mode"] = "qr"

        db.log_audit(
            "QR_ATTENDANCE_MARKED",
            student_id,
            details=f"Marked present for {session['subject_code']} via QR. Distance: {roster_entry['distance_meters']}m"
        )

        return {
            "success": True,
            "status": "present",
            "subject_code": session["subject_code"],
            "subject_name": session["subject_name"],
            "distance_meters": roster_entry["distance_meters"],
            "marked_at": now_iso,
            "message": f"Attendance marked for {session['subject_name']}"
        }

@router.post("/sessions/{session_id}/end")
@router.post("/sessions/{session_id}/close")
def end_attendance_session(session_id: str, current_user: dict = Depends(require_role(["Faculty", "Admin"]))):
    """
    Teacher flow step 4:
    Closes the session. After this, all scans are rejected with 'Session closed',
    and students not scanned are shown as Absent.
    Teacher can still manually change any student to Present/Absent before final save.
    """
    with db.lock:
        session = db.attendance_sessions.get(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Attendance session not found")

        if current_user.get("role") == "Faculty" and session["faculty_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="You may only close your own sessions")

        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        session["status"] = "closed"

        # Mark all unmarked students as absent
        for s in session["roster"].values():
            if s.get("status") == "unmarked":
                s["status"] = "absent"
                s["marked_at"] = now_iso
                s["mark_mode"] = "system_closed"

        roster_list = list(session["roster"].values())
        present_count = sum(1 for r in roster_list if r["status"] == "present")
        absent_count = sum(1 for r in roster_list if r["status"] == "absent")

        db.log_audit("END_ATTENDANCE_SESSION", current_user["id"], details=f"Closed session {session_id}. Present: {present_count}, Absent: {absent_count}")
        return {
            "success": True,
            "session_id": session_id,
            "status": "closed",
            "stats": {
                "total_enrolled": len(roster_list),
                "present_count": present_count,
                "absent_count": absent_count
            },
            "roster": roster_list
        }

@router.post("/sessions/{session_id}/override")
def override_student_session_attendance(session_id: str, req: OverrideAttendanceRequest, current_user: dict = Depends(require_role(["Faculty", "Admin"]))):
    """Manual roll-call override for a student within a session (before or after ending)."""
    with db.lock:
        session = db.attendance_sessions.get(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Attendance session not found")

        if current_user.get("role") == "Faculty" and session["faculty_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="You may only manage attendance for your own sessions")

        roster = session.get("roster", {})
        if req.student_id not in roster:
            raise HTTPException(status_code=404, detail="Student not found in session roster")

        entry = roster[req.student_id]
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

        entry.setdefault("history", []).append({
            "from_status": entry["status"],
            "to_status": req.status,
            "by": current_user["id"],
            "reason": req.reason,
            "timestamp": now_iso
        })

        entry["status"] = req.status
        entry["mark_mode"] = "manual"
        entry["override_reason"] = req.reason
        entry["override_by"] = current_user["id"]
        entry["marked_at"] = now_iso

        db.log_audit(
            "ATTENDANCE_OVERRIDE",
            current_user["id"],
            student_id=req.student_id,
            details=f"Overrode {entry['student_name']} in session {session_id} to '{req.status}'"
        )
        return {
            "success": True,
            "student_id": req.student_id,
            "status": entry["status"],
            "history_count": len(entry["history"])
        }

@router.post("/manual")
def mark_attendance_manual(req: ManualAttendanceRequest, current_user: dict = Depends(require_role(["Faculty", "Admin"]))):
    """Direct manual marking for a student and subject."""
    with db.lock:
        key = f"{req.student_id}:{req.subject_code.upper()}"
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        rec = db.attendance_records.get(key)
        is_present = req.status in ("present", "late")

        if rec:
            rec["total_classes"] += 1
            if is_present:
                rec["attended_classes"] += 1
            rec["percentage"] = round((rec["attended_classes"] / rec["total_classes"]) * 100.0, 1)
            rec["classes_needed_for_75"] = max(0, math.ceil(3 * rec["total_classes"] - 4 * rec["attended_classes"]))
        else:
            rec = {
                "student_id": req.student_id,
                "subject_code": req.subject_code.upper(),
                "subject_name": req.subject_code.upper(),
                "total_classes": 1,
                "attended_classes": 1 if is_present else 0,
                "percentage": 100.0 if is_present else 0.0,
                "classes_needed_for_75": 0 if is_present else 3
            }
            db.attendance_records[key] = rec

        db.attendance_history.append({
            "student_id": req.student_id,
            "subject_code": req.subject_code.upper(),
            "timestamp": now_iso,
            "status": req.status
        })

        db.risk_cache.pop(req.student_id, None)
        calculate_student_risk(req.student_id, db)

        db.log_audit(
            "MANUAL_ATTENDANCE_MARKED",
            current_user["id"],
            student_id=req.student_id,
            details=f"Marked {req.status} for {req.subject_code}"
        )
        return {"success": True, "record": rec}

@router.post("/sessions/{session_id}/finalize")
@router.post("/sessions/{session_id}/save")
def finalize_attendance_session(session_id: str, current_user: dict = Depends(require_role(["Faculty", "Admin"]))):
    """
    Finalize/Save attendance session:
    - Commits final present/absent status of all students to course records
    - Recalculates course attendance percentage and classes needed for 75%
    - Updates student risk engine score and bands
    - Prevents double finalization
    """
    with db.lock:
        session = db.attendance_sessions.get(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Attendance session not found")

        if current_user.get("role") == "Faculty" and session["faculty_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="You may only finalize your own sessions")

        if session.get("is_finalized"):
            raise HTTPException(status_code=400, detail="This session has already been saved and finalized.")

        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        session["status"] = "finalized"
        session["is_finalized"] = True
        session["finalized_at"] = now_iso

        sub_code = session["subject_code"]
        sub_name = session["subject_name"]
        updated_students = []

        for student_id, r in session["roster"].items():
            status_val = r.get("status")
            if status_val == "unmarked":
                status_val = "absent"
                r["status"] = "absent"

            is_present = status_val in ("present", "late")
            key = f"{student_id}:{sub_code}"
            rec = db.attendance_records.get(key)
            if rec:
                rec["total_classes"] += 1
                if is_present:
                    rec["attended_classes"] += 1
                rec["percentage"] = round((rec["attended_classes"] / rec["total_classes"]) * 100.0, 1)
                rec["classes_needed_for_75"] = max(0, math.ceil(3 * rec["total_classes"] - 4 * rec["attended_classes"]))
            else:
                rec = {
                    "student_id": student_id,
                    "subject_code": sub_code,
                    "subject_name": sub_name,
                    "total_classes": 1,
                    "attended_classes": 1 if is_present else 0,
                    "percentage": 100.0 if is_present else 0.0,
                    "classes_needed_for_75": 0 if is_present else 3
                }
                db.attendance_records[key] = rec

            db.attendance_history.append({
                "student_id": student_id,
                "subject_code": sub_code,
                "session_id": session_id,
                "timestamp": now_iso,
                "status": "present" if is_present else "absent",
                "distance_meters": r.get("distance_meters"),
                "mark_mode": r.get("mark_mode", "qr")
            })

            # Invalidate risk cache & recalculate
            db.risk_cache.pop(student_id, None)
            calculate_student_risk(student_id, db)
            updated_students.append(student_id)

        db.log_audit("FINALIZE_ATTENDANCE_SESSION", current_user["id"], details=f"Finalized session {session_id} for {sub_code}. Updated {len(updated_students)} students.")
        return {
            "success": True,
            "session_id": session_id,
            "is_finalized": True,
            "finalized_at": now_iso,
            "updated_student_count": len(updated_students)
        }
