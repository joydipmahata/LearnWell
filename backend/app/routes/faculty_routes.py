import datetime
import logging
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from typing import Optional, List
from app.routes.auth_routes import require_role
from app.store import db
from app.risk_engine import calculate_student_risk
from app.notifications import create_notification

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/faculty", tags=["Faculty / Mentor"], dependencies=[Depends(require_role(["Faculty"]))])

class CreateInterventionRequest(BaseModel):
    type: str  # 'attendance counselling', 'remedial/peer tutoring', 'study-plan check-in', 'wellbeing referral'
    notes: Optional[str] = ""

class UpdateInterventionStatusRequest(BaseModel):
    status: str  # 'accepted', 'rejected', 'in progress', 'done'
    reject_reason: Optional[str] = None

class BandOverrideRequest(BaseModel):
    overridden_band: str  # 'Green', 'Amber', 'Red'
    mandatory_reason: str

class AddNoteRequest(BaseModel):
    note: str

class AddFeedbackRequest(BaseModel):
    feedback: Optional[str] = None
    feedback_text: Optional[str] = None
    semester: Optional[int] = 4
    subject_code: Optional[str] = None

class AddTimelineRequest(BaseModel):
    title: str
    details: str

class SendChatMessageRequest(BaseModel):
    text: str

def check_mentor_owns_student(mentor_id: str, student_id: str):
    """Enforces that a mentor sees ONLY their own mentees. Returns 403 Forbidden otherwise."""
    with db.lock:
        student = db.users.get(student_id)
        if not student or student.get("role") != "Student":
            raise HTTPException(status_code=404, detail="Student not found")
        if student.get("mentor_id") != mentor_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You are only authorized to access your designated mentees."
            )
        return student

@router.get("/mentees")
def get_my_mentees(current_user = Depends(require_role(["Faculty"]))):
    mentor_id = current_user["id"]
    with db.lock:
        mentees_list = []
        for s in db.users.values():
            if s.get("role") == "Student" and s.get("is_active", True) and s.get("mentor_id") == mentor_id:
                risk = calculate_student_risk(s["id"], db)
                mentees_list.append(risk)
        return mentees_list

