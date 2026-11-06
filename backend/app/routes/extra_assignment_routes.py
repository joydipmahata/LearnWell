import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from app.routes.auth_routes import get_current_user_from_token, require_role
from app.store import db
from app.notifications import create_notification

router = APIRouter(prefix="", tags=["Extra Assignments & Calendar"])

class QuizQuestionModel(BaseModel):
    id: str
    question: str
    options: List[str]
    correct_option: int  # 0 to 3
    explanation: Optional[str] = ""

class CreateExtraAssignmentRequest(BaseModel):
    title: str
    description: str
    subject_code: str
    student_ids: List[str]
    due_date: Optional[str] = None  # YYYY-MM-DD
    questions: List[QuizQuestionModel]

class SubmitQuizRequest(BaseModel):
    answers: Dict[str, int]  # question_id -> chosen index (0-3)

def generate_study_suggestions(subject_code: str, score_pct: float) -> List[dict]:
    suggestions = [
        {
            "title": "Structured 25-minute study intervals",
            "description": f"Break {subject_code} concepts into 25-minute high-focus blocks followed by 5-minute cognitive breaks.",
            "type": "technique"
        },
        {
            "title": "Foundational unit review",
            "description": f"Target the weakest conceptual units in {subject_code}. Reread lecture slides before attempting more problems.",
            "type": "syllabus"
        },
        {
            "title": "Practice past exam papers",
            "description": f"Head to the Question Bank and solve previous IA1 and IA2 questions for {subject_code} under timed conditions.",
            "type": "practice"
        },
        {
            "title": "Mentor doubt clearing clinic",
            "description": "Book a quick 1-on-1 desk review with your faculty mentor to clarify questions answered incorrectly.",
            "type": "mentorship"
        }
    ]
    return suggestions

def check_overdue_assignments():
    """Checks for expired deadlines and updates status to 'Not completed' with Action Required flag."""
    now_str = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d")
    with db.lock:
        for easn in db.extra_assignments.values():
            due = easn.get("due_date", "")
            if due and due < now_str:
                for stu_id in easn.get("student_ids", []):
                    sub = next((s for s in db.assignment_verifications if s.get("assignment_id") == easn["id"] and s.get("student_id") == stu_id), None)
                    if not sub:
                        # Record 'Not completed' entry
                        entry = {
                            "id": f"VER-{easn['id']}-{stu_id}",
                            "assignment_id": easn["id"],
                            "student_id": stu_id,
                            "status": "Not completed",
                            "score": 0,
                            "total_questions": len(easn.get("questions", [])),
                            "action_required": True,
                            "suggested_action": "Ask the student to explain the topic in class, then re-assign with a short extension.",
                            "submitted_at": None,
                            "study_suggestions": generate_study_suggestions(easn["subject_code"], 0.0)
                        }
                        db.assignment_verifications.append(entry)

                        # Notify mentor
                        mentor_id = easn.get("mentor_id")
                        stu_user = db.users.get(stu_id, {})
                        if mentor_id:
                            create_notification(
                                user_ids=[mentor_id],
                                type="intervention",
                                title=f"Action Required: Missed Work by {stu_user.get('name', stu_id)}",
                                message=f"Student {stu_user.get('name', stu_id)} missed the deadline for '{easn['title']}'. Suggested action: Ask the student to explain the topic in class, then re-assign with an extension.",
                                link="/faculty/mentorship"
                            )
                        # Notify student
                        create_notification(
                            user_ids=[stu_id],
                            type="assignment",
                            title=f"Assignment Deadline Missed: {easn['title']}",
                            message=f"The deadline for '{easn['title']}' has passed without completion. Please see your mentor for guidance.",
                            link="/student/calendar"
                        )

@router.post("/faculty/assignments/extra")
def create_extra_assignment(req: CreateExtraAssignmentRequest, current_user: dict = Depends(require_role(["Faculty"]))):
    """Faculty mentor creates an extra assignment with verification quiz for mentees."""
    if len(req.questions) < 2:
        raise HTTPException(status_code=400, detail="Assignment must include at least 2-5 verification questions.")

    now = datetime.datetime.now(datetime.timezone.utc)
    due_str = req.due_date or (now + datetime.timedelta(days=7)).strftime("%Y-%m-%d")

    with db.lock:
        easn_id = f"EASN-{len(db.extra_assignments) + 1:03d}"
        assignment = {
            "id": easn_id,
            "mentor_id": current_user["id"],
            "mentor_name": current_user["name"],
            "title": req.title.strip(),
            "description": req.description.strip(),
            "subject_code": req.subject_code.strip().upper(),
            "student_ids": req.student_ids,
            "due_date": due_str,
            "questions": [q.model_dump() for q in req.questions],
            "created_at": now.isoformat()
        }
        db.extra_assignments[easn_id] = assignment

        # Notify assigned students
        if req.student_ids:
            create_notification(
                user_ids=req.student_ids,
                type="assignment",
                title=f"New Remedial Assignment: {req.title}",
                message=f"Prof. {current_user['name']} has assigned '{req.title}' for {req.subject_code}. Complete the work and submit the verification quiz by {due_str}.",
                link="/student/calendar"
            )

        db.log_audit("EXTRA_ASSIGNMENT_CREATED", current_user["id"], details=f"Created extra assignment {easn_id} for {len(req.student_ids)} students")

        return {"success": True, "assignment": assignment}

