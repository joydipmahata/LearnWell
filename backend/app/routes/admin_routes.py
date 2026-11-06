import datetime
import random
import csv
import io
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from pydantic import BaseModel
from typing import Optional, List
from app.auth import hash_pin
from app.routes.auth_routes import require_role
from app.store import db
from app.risk_engine import calculate_student_risk

router = APIRouter(prefix="/admin", tags=["Admin"], dependencies=[Depends(require_role(["Admin"]))])

def generate_pin() -> str:
    """Generate 6-digit random PIN."""
    return f"{random.randint(100000, 999999)}"

def next_user_id(prefix: str) -> str:
    """Generates unique ID e.g. LW-STU-0031, LW-FAC-0004."""
    existing_ids = [uid for uid in db.users.keys() if uid.startswith(prefix)]
    max_num = 0
    for uid in existing_ids:
        try:
            num = int(uid.split("-")[-1])
            if num > max_num:
                max_num = num
        except ValueError:
            continue
    return f"{prefix}-{max_num + 1:04d}"

class CreateStudentRequest(BaseModel):
    name: str
    email: str
    branch: str = "CSE"
    section: str = "A"
    semester: int = 4
    mentor_id: Optional[str] = None
    student_phone: Optional[str] = None
    parent_phone: Optional[str] = None

class CreateFacultyRequest(BaseModel):
    name: str
    email: str
    department: str = "Computer Science & Engineering"

class AssignMentorRequest(BaseModel):
    student_id: str
    mentor_id: str

class UnassignMentorRequest(BaseModel):
    student_id: str

class CreateNoticeRequest(BaseModel):
    title: str
    content: str
    category: str = "General"
    pinned: bool = False

@router.get("/stats")
def get_admin_stats():
    with db.lock:
        students = [u for u in db.users.values() if u.get("role") == "Student"]
        faculty = [u for u in db.users.values() if u.get("role") == "Faculty"]
        active_students = [s for s in students if s.get("is_active", True)]
        unassigned_students = [s for s in active_students if not s.get("mentor_id")]

        # Count bands
        bands_count = {"Green": 0, "Amber": 0, "Red": 0}
        for s in active_students:
            risk = calculate_student_risk(s["id"], db)
            b = risk.get("effective_band", "Green")
            if b in bands_count:
                bands_count[b] += 1

        recent_audits = sorted(db.audit_logs, key=lambda x: x["timestamp"], reverse=True)[:8]

        return {
            "total_students": len(active_students),
            "total_faculty": len(faculty),
            "unassigned_students": len(unassigned_students),
            "bands_count": bands_count,
            "recent_audits": recent_audits,
            "total_notices": len(db.notices),
            "total_exam_seats": len(db.exam_seating)
        }

@router.get("/users")
def list_users(role: Optional[str] = None, search: Optional[str] = None, active_only: bool = False):
    with db.lock:
        results = []
        for u in db.users.values():
            if role and u.get("role").lower() != role.lower():
                continue
            if active_only and not u.get("is_active", True):
                continue
            if search:
                term = search.lower()
                name_match = term in u.get("name", "").lower()
                id_match = term in u.get("id", "").lower()
                email_match = term in u.get("email", "").lower()
                if not (name_match or id_match or email_match):
                    continue

            user_item = {
                "id": u["id"],
                "name": u["name"],
                "email": u["email"],
                "role": u["role"],
                "is_active": u.get("is_active", True),
                "created_at": u.get("created_at"),
                "branch": u.get("branch"),
                "section": u.get("section"),
                "semester": u.get("semester"),
                "student_phone": u.get("student_phone"),
                "parent_phone": u.get("parent_phone"),
                "department": u.get("department"),
                "mentor_id": u.get("mentor_id")
            }
            if u.get("mentor_id") and u.get("mentor_id") in db.users:
                user_item["mentor_name"] = db.users[u["mentor_id"]].get("name")
            results.append(user_item)
        return results

