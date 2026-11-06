import datetime
import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from app.routes.auth_routes import require_role
from app.store import db
from app.risk_engine import calculate_student_risk

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/student", tags=["Student"], dependencies=[Depends(require_role(["Student"]))])

def normalize_feedback_entry(f: dict) -> dict:
    f_copy = dict(f)
    txt = f_copy.get("feedback") or f_copy.get("feedback_text") or ""
    f_copy["feedback"] = txt
    f_copy["feedback_text"] = txt
    if not f_copy.get("mentor_name"):
        m_id = f_copy.get("mentor_id")
        m_user = db.users.get(m_id) if m_id else None
        f_copy["mentor_name"] = m_user.get("name", "Faculty Mentor") if m_user else "Faculty Mentor"
    return f_copy

class SendStudentMessageRequest(BaseModel):
    text: str

@router.get("/dashboard")
def get_student_dashboard(current_user = Depends(require_role(["Student"]))):
    student_id = current_user["id"]
    with db.lock:
        user = db.users.get(student_id)
        risk = calculate_student_risk(student_id, db)

        # Subject-wise attendance calculation
        student_att = []
        total_held = 0
        total_attended = 0
        for key, rec in db.attendance_records.items():
            if key.startswith(f"{student_id}:"):
                h = rec.get("total_classes", 0)
                a = rec.get("attended_classes", 0)
                total_held += h
                total_attended += a
                pct = round((a / h * 100.0) if h > 0 else 0.0, 1)
                student_att.append({
                    "subject_code": rec.get("subject_code"),
                    "subject_name": rec.get("subject_name"),
                    "percentage": pct
                })

        overall_pct = round((total_attended / total_held * 100.0) if total_held > 0 else 85.0, 1)

        # Next upcoming exam seating
        now_str = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d")
        exams = [
            e for e in db.exam_seating
            if e.get("student_id") == student_id and e.get("exam_date", "") >= now_str
        ]
        exams.sort(key=lambda x: x.get("exam_date", ""))
        next_exam = exams[0] if exams else None

        # Mentor info
        mentor = None
        if user.get("mentor_id") and user["mentor_id"] in db.users:
            m = db.users[user["mentor_id"]]
            mentor = {
                "id": m["id"],
                "name": m["name"],
                "email": m["email"],
                "department": m.get("department", "Engineering")
            }

        return {
            "student": {
                "id": user["id"],
                "name": user["name"],
                "roll_no": user.get("roll_no", user["id"]),
                "email": user.get("email"),
                "student_phone": user.get("student_phone", ""),
                "parent_phone": user.get("parent_phone", ""),
                "branch": user.get("branch", "CSE"),
                "section": user.get("section", "A"),
                "semester": user.get("semester", 4),
            },
            "mentor": mentor,
            "risk": {
                "effective_band": risk.get("effective_band", "Green"),
                "weighted_score": risk.get("weighted_score", 20.0),
                "plain_language_explanation": risk.get("plain_language_explanation", "Good standing"),
                "flag": risk.get("flag", {}),
                "top_factors": risk.get("top_factors", []),
                "history_8_weeks": risk.get("history_8_weeks", [])
            },
            "attendance": {
                "overall_percentage": overall_pct,
                "total_held": total_held,
                "total_attended": total_attended,
                "subjects": student_att
            },
            "next_exam": next_exam,
            "recent_notices": db.notices[:3]
        }

@router.get("/attendance")
def get_student_attendance(current_user = Depends(require_role(["Student"]))):
    student_id = current_user["id"]
    with db.lock:
        subject_list = []
        for key, rec in db.attendance_records.items():
            if key.startswith(f"{student_id}:"):
                held = rec.get("total_classes", 0)
                attended = rec.get("attended_classes", 0)
                total_course = rec.get("total_course_classes", 45)
                remaining = max(0, total_course - held)
                pct = round((attended / held * 100.0) if held > 0 else 0.0, 1)

                if pct < 75.0:
                    needed = max(0, int(round((0.75 * held - attended) / 0.25)))
                else:
                    needed = 0

                subject_list.append({
                    "subject_code": rec.get("subject_code"),
                    "subject_name": rec.get("subject_name"),
                    "held": held,
                    "attended": attended,
                    "remaining": remaining,
                    "total_course": total_course,
                    "percentage": pct,
                    "classes_needed_for_75": needed,
                    "status": "Safe" if pct >= 75.0 else ("Critical" if pct < 65.0 else "Warning")
                })

        return subject_list