@router.get("/assignments/my")
def get_my_assignments(current_user: dict = Depends(get_current_user_from_token)):
    """Returns extra assignments assigned to current student with verification quiz status."""
    check_overdue_assignments()
    user_id = current_user["id"]
    with db.lock:
        my_list = []
        for a in db.extra_assignments.values():
            if user_id in a.get("student_ids", []):
                # Check verification status
                ver = next((v for v in db.assignment_verifications if v.get("assignment_id") == a["id"] and v.get("student_id") == user_id), None)
                item = {
                    "id": a["id"],
                    "title": a["title"],
                    "description": a["description"],
                    "subject_code": a["subject_code"],
                    "due_date": a["due_date"],
                    "mentor_name": a.get("mentor_name", "Mentor"),
                    "question_count": len(a.get("questions", [])),
                    "status": ver.get("status") if ver else "Pending",
                    "score": ver.get("score") if ver else None,
                    "submitted_at": ver.get("submitted_at") if ver else None,
                    "study_suggestions": ver.get("study_suggestions") if ver else []
                }
                my_list.append(item)
        return my_list

@router.get("/assignments/extra/{assignment_id}")
def get_extra_assignment_details(assignment_id: str, current_user: dict = Depends(get_current_user_from_token)):
    """Returns details and questions of an extra assignment for taking verification."""
    with db.lock:
        easn = db.extra_assignments.get(assignment_id)
        if not easn:
            raise HTTPException(status_code=404, detail="Assignment not found")

        # Strip correct_option and explanation for students if not yet submitted
        ver = next((v for v in db.assignment_verifications if v.get("assignment_id") == assignment_id and v.get("student_id") == current_user["id"]), None)

        sanitized_questions = []
        for q in easn.get("questions", []):
            q_copy = {
                "id": q["id"],
                "question": q["question"],
                "options": q["options"],
            }
            if ver or current_user.get("role") in ("Faculty", "Admin"):
                q_copy["correct_option"] = q.get("correct_option")
                q_copy["explanation"] = q.get("explanation")
            sanitized_questions.append(q_copy)

        return {
            "id": easn["id"],
            "title": easn["title"],
            "description": easn["description"],
            "subject_code": easn["subject_code"],
            "due_date": easn["due_date"],
            "mentor_name": easn.get("mentor_name", "Mentor"),
            "questions": sanitized_questions,
            "submission": ver
        }

@router.post("/assignments/extra/{assignment_id}/submit")
@router.post("/extra-assignments/{assignment_id}/submit")
def submit_verification_quiz(assignment_id: str, req: SubmitQuizRequest, current_user: dict = Depends(require_role(["Student"]))):
    """Student submits verification quiz for extra assignment. Auto-grades MCQs and computes status."""
    student_id = current_user["id"]
    now = datetime.datetime.now(datetime.timezone.utc)
    today_str = now.strftime("%Y-%m-%d")

    with db.lock:
        easn = db.extra_assignments.get(assignment_id)
        if not easn:
            raise HTTPException(status_code=404, detail="Assignment not found")

        if student_id not in easn.get("student_ids", []):
            raise HTTPException(status_code=403, detail="You are not enrolled in this extra assignment.")

        # Check existing submission
        existing = next((v for v in db.assignment_verifications if v.get("assignment_id") == assignment_id and v.get("student_id") == student_id), None)
        if existing and existing.get("status") in ("Completed on time", "Completed late"):
            raise HTTPException(status_code=400, detail="You have already submitted this verification quiz.")

        questions = easn.get("questions", [])
        correct_count = 0
        for q in questions:
            chosen = req.answers.get(q["id"])
            if chosen is not None and chosen == q.get("correct_option"):
                correct_count += 1

        total = len(questions)
        pct = round((correct_count / total * 100.0) if total > 0 else 100.0, 1)

        # Determine status: on time vs late
        due_date = easn.get("due_date", "")
        is_on_time = today_str <= due_date
        status_label = "Completed on time" if is_on_time else "Completed late"

        study_suggestions = []
        if pct < 60.0 or not is_on_time:
            study_suggestions = generate_study_suggestions(easn["subject_code"], pct)

        submission_entry = {
            "id": f"VER-{assignment_id}-{student_id}",
            "assignment_id": assignment_id,
            "student_id": student_id,
            "student_name": current_user["name"],
            "status": status_label,
            "score": correct_count,
            "total_questions": total,
            "percentage": pct,
            "submitted_at": now.isoformat(),
            "action_required": False,
            "suggested_action": None,
            "study_suggestions": study_suggestions
        }

        if existing:
            existing.update(submission_entry)
        else:
            db.assignment_verifications.append(submission_entry)

        db.log_audit("ASSIGNMENT_VERIFICATION_SUBMITTED", student_id, details=f"Submitted quiz for {assignment_id}: score {correct_count}/{total} ({status_label})")

        return {
            "success": True,
            "status": status_label,
            "score": correct_count,
            "total_questions": total,
            "percentage": pct,
            "study_suggestions": study_suggestions
        }