@router.post("/students")
def create_student(req: CreateStudentRequest, current_user = Depends(require_role(["Admin"]))):
    with db.lock:
        stu_id = next_user_id("LW-STU")
        pin = generate_pin()
        now = datetime.datetime.now(datetime.timezone.utc)
        
        user_record = {
            "id": stu_id,
            "name": req.name.strip(),
            "email": req.email.strip().lower(),
            "role": "Student",
            "branch": req.branch,
            "section": req.section,
            "semester": req.semester,
            "mentor_id": req.mentor_id,
            "student_phone": req.student_phone.strip() if req.student_phone else None,
            "parent_phone": req.parent_phone.strip() if req.parent_phone else None,
            "pin_hash": hash_pin(pin),
            "plain_pin": pin,
            "is_active": True,
            "created_at": now.isoformat(),
            "flag_info": {
                "start_date": now.isoformat(),
                "expiry_date": (now + datetime.timedelta(days=14)).isoformat(),
                "status": "active"
            }
        }
        db.users[stu_id] = user_record
        db.log_audit("STUDENT_CREATED", current_user["id"], stu_id, f"Created student {req.name} ({stu_id})")
        
        return {
            "success": True,
            "message": "Student created successfully. The PIN is shown only once; please record it safely.",
            "user": {
                "id": stu_id,
                "name": user_record["name"],
                "email": user_record["email"],
                "role": "Student",
                "branch": user_record["branch"],
                "section": user_record["section"],
                "semester": user_record["semester"],
                "mentor_id": user_record["mentor_id"]
            },
            "plain_pin": pin # SHOWN ONCE AT CREATION
        }

@router.post("/faculty")
def create_faculty(req: CreateFacultyRequest, current_user = Depends(require_role(["Admin"]))):
    with db.lock:
        fac_id = next_user_id("LW-FAC")
        pin = generate_pin()
        now = datetime.datetime.now(datetime.timezone.utc)
        
        user_record = {
            "id": fac_id,
            "name": req.name.strip(),
            "email": req.email.strip().lower(),
            "role": "Faculty",
            "department": req.department,
            "pin_hash": hash_pin(pin),
            "plain_pin": pin,
            "is_active": True,
            "created_at": now.isoformat()
        }
        db.users[fac_id] = user_record
        db.log_audit("FACULTY_CREATED", current_user["id"], fac_id, f"Created faculty mentor {req.name} ({fac_id})")
        
        return {
            "success": True,
            "message": "Faculty member created successfully. The PIN is shown only once; please record it safely.",
            "user": {
                "id": fac_id,
                "name": user_record["name"],
                "email": user_record["email"],
                "role": "Faculty",
                "department": user_record["department"]
            },
            "plain_pin": pin # SHOWN ONCE AT CREATION
        }

@router.delete("/users/{user_id}")
def soft_delete_user(user_id: str, current_user = Depends(require_role(["Admin"]))):
    with db.lock:
        if user_id not in db.users:
            raise HTTPException(status_code=404, detail="User not found")
        db.users[user_id]["is_active"] = False
        db.log_audit("USER_DEACTIVATED", current_user["id"], user_id, f"Soft-deleted user {user_id}")
        return {"success": True, "message": f"User {user_id} soft deleted"}

@router.patch("/users/{user_id}/restore")
def restore_user(user_id: str, current_user = Depends(require_role(["Admin"]))):
    with db.lock:
        if user_id not in db.users:
            raise HTTPException(status_code=404, detail="User not found")
        db.users[user_id]["is_active"] = True
        db.log_audit("USER_RESTORED", current_user["id"], user_id, f"Restored user {user_id}")
        return {"success": True, "message": f"User {user_id} restored"}

@router.post("/users/{user_id}/reset-pin")
def reset_user_pin(user_id: str, current_user = Depends(require_role(["Admin"]))):
    with db.lock:
        if user_id not in db.users:
            raise HTTPException(status_code=404, detail="User not found")
        new_pin = generate_pin()
        db.users[user_id]["pin_hash"] = hash_pin(new_pin)
        db.users[user_id]["plain_pin"] = new_pin
        db.log_audit("PIN_RESET", current_user["id"], user_id, f"Reset PIN for user {user_id}")
        return {
            "success": True,
            "message": "PIN reset successfully. The new PIN is displayed ONCE.",
            "user_id": user_id,
            "new_pin": new_pin
        }

@router.get("/mentors-overview")
def get_mentors_overview():
    with db.lock:
        mentors = [u for u in db.users.values() if u.get("role") == "Faculty" and u.get("is_active", True)]
        students = [u for u in db.users.values() if u.get("role") == "Student" and u.get("is_active", True)]

        unassigned_list = [
            {
                "id": s["id"],
                "name": s["name"],
                "roll_no": s.get("roll_no", s["id"]),
                "branch": s.get("branch", "CSE"),
                "section": s.get("section", "A"),
                "semester": s.get("semester", 4)
            }
            for s in students if not s.get("mentor_id")
        ]

        mentor_list = []
        for m in mentors:
            mentees = [
                {
                    "id": s["id"],
                    "name": s["name"],
                    "roll_no": s.get("roll_no", s["id"]),
                    "branch": s.get("branch", "CSE"),
                    "section": s.get("section", "A"),
                    "semester": s.get("semester", 4)
                }
                for s in students if s.get("mentor_id") == m["id"]
            ]
            mentor_list.append({
                "id": m["id"],
                "name": m["name"],
                "email": m["email"],
                "department": m.get("department", "CSE"),
                "mentee_count": len(mentees),
                "mentees": mentees
            })

        return {
            "mentors": mentor_list,
            "unassigned_students": unassigned_list
        }