@router.get("/what-if-attendance")
def calculate_what_if_attendance(
    subject_code: Optional[str] = Query(None),
    additional_classes: int = Query(5),
    classes_attended: int = Query(5),
    current_user = Depends(require_role(["Student"]))
):
    student_id = current_user["id"]
    with db.lock:
        if subject_code:
            key = f"{student_id}:{subject_code}"
            rec = db.attendance_records.get(key)
            if not rec:
                raise HTTPException(status_code=404, detail="Subject not found")
            h = rec.get("total_classes", 0)
            a = rec.get("attended_classes", 0)
            new_h = h + additional_classes
            new_a = a + min(additional_classes, classes_attended)
            projected_pct = round((new_a / new_h * 100.0) if new_h > 0 else 0.0, 1)
            current_pct = round((a / h * 100.0) if h > 0 else 0.0, 1)
            return {
                "subject_code": subject_code,
                "current_percentage": current_pct,
                "projected_percentage": projected_pct,
                "delta": round(projected_pct - current_pct, 1),
                "is_safe": projected_pct >= 75.0
            }
        else:
            # Overall
            student_att = [rec for key, rec in db.attendance_records.items() if key.startswith(f"{student_id}:")]
            h = sum(r.get("total_classes", 0) for r in student_att)
            a = sum(r.get("attended_classes", 0) for r in student_att)
            new_h = h + additional_classes
            new_a = a + min(additional_classes, classes_attended)
            projected_pct = round((new_a / new_h * 100.0) if new_h > 0 else 0.0, 1)
            current_pct = round((a / h * 100.0) if h > 0 else 0.0, 1)
            return {
                "overall": True,
                "current_percentage": current_pct,
                "projected_percentage": projected_pct,
                "delta": round(projected_pct - current_pct, 1),
                "is_safe": projected_pct >= 75.0
            }

@router.get("/results-feedback")
def get_student_results_and_feedback(
    semester: Optional[int] = Query(None),
    current_user = Depends(require_role(["Student"]))
):
    student_id = current_user["id"]
    with db.lock:
        user = db.users.get(student_id)
        current_sem = user.get("semester", 4)
        sems_data = db.semester_summaries.get(student_id, [])
        available_sems = [s.get("semester") for s in sems_data] if sems_data else list(range(1, current_sem + 1))
        if not available_sems:
            available_sems = [current_sem]

        target_sem = semester if semester is not None else current_sem

        all_exams = [e for e in db.exam_results if e.get("student_id") == student_id]
        semester_exams = [e for e in all_exams if e.get("semester") == target_sem]
        if not semester_exams and target_sem == current_sem:
            semester_exams = all_exams

        normalized_exams = []
        for e in semester_exams:
            item = dict(e)
            sc = item.get("score") if item.get("score") is not None else item.get("marks_obtained")
            dt = item.get("date") or item.get("exam_date")
            sub_nm = item.get("subject_name") or item.get("subject")
            item["score"] = sc
            item["marks_obtained"] = sc
            item["date"] = dt
            item["exam_date"] = dt
            item["subject_name"] = sub_nm
            item["subject"] = sub_nm
            normalized_exams.append(item)

        sem_summary = next((s for s in sems_data if s.get("semester") == target_sem), None)
        if not sem_summary and sems_data:
            sem_summary = sems_data[-1]

        raw_feedbacks = [f for f in db.academic_feedback if f.get("student_id") == student_id]
        all_feedbacks = [normalize_feedback_entry(f) for f in raw_feedbacks]
        semester_feedbacks = [
            f for f in all_feedbacks
            if f.get("semester") == target_sem or f.get("semester") is None
        ]
        timeline = [t for t in db.improvement_timeline if t.get("student_id") == student_id]

        logger.info(f"Student {student_id} fetched results & feedback: {len(semester_feedbacks)} items for sem {target_sem}")

        return {
            "current_semester": current_sem,
            "selected_semester": target_sem,
            "available_semesters": available_sems,
            "exams": normalized_exams,
            "semester_summary": sem_summary,
            "all_semester_summaries": sems_data,
            "feedbacks": semester_feedbacks,
            "all_feedbacks": all_feedbacks,
            "timeline": timeline
        }