@router.get("/faculty/assignments/extra/tracker")
def get_mentor_assignment_tracker(current_user: dict = Depends(require_role(["Faculty"]))):
    """Tracker for mentor to see each student's assignment completion status, quiz scores, and action required flags."""
    check_overdue_assignments()
    mentor_id = current_user["id"]

    with db.lock:
        tracker = []
        my_assignments = [a for a in db.extra_assignments.values() if a.get("mentor_id") == mentor_id]

        for a in my_assignments:
            for stu_id in a.get("student_ids", []):
                stu_user = db.users.get(stu_id, {})
                ver = next((v for v in db.assignment_verifications if v.get("assignment_id") == a["id"] and v.get("student_id") == stu_id), None)

                tracker.append({
                    "assignment_id": a["id"],
                    "assignment_title": a["title"],
                    "subject_code": a["subject_code"],
                    "due_date": a["due_date"],
                    "student_id": stu_id,
                    "student_name": stu_user.get("name", stu_id),
                    "roll_no": stu_user.get("roll_no", stu_id),
                    "status": ver.get("status") if ver else "Pending",
                    "score": f"{ver['score']}/{ver['total_questions']}" if ver and ver.get("score") is not None else "-",
                    "percentage": ver.get("percentage") if ver else None,
                    "action_required": ver.get("action_required", False) if ver else False,
                    "suggested_action": ver.get("suggested_action") if ver else None,
                    "submitted_at": ver.get("submitted_at") if ver else None
                })

        return tracker

@router.get("/student/calendar")
@router.get("/extra-assignments/student/calendar")
def get_student_calendar(current_user: dict = Depends(get_current_user_from_token)):
    """Returns combined calendar items (classes, assignment due dates, quizzes, exams) for month/week view."""
    student_id = current_user["id"]
    section = current_user.get("section", "A")

    with db.lock:
        items = []

        # 1. Assignment deadlines
        for a in db.extra_assignments.values():
            if student_id in a.get("student_ids", []):
                ver = next((v for v in db.assignment_verifications if v.get("assignment_id") == a["id"] and v.get("student_id") == student_id), None)
                items.append({
                    "id": f"CAL-EASN-{a['id']}",
                    "type": "assignment",
                    "title": f"Due: {a['title']}",
                    "date": a.get("due_date"),
                    "subject": a.get("subject_code"),
                    "details": a.get("description"),
                    "status": ver.get("status") if ver else "Pending",
                    "link": f"/student/assignments/{a['id']}"
                })

        # Standard assignments
        for a in db.assignments.values():
            items.append({
                "id": f"CAL-ASN-{a['id']}",
                "type": "assignment",
                "title": f"Due: {a['title']}",
                "date": a.get("due_date"),
                "subject": a.get("subject_code"),
                "details": f"Coursework assignment for {a.get('subject_name')}",
                "status": "Coursework",
                "link": "/student/attendance"
            })

        # 2. Live quizzes & verification quizzes
        for q in db.live_quizzes.values():
            if q.get("section", "").upper() == section.upper():
                items.append({
                    "id": f"CAL-QUIZ-{q['id']}",
                    "type": "quiz",
                    "title": f"Live Quiz: {q['title']}",
                    "date": q.get("scheduled_date", datetime.datetime.now().strftime("%Y-%m-%d")),
                    "subject": q.get("subject_code"),
                    "details": f"Time limit: {q.get('time_limit_minutes', 15)} mins • Section {q.get('section')}",
                    "status": q.get("status", "scheduled"),
                    "link": "/student/live-quiz"
                })

        # 3. Class schedule (Timetable for this student's section)
        for s in db.timetable_slots:
            if s.get("section", "").upper() == section.upper():
                items.append({
                    "id": f"CAL-TT-{s['id']}",
                    "type": "class",
                    "day": s.get("day"),
                    "title": f"{s.get('subject_code')}: {s.get('subject_name')}",
                    "time": f"{s.get('start_time')} - {s.get('end_time')}",
                    "classroom": s.get("classroom"),
                    "faculty": s.get("faculty_name"),
                    "details": f"Class in {s.get('classroom')} by {s.get('faculty_name')}",
                    "link": "/student/dashboard"
                })

        # 4. Exam seating
        for idx, e in enumerate(db.exam_seating):
            if e.get("student_id") == student_id:
                items.append({
                    "id": f"CAL-EXAM-{e.get('id', idx)}",
                    "type": "exam",
                    "title": f"Exam: {e.get('subject') or e.get('subject_name', 'Examination')}",
                    "date": e.get("exam_date"),
                    "time": e.get("exam_time"),
                    "classroom": e.get("room_no"),
                    "details": f"Seat: {e.get('seat_no')} in {e.get('room_no')} ({e.get('block', 'Main')})",
                    "link": "/student/exam-seating"
                })

        return items