@router.post("/assign-mentor")
def assign_mentor(req: AssignMentorRequest, current_user = Depends(require_role(["Admin"]))):
    with db.lock:
        student = db.users.get(req.student_id)
        if not student or student.get("role") != "Student":
            raise HTTPException(status_code=404, detail="Student not found")
        mentor = db.users.get(req.mentor_id)
        if not mentor or mentor.get("role") != "Faculty":
            raise HTTPException(status_code=404, detail="Mentor not found")

        old_mentor = student.get("mentor_id")
        student["mentor_id"] = req.mentor_id
        db.log_audit("MENTOR_ASSIGNED", current_user["id"], req.student_id, f"Assigned mentor {mentor['name']} ({req.mentor_id}) to {student['name']}. Old: {old_mentor}")
        return {"success": True, "message": f"Assigned {student['name']} to mentor {mentor['name']}"}

@router.post("/unassign-mentor")
def unassign_mentor(req: UnassignMentorRequest, current_user = Depends(require_role(["Admin"]))):
    with db.lock:
        student = db.users.get(req.student_id)
        if not student or student.get("role") != "Student":
            raise HTTPException(status_code=404, detail="Student not found")
        old_mentor = student.get("mentor_id")
        student["mentor_id"] = None
        db.log_audit("MENTOR_UNASSIGNED", current_user["id"], req.student_id, f"Unassigned mentor {old_mentor} from {student['name']}")
        return {"success": True, "message": f"Student {student['name']} is now unassigned"}

@router.post("/notices")
def create_notice(req: CreateNoticeRequest, current_user = Depends(require_role(["Admin"]))):
    with db.lock:
        notice_id = f"NOT-{len(db.notices) + 1:03d}"
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        notice = {
            "id": notice_id,
            "title": req.title.strip(),
            "content": req.content.strip(),
            "category": req.category,
            "author_id": current_user["id"],
            "author_name": current_user["name"],
            "created_at": now,
            "pinned": req.pinned
        }
        db.notices.insert(0, notice)
        db.log_audit("NOTICE_POSTED", current_user["id"], None, f"Posted notice: {req.title}")
        return {"success": True, "notice": notice}

@router.delete("/notices/{notice_id}")
def delete_notice(notice_id: str, current_user = Depends(require_role(["Admin"]))):
    with db.lock:
        idx = next((i for i, n in enumerate(db.notices) if n["id"] == notice_id), None)
        if idx is None:
            raise HTTPException(status_code=404, detail="Notice not found")
        removed = db.notices.pop(idx)
        db.log_audit("NOTICE_DELETED", current_user["id"], None, f"Deleted notice: {removed.get('title')}")
        return {"success": True, "message": f"Notice {notice_id} deleted"}

@router.get("/exam-seating")
def get_admin_exam_seating():
    with db.lock:
        return db.exam_seating

@router.post("/exam-seating/upload")
async def upload_exam_seating(file: UploadFile = File(...), current_user = Depends(require_role(["Admin"]))):
    contents = await file.read()
    try:
        decoded = contents.decode("utf-8-sig")
        reader = csv.DictReader(io.StringIO(decoded))
        records_added = 0
        with db.lock:
            for row in reader:
                # expected columns: student_id, student_name, roll_no, exam_name, subject, exam_date, exam_time, room_no, seat_no, block
                record = {
                    "student_id": row.get("student_id", "").strip(),
                    "student_name": row.get("student_name", "").strip(),
                    "roll_no": row.get("roll_no", "").strip(),
                    "exam_name": row.get("exam_name", "Semester Examination").strip(),
                    "subject": row.get("subject", "").strip(),
                    "exam_date": row.get("exam_date", "").strip(),
                    "exam_time": row.get("exam_time", "").strip(),
                    "room_no": row.get("room_no", "").strip(),
                    "seat_no": row.get("seat_no", "").strip(),
                    "block": row.get("block", "Academic Block").strip(),
                }
                if record["student_id"] and record["room_no"]:
                    db.exam_seating.append(record)
                    records_added += 1

            db.log_audit("EXAM_SEATING_UPLOADED", current_user["id"], None, f"Uploaded {records_added} exam seating entries via CSV")
        return {"success": True, "records_added": records_added, "total_records": len(db.exam_seating)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {str(e)}")

@router.get("/courses")
def get_courses():
    with db.lock:
        return list(db.subjects.values())