@router.get("/assignments")
def get_student_assignments(current_user = Depends(require_role(["Student"]))):
    student_id = current_user["id"]
    with db.lock:
        submissions = [s for s in db.assignment_submissions if s.get("student_id") == student_id]
        return {
            "submissions": submissions,
            "catalog": list(db.assignments.values())
        }

@router.get("/mentor")
def get_my_mentor_info(current_user = Depends(require_role(["Student"]))):
    student_id = current_user["id"]
    with db.lock:
        user = db.users.get(student_id)
        if not user:
            raise HTTPException(status_code=404, detail="Student user not found.")

        mentor_id = user.get("mentor_id")
        if not mentor_id or mentor_id not in db.users:
            logger.info(f"Student {student_id} has no assigned mentor.")
            return {"mentor": None, "interventions": [], "chat": [], "feedbacks": []}

        mentor = db.users[mentor_id]
        interventions = [i for i in db.interventions if i.get("student_id") == student_id]
        raw_feedbacks = [f for f in db.academic_feedback if f.get("student_id") == student_id]
        feedbacks = [normalize_feedback_entry(f) for f in raw_feedbacks]
        chat = [
            m for m in db.chat_messages
            if (m.get("sender_id") == student_id and m.get("receiver_id") == mentor_id) or
               (m.get("sender_id") == mentor_id and m.get("receiver_id") == student_id)
        ]
        # Mark student unread messages as read
        for m in chat:
            if m.get("receiver_id") == student_id:
                m["is_read"] = True

        logger.info(f"Student {student_id} fetched mentor profile & {len(feedbacks)} feedback notes.")

        return {
            "mentor": {
                "id": mentor["id"],
                "name": mentor["name"],
                "email": mentor["email"],
                "department": mentor.get("department", "CSE")
            },
            "interventions": interventions,
            "feedbacks": feedbacks,
            "chat": chat
        }

@router.post("/mentor/chat")
def send_message_to_mentor(req: SendStudentMessageRequest, current_user = Depends(require_role(["Student"]))):
    student_id = current_user["id"]
    with db.lock:
        user = db.users.get(student_id)
        mentor_id = user.get("mentor_id")
        if not mentor_id:
            raise HTTPException(status_code=400, detail="No assigned mentor to message")

        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        msg = {
            "id": f"MSG-{student_id}-{len(db.chat_messages) + 1:03d}",
            "sender_id": student_id,
            "receiver_id": mentor_id,
            "text": req.text.strip(),
            "timestamp": now,
            "is_read": False
        }
        db.chat_messages.append(msg)
        return {"success": True, "message": msg}

@router.get("/exam-seating")
def get_student_exam_seating(current_user = Depends(require_role(["Student"]))):
    student_id = current_user["id"]
    with db.lock:
        user = db.users[student_id]
        seating = [s for s in db.exam_seating if s.get("student_id") == student_id]
        return {
            "student": {
                "id": user["id"],
                "name": user["name"],
                "roll_no": user.get("roll_no", user["id"]),
                "branch": user.get("branch", "CSE"),
                "semester": user.get("semester", 4)
            },
            "seating_records": seating
        }