@router.get("/dashboard-stats")
def get_mentor_dashboard_stats(current_user = Depends(require_role(["Faculty"]))):
    mentor_id = current_user["id"]
    with db.lock:
        mentees = [
            s for s in db.users.values()
            if s.get("role") == "Student" and s.get("is_active", True) and s.get("mentor_id") == mentor_id
        ]
        
        bands_count = {"Green": 0, "Amber": 0, "Red": 0}
        trend_count = {"improving": 0, "declining": 0, "stable": 0}
        
        cohort_history_weeks = {f"W-{i}": {"Green": 0, "Amber": 0, "Red": 0, "avg_score": 0.0, "total": 0} for i in range(8, 0, -1)}
        mentee_summaries = []

        total_this_month_att = 0.0
        total_last_month_att = 0.0
        total_marks = 0.0

        for s in mentees:
            risk = calculate_student_risk(s["id"], db)
            band = risk.get("effective_band", "Green")
            trend = risk.get("trend_direction", "stable")
            
            bands_count[band] = bands_count.get(band, 0) + 1
            trend_count[trend] = trend_count.get(trend, 0) + 1

            metrics = risk.get("metrics", {})
            total_this_month_att += metrics.get("attendance_recent", 80.0)
            total_last_month_att += metrics.get("attendance_prior", 80.0)
            total_marks += metrics.get("average_marks", 75.0)

            for hw in risk.get("history_8_weeks", []):
                wk = hw["week"]
                if wk in cohort_history_weeks:
                    cohort_history_weeks[wk][hw["band"]] += 1
                    cohort_history_weeks[wk]["avg_score"] += hw["score"]
                    cohort_history_weeks[wk]["total"] += 1

            unread_chat = sum(
                1 for m in db.chat_messages
                if m.get("sender_id") == s["id"] and m.get("receiver_id") == mentor_id and not m.get("is_read", False)
            )

            mentee_summaries.append({
                "student_id": s["id"],
                "student_name": s["name"],
                "roll_no": s.get("roll_no", s["id"]),
                "branch": s.get("branch", "CSE"),
                "section": s.get("section", "A"),
                "weighted_score": risk["weighted_score"],
                "effective_band": band,
                "calculated_band": risk["calculated_band"],
                "is_overridden": risk["is_overridden"],
                "trend_direction": trend,
                "top_factors": risk["top_factors"],
                "plain_language_explanation": risk["plain_language_explanation"],
                "flag": risk["flag"],
                "attendance_overall": metrics.get("attendance_overall", 0),
                "unread_chat": unread_chat
            })

        count = len(mentees) if len(mentees) > 0 else 1
        cohort_history = []
        for wk, data in cohort_history_weeks.items():
            tot = data["total"] if data["total"] > 0 else 1
            cohort_history.append({
                "week": wk,
                "Green": data["Green"],
                "Amber": data["Amber"],
                "Red": data["Red"],
                "avg_risk": round(data["avg_score"] / tot, 1)
            })

        changes_feed = []
        for s in mentee_summaries:
            if s["trend_direction"] == "declining":
                changes_feed.append({
                    "student_name": s["student_name"],
                    "student_id": s["student_id"],
                    "type": "alert",
                    "band": s["effective_band"],
                    "text": f"{s['student_name']} experienced a drop in engagement/marks this week. Flagged in {s['effective_band']} band."
                })
            elif s["trend_direction"] == "improving":
                changes_feed.append({
                    "student_name": s["student_name"],
                    "student_id": s["student_id"],
                    "type": "success",
                    "band": s["effective_band"],
                    "text": f"{s['student_name']} shows positive recovery in attendance and assessment checkpoints."
                })

        return {
            "total_mentees": len(mentees),
            "bands_count": bands_count,
            "trend_count": trend_count,
            "avg_attendance_recent": round(total_this_month_att / count, 1),
            "avg_attendance_prior": round(total_last_month_att / count, 1),
            "avg_marks": round(total_marks / count, 1),
            "mentees": mentee_summaries,
            "cohort_history": cohort_history,
            "what_changed_this_week": changes_feed[:6]
        }

@router.get("/students/{student_id}")
def get_student_detail(student_id: str, current_user = Depends(require_role(["Faculty"]))):
    mentor_id = current_user["id"]
    check_mentor_owns_student(mentor_id, student_id)
    
    with db.lock:
        user = db.users[student_id]
        risk = calculate_student_risk(student_id, db)

        student_att = []
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

                student_att.append({
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

        student_exams = [m for m in db.exam_results if m.get("student_id") == student_id]
        semester_history = db.semester_summaries.get(student_id, [])
        student_subs = [s for s in db.assignment_submissions if s.get("student_id") == student_id]
        interventions = [i for i in db.interventions if i.get("student_id") == student_id]
        notes = [n for n in db.notes if n.get("student_id") == student_id]
        feedbacks = [f for f in db.academic_feedback if f.get("student_id") == student_id]
        timeline = [t for t in db.improvement_timeline if t.get("student_id") == student_id]
        audits = [a for a in db.audit_logs if a.get("student_id") == student_id]

        messages = [
            m for m in db.chat_messages
            if (m.get("sender_id") == student_id and m.get("receiver_id") == mentor_id) or
               (m.get("sender_id") == mentor_id and m.get("receiver_id") == student_id)
        ]
        for m in messages:
            if m.get("receiver_id") == mentor_id:
                m["is_read"] = True

        return {
            "student": {
                "id": user["id"],
                "name": user["name"],
                "roll_no": user.get("roll_no", user["id"]),
                "email": user["email"],
                "student_phone": user.get("student_phone", ""),
                "parent_phone": user.get("parent_phone", ""),
                "branch": user.get("branch", "CSE"),
                "section": user.get("section", "A"),
                "semester": user.get("semester", 4),
            },
            "risk": risk,
            "attendance": student_att,
            "exams": student_exams,
            "semester_history": semester_history,
            "assignments": student_subs,
            "interventions": interventions,
            "notes": notes,
            "feedbacks": feedbacks,
            "timeline": timeline,
            "audits": audits,
            "chat": messages
        }

@router.post("/students/{student_id}/interventions")
def create_intervention(student_id: str, req: CreateInterventionRequest, current_user = Depends(require_role(["Faculty"]))):
    mentor_id = current_user["id"]
    check_mentor_owns_student(mentor_id, student_id)
    with db.lock:
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        intv_id = f"INTV-{student_id}-{len(db.interventions) + 1:02d}"
        intervention = {
            "id": intv_id,
            "student_id": student_id,
            "mentor_id": mentor_id,
            "type": req.type,
            "status": "pending",
            "reject_reason": None,
            "notes": req.notes,
            "created_at": now,
            "updated_at": now
        }
        db.interventions.insert(0, intervention)
        db.log_audit("INTERVENTION_CREATED", mentor_id, student_id, f"Initiated {req.type} intervention")
        db.save()
        logger.info(f"Intervention {intv_id} created for student {student_id} by mentor {mentor_id}")
        return {"success": True, "intervention": intervention}

@router.patch("/interventions/{intervention_id}/status")
def update_intervention_status(intervention_id: str, req: UpdateInterventionStatusRequest, current_user = Depends(require_role(["Faculty"]))):
    with db.lock:
        intv = next((i for i in db.interventions if i["id"] == intervention_id), None)
        if not intv:
            raise HTTPException(status_code=404, detail="Intervention not found")
        
        check_mentor_owns_student(current_user["id"], intv["student_id"])
        intv["status"] = req.status
        if req.status == "rejected":
            intv["reject_reason"] = req.reject_reason or "No reason specified"
        intv["updated_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()

        # Auto-create milestone when intervention is marked done
        if req.status == "done":
            today_str = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d")
            db.add_milestone(
                student_id=intv["student_id"],
                title=f"Intervention Completed: {intv['type'].title()}",
                details=f"Structured intervention '{intv['type']}' marked completed with mentor sign-off.",
                recorded_by=current_user["id"],
                date_str=today_str
            )

        db.log_audit("INTERVENTION_STATUS_UPDATED", current_user["id"], intv["student_id"], f"Updated intervention {intv['type']} to {req.status}")
        db.save()
        logger.info(f"Intervention {intervention_id} updated to {req.status} by {current_user['id']}")
        return {"success": True, "intervention": intv}

@router.post("/students/{student_id}/override-band")
def override_student_band(student_id: str, req: BandOverrideRequest, current_user = Depends(require_role(["Faculty"]))):
    mentor_id = current_user["id"]
    check_mentor_owns_student(mentor_id, student_id)
    
    if not req.mandatory_reason or len(req.mandatory_reason.strip()) < 8:
        raise HTTPException(status_code=400, detail="Mandatory justification reason (at least 8 characters) is required for band override.")

    with db.lock:
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        current_risk = calculate_student_risk(student_id, db)
        prev_band = current_risk.get("effective_band")

        override_entry = {
            "id": f"OVR-{len(db.band_overrides) + 1:03d}",
            "student_id": student_id,
            "mentor_id": mentor_id,
            "previous_band": prev_band,
            "overridden_band": req.overridden_band,
            "mandatory_reason": req.mandatory_reason.strip(),
            "timestamp": now
        }
        db.band_overrides.append(override_entry)
        db.log_audit("BAND_OVERRIDDEN", mentor_id, student_id, f"Band manually overridden from {prev_band} to {req.overridden_band}. Reason: {req.mandatory_reason.strip()}")
        db.save()
        logger.info(f"Band overridden for student {student_id} to {req.overridden_band} by mentor {mentor_id}")
        return {"success": True, "override": override_entry}

@router.post("/students/{student_id}/notes")
def add_mentor_note(student_id: str, req: AddNoteRequest, current_user = Depends(require_role(["Faculty"]))):
    mentor_id = current_user["id"]
    check_mentor_owns_student(mentor_id, student_id)
    if not req.note or not req.note.strip():
        raise HTTPException(status_code=400, detail="Note text cannot be empty.")
    with db.lock:
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        note_entry = {
            "id": f"NOTE-{student_id}-{len(db.notes) + 1:02d}",
            "student_id": student_id,
            "mentor_id": mentor_id,
            "note": req.note.strip(),
            "created_at": now
        }
        db.notes.insert(0, note_entry)
        db.log_audit("NOTE_ADDED", mentor_id, student_id, "Added internal mentoring note")
        db.save()
        logger.info(f"Mentor note added for student {student_id} by mentor {mentor_id}")
        return {"success": True, "note": note_entry}

@router.post("/students/{student_id}/feedback")
def add_academic_feedback(student_id: str, req: AddFeedbackRequest, current_user = Depends(require_role(["Faculty"]))):
    mentor_id = current_user["id"]
    check_mentor_owns_student(mentor_id, student_id)
    
    text = (req.feedback or req.feedback_text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Feedback text cannot be empty.")

    with db.lock:
        user = db.users.get(student_id)
        if not user:
            raise HTTPException(status_code=404, detail=f"Student {student_id} not found.")

        mentor = db.users.get(mentor_id, {})
        mentor_name = mentor.get("name", "Faculty Mentor")
        sem = req.semester or user.get("semester", 4)
        subj = req.subject_code or "General"
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        fdbk_id = f"FDBK-{student_id}-{len(db.academic_feedback) + 1:02d}"

        entry = {
            "id": fdbk_id,
            "student_id": student_id,
            "mentor_id": mentor_id,
            "mentor_name": mentor_name,
            "semester": sem,
            "subject_code": subj,
            "feedback": text,
            "feedback_text": text,
            "created_at": now
        }
        db.academic_feedback.insert(0, entry)
        db.log_audit("FEEDBACK_SHARED", mentor_id, student_id, f"Provided academic/results feedback to student: {subj}")

        # Send notification to student using notification system
        preview = text[:80] + ("..." if len(text) > 80 else "")
        try:
            create_notification(
                user_ids=student_id,
                type="general",
                title=f"New feedback from {mentor_name}",
                message=f"{mentor_name} posted feedback for {subj}: {preview}",
                link="/student/results"
            )
        except Exception as ne:
            logger.warning(f"Could not create student notification for feedback: {ne}")

        db.save()
        logger.info(f"Feedback {fdbk_id} successfully stored for student {student_id} by {mentor_name}")
        return {"success": True, "feedback": entry}

@router.post("/students/{student_id}/timeline")
def record_timeline_improvement(student_id: str, req: AddTimelineRequest, current_user = Depends(require_role(["Faculty"]))):
    mentor_id = current_user["id"]
    check_mentor_owns_student(mentor_id, student_id)
    with db.lock:
        now = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d")
        entry = db.add_milestone(
            student_id=student_id,
            title=req.title.strip(),
            details=req.details.strip(),
            recorded_by=mentor_id,
            date_str=now
        )
        if not entry:
            entry = {
                "id": f"IMP-{student_id}-manual",
                "student_id": student_id,
                "recorded_by": mentor_id,
                "title": req.title.strip(),
                "details": req.details.strip(),
                "date": now
            }
        db.log_audit("TIMELINE_RECORDED", mentor_id, student_id, f"Recorded improvement: {req.title.strip()}")
        db.save()
        return {"success": True, "timeline_entry": entry}

@router.post("/students/{student_id}/chat")
def send_chat_message(student_id: str, req: SendChatMessageRequest, current_user = Depends(require_role(["Faculty"]))):
    mentor_id = current_user["id"]
    check_mentor_owns_student(mentor_id, student_id)
    with db.lock:
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        msg = {
            "id": f"MSG-{student_id}-{len(db.chat_messages) + 1:03d}",
            "sender_id": mentor_id,
            "receiver_id": student_id,
            "text": req.text.strip(),
            "timestamp": now,
            "is_read": False
        }
        db.chat_messages.append(msg)
        db.save()
        return {"success": True, "message": msg}

# Academic Insights: Subjects attended by mentor's mentees
@router.get("/academic-insights/subjects")
def get_mentees_subjects(current_user = Depends(require_role(["Faculty"]))):
    mentor_id = current_user["id"]
    with db.lock:
        mentees = [s for s in db.users.values() if s.get("role") == "Student" and s.get("is_active", True) and s.get("mentor_id") == mentor_id]
        mentee_ids = {s["id"] for s in mentees}
        distinct_subs = {}
        for key, rec in db.attendance_records.items():
            sid = key.split(":")[0]
            if sid in mentee_ids:
                code = rec.get("subject_code")
                name = rec.get("subject_name", code)
                distinct_subs[code] = {"code": code, "name": name}
        
        # Also include subjects from db.subjects
        for code, sub in db.subjects.items():
            if code not in distinct_subs:
                distinct_subs[code] = {"code": code, "name": sub.get("name", code)}
                
        return list(distinct_subs.values())

# Phase 4 - Academic Insights Endpoints
@router.get("/academic-insights/results-at-risk")
def get_results_at_risk(
    semester: Optional[int] = Query(None),
    branch: Optional[str] = Query(None),
    section: Optional[str] = Query(None),
    subject: Optional[str] = Query(None),
    band: Optional[str] = Query(None),
    threshold: float = Query(6.5),
    declining_only: bool = Query(False),
    search: Optional[str] = Query(None),
    sort: Optional[str] = Query("sgpa_asc"),
    current_user = Depends(require_role(["Faculty"]))
):
    mentor_id = current_user["id"]
    with db.lock:
        mentees = [
            s for s in db.users.values()
            if s.get("role") == "Student" and s.get("is_active", True) and s.get("mentor_id") == mentor_id
        ]
        
        results_list = []
        for s in mentees:
            if branch and s.get("branch", "").upper() != branch.upper():
                continue
            if section and s.get("section", "").upper() != section.upper():
                continue
            if search:
                term = search.lower()
                if term not in s["name"].lower() and term not in s["id"].lower() and term not in s.get("roll_no", "").lower():
                    continue

            risk = calculate_student_risk(s["id"], db)
            eff_band = risk.get("effective_band", "Green")
            if band and band.upper() != "ALL" and eff_band.upper() != band.upper():
                continue

            sems = db.semester_summaries.get(s["id"], [])
            target_sem_num = semester if semester is not None else s.get("semester", 4)
            target_sem = next((sm for sm in sems if sm.get("semester") == target_sem_num), None)
            if not target_sem and sems:
                target_sem = sems[-1]
            if not target_sem:
                target_sem = {"sgpa": 7.0, "cgpa": 7.0, "backlogs": 0}

            prior_sem = next((sm for sm in sems if sm.get("semester") == target_sem_num - 1), target_sem)
            sgpa_drop = round(target_sem["sgpa"] - prior_sem["sgpa"], 2)
            has_sgpa_drop = sgpa_drop < -0.3
            is_below_threshold = target_sem["sgpa"] < threshold
            has_backlogs = target_sem.get("backlogs", 0) > 0

            # Check marks in exams (optionally filtered by subject and semester)
            exams = [
                e for e in db.exam_results 
                if e.get("student_id") == s["id"] and (semester is None or e.get("semester") == target_sem_num)
            ]
            if subject:
                exams = [e for e in exams if e.get("subject_code", "").upper() == subject.upper()]

            failed_exams = [e for e in exams if e.get("score_pct", 100) < 40]

            is_at_risk = is_below_threshold or has_sgpa_drop or has_backlogs or len(failed_exams) > 0
            if declining_only and not (has_sgpa_drop or len(failed_exams) > 0):
                continue

            if is_at_risk:
                results_list.append({
                    "student_id": s["id"],
                    "student_name": s["name"],
                    "roll_no": s.get("roll_no", s["id"]),
                    "branch": s.get("branch", "CSE"),
                    "section": s.get("section", "A"),
                    "semester": target_sem_num,
                    "band": eff_band,
                    "sgpa": target_sem["sgpa"],
                    "prior_sgpa": prior_sem["sgpa"],
                    "sgpa_drop": sgpa_drop,
                    "backlogs": target_sem.get("backlogs", 0),
                    "failed_count": len(failed_exams),
                    "failed_subjects": [e["subject_name"] for e in failed_exams],
                    "risk_score": risk["weighted_score"]
                })

        # Sorting
        if sort == "sgpa_desc":
            results_list.sort(key=lambda x: x["sgpa"], reverse=True)
        elif sort == "drop_desc":
            results_list.sort(key=lambda x: x["sgpa_drop"])
        elif sort == "name":
            results_list.sort(key=lambda x: x["student_name"])
        else: # sgpa_asc (default)
            results_list.sort(key=lambda x: x["sgpa"])

        return results_list

@router.get("/academic-insights/attendance-at-risk")
def get_attendance_at_risk(
    semester: Optional[int] = Query(None),
    branch: Optional[str] = Query(None),
    section: Optional[str] = Query(None),
    subject: Optional[str] = Query(None),
    band: Optional[str] = Query(None),
    threshold: float = Query(75.0),
    declining_only: bool = Query(False),
    search: Optional[str] = Query(None),
    sort: Optional[str] = Query("att_asc"),
    current_user = Depends(require_role(["Faculty"]))
):
    mentor_id = current_user["id"]
    with db.lock:
        mentees = [
            s for s in db.users.values()
            if s.get("role") == "Student" and s.get("is_active", True) and s.get("mentor_id") == mentor_id
        ]

        results_list = []
        for s in mentees:
            if branch and s.get("branch", "").upper() != branch.upper():
                continue
            if section and s.get("section", "").upper() != section.upper():
                continue
            if search:
                term = search.lower()
                if term not in s["name"].lower() and term not in s["id"].lower() and term not in s.get("roll_no", "").lower():
                    continue

            risk = calculate_student_risk(s["id"], db)
            eff_band = risk.get("effective_band", "Green")
            if band and band.upper() != "ALL" and eff_band.upper() != band.upper():
                continue

            metrics = risk.get("metrics", {})
            overall = metrics.get("attendance_overall", 100.0)
            trend_delta = metrics.get("attendance_trend_delta", 0.0)

            # Check subjects
            sub_records = [
                rec for key, rec in db.attendance_records.items()
                if key.startswith(f"{s['id']}:")
            ]

            if subject:
                # Requirement: "When subject is set, evaluate only that subject's percentage against the threshold and return that subject's held/attended/remaining/classes-needed-for-75%."
                matching_rec = next((r for r in sub_records if r.get("subject_code", "").upper() == subject.upper()), None)
                if matching_rec:
                    held = matching_rec.get("total_classes", 0)
                    attended = matching_rec.get("attended_classes", 0)
                    total_course = matching_rec.get("total_course_classes", 45)
                    remaining = max(0, total_course - held)
                    sub_pct = matching_rec.get("percentage", 0.0)
                    classes_needed = max(0, int(round((0.75 * held - attended) / 0.25))) if sub_pct < 75.0 else 0
                    is_at_risk = sub_pct < threshold or trend_delta <= -5.0
                    if declining_only and trend_delta >= 0.0:
                        continue

                    if is_at_risk:
                        results_list.append({
                            "student_id": s["id"],
                            "student_name": s["name"],
                            "roll_no": s.get("roll_no", s["id"]),
                            "branch": s.get("branch", "CSE"),
                            "section": s.get("section", "A"),
                            "overall_attendance": overall,
                            "trend_delta": trend_delta,
                            "subject_code": matching_rec.get("subject_code"),
                            "subject_name": matching_rec.get("subject_name"),
                            "subject_attendance": sub_pct,
                            "held": held,
                            "attended": attended,
                            "remaining": remaining,
                            "classes_needed_for_75": classes_needed,
                            "subjects_below_threshold": [matching_rec.get("subject_name")] if sub_pct < threshold else [],
                            "effective_band": eff_band,
                            "risk_score": risk["weighted_score"]
                        })
            else:
                # Overall evaluation
                below_sub = [
                    r["subject_name"] for r in sub_records
                    if r.get("percentage", 100) < threshold
                ]
                is_at_risk = overall < threshold or len(below_sub) > 0 or trend_delta <= -5.0
                if declining_only and trend_delta >= 0.0:
                    continue

                if is_at_risk:
                    results_list.append({
                        "student_id": s["id"],
                        "student_name": s["name"],
                        "roll_no": s.get("roll_no", s["id"]),
                        "branch": s.get("branch", "CSE"),
                        "section": s.get("section", "A"),
                        "overall_attendance": overall,
                        "trend_delta": trend_delta,
                        "subjects_below_threshold": below_sub,
                        "effective_band": eff_band,
                        "risk_score": risk["weighted_score"]
                    })

        # Sorting
        if sort == "att_desc":
            results_list.sort(key=lambda x: x.get("subject_attendance", x["overall_attendance"]), reverse=True)
        elif sort == "trend":
            results_list.sort(key=lambda x: x["trend_delta"])
        elif sort == "name":
            results_list.sort(key=lambda x: x["student_name"])
        else: # att_asc (default)
            results_list.sort(key=lambda x: x.get("subject_attendance", x["overall_attendance"]))

        return results_list

@router.get("/academic-insights/results-explorer")
def get_results_explorer(
    semester: int = Query(4),
    current_user = Depends(require_role(["Faculty"]))
):
    mentor_id = current_user["id"]
    with db.lock:
        mentees = [
            s for s in db.users.values()
            if s.get("role") == "Student" and s.get("is_active", True) and s.get("mentor_id") == mentor_id
        ]
        
        cohort_results = []
        for s in mentees:
            sems = db.semester_summaries.get(s["id"], [])
            sem_data = next((sm for sm in sems if sm.get("semester") == semester), None)
            if not sem_data and sems:
                sem_data = sems[-1]
            if not sem_data:
                sem_data = {"sgpa": 7.0, "cgpa": 7.0, "backlogs": 0, "status": "Passed"}
            
            internal_exams = [
                e for e in db.exam_results
                if e.get("student_id") == s["id"] and e.get("semester", semester) == semester and "Internal" in e.get("exam_name", "")
            ]
            quizzes = [
                e for e in db.exam_results
                if e.get("student_id") == s["id"] and e.get("semester", semester) == semester and "Quiz" in e.get("exam_name", "")
            ]
            feedbacks = [
                f for f in db.academic_feedback
                if f.get("student_id") == s["id"] and f.get("semester") == semester
            ]

            cohort_results.append({
                "student_id": s["id"],
                "student_name": s["name"],
                "roll_no": s.get("roll_no", s["id"]),
                "semester": semester,
                "sgpa": sem_data.get("sgpa", 7.0),
                "cgpa": sem_data.get("cgpa", 7.0),
                "backlogs": sem_data.get("backlogs", 0),
                "status": sem_data.get("status", "Passed"),
                "internal_exams": internal_exams,
                "quizzes": quizzes,
                "feedbacks": feedbacks
            })

        return {
            "semester": semester,
            "cohort_results": cohort_results
        }

@router.get("/academic-insights/assignments-cohort")
def get_assignments_cohort(current_user = Depends(require_role(["Faculty"]))):
    mentor_id = current_user["id"]
    with db.lock:
        mentees = [
            s for s in db.users.values()
            if s.get("role") == "Student" and s.get("is_active", True) and s.get("mentor_id") == mentor_id
        ]
        mentee_ids = {s["id"] for s in mentees}

        submissions = [s for s in db.assignment_submissions if s.get("student_id") in mentee_ids]
        
        counts = {
            "submitted": sum(1 for s in submissions if s["status"] == "submitted"),
            "late": sum(1 for s in submissions if s["status"] == "late"),
            "missed": sum(1 for s in submissions if s["status"] in ("missed", "overdue")),
            "pending": sum(1 for s in submissions if s["status"] == "pending")
        }

        by_student = []
        for s in mentees:
            stu_subs = [sub for sub in submissions if sub["student_id"] == s["id"]]
            by_student.append({
                "student_id": s["id"],
                "student_name": s["name"],
                "submitted": sum(1 for x in stu_subs if x["status"] == "submitted"),
                "late": sum(1 for x in stu_subs if x["status"] == "late"),
                "missed": sum(1 for x in stu_subs if x["status"] in ("missed", "overdue")),
                "pending": sum(1 for x in stu_subs if x["status"] == "pending"),
                "items": stu_subs
            })

        return {
            "cohort_summary": counts,
            "student_breakdown": by_student,
            "assignments_catalog": list(db.assignments.values())
        }
