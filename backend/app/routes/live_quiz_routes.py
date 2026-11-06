import datetime
import random
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.routes.auth_routes import get_current_user_from_token, require_role
from app.store import db
from app.notifications import create_notification

router = APIRouter(prefix="/quizzes", tags=["Live Quiz"])

class QuizMCQ(BaseModel):
    id: str
    question: str
    options: List[str]
    correct_option: int  # 0 to 3

class CreateLiveQuizRequest(BaseModel):
    title: str
    subject_code: str
    section: str = "A"
    time_limit_minutes: int = 15
    questions: List[QuizMCQ]

class JoinQuizRequest(BaseModel):
    pin: str

class SubmitQuizRequest(BaseModel):
    answers: Dict[str, int]
    client_started_at: str

@router.post("")
def create_live_quiz(req: CreateLiveQuizRequest, current_user: dict = Depends(require_role(["Faculty"]))):
    """Teacher creates a quiz with custom questions and time limit."""
    if len(req.questions) < 1:
        raise HTTPException(status_code=400, detail="Quiz must contain at least one question.")

    with db.lock:
        quiz_id = f"QUIZ-{len(db.live_quizzes) + 1:04d}"
        sub = db.subjects.get(req.subject_code.upper())
        sub_name = sub["name"] if sub else req.subject_code.upper()

        new_quiz = {
            "id": quiz_id,
            "title": req.title.strip(),
            "subject_code": req.subject_code.strip().upper(),
            "subject_name": sub_name,
            "section": req.section.strip().upper(),
            "time_limit_minutes": req.time_limit_minutes,
            "teacher_id": current_user["id"],
            "teacher_name": current_user["name"],
            "status": "draft",  # draft | active | ended
            "pin": None,
            "questions": [q.model_dump() for q in req.questions],
            "participants": {},  # student_id -> joined_at
            "submissions": {},   # student_id -> { answers, score, percentage, submitted_at, time_taken_seconds }
            "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }
        db.live_quizzes[quiz_id] = new_quiz
        return {"success": True, "quiz": new_quiz}

@router.get("/list")
def list_quizzes(current_user: dict = Depends(get_current_user_from_token)):
    """Lists quizzes for current user."""
    role = current_user.get("role")
    user_id = current_user.get("id")
    section = current_user.get("section", "A")

    with db.lock:
        quizzes = []
        for q in db.live_quizzes.values():
            if role == "Faculty":
                if q.get("teacher_id") == user_id:
                    quizzes.append(q)
            elif role == "Student":
                if q.get("section", "").upper() == section.upper():
                    # Sanitize correct options for student
                    q_sanitized = {**q, "questions": [{k: v for k, v in qu.items() if k != "correct_option"} for qu in q["questions"]]}
                    quizzes.append(q_sanitized)
            else:
                quizzes.append(q)

        quizzes.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        return quizzes

@router.post("/{quiz_id}/start")
def start_live_quiz(quiz_id: str, current_user: dict = Depends(require_role(["Faculty"]))):
    """Teacher starts the live quiz, generating a 6-digit PIN and notifying students."""
    with db.lock:
        quiz = db.live_quizzes.get(quiz_id)
        if not quiz:
            raise HTTPException(status_code=404, detail="Quiz not found")
        if quiz.get("teacher_id") != current_user["id"]:
            raise HTTPException(status_code=403, detail="Only the quiz creator can start it.")

        # Generate unique 6-digit PIN
        pin = f"{random.randint(100000, 999999)}"
        quiz["pin"] = pin
        quiz["status"] = "active"
        quiz["started_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()

        # Notify enrolled students in that section
        section = quiz.get("section", "A")
        enrolled_students = [
            uid for uid, u in db.users.items()
            if u.get("role") == "Student" and u.get("section", "").upper() == section.upper() and u.get("is_active", True)
        ]
        if enrolled_students:
            create_notification(
                user_ids=enrolled_students,
                type="quiz",
                title=f"Live Quiz Active: {quiz['title']}",
                message=f"Live PIN: {pin} is now open for {quiz['time_limit_minutes']} minutes. Join the quiz session now.",
                link="/student/live-quiz"
            )

        db.log_audit("LIVE_QUIZ_STARTED", current_user["id"], details=f"Started live quiz {quiz_id} with PIN {pin}")
        return {"success": True, "pin": pin, "status": "active"}

@router.post("/{quiz_id}/end")
def end_live_quiz(quiz_id: str, current_user: dict = Depends(require_role(["Faculty"]))):
    """Teacher ends the quiz. The PIN is invalidated to prevent reuse."""
    with db.lock:
        quiz = db.live_quizzes.get(quiz_id)
        if not quiz:
            raise HTTPException(status_code=404, detail="Quiz not found")
        if quiz.get("teacher_id") != current_user["id"]:
            raise HTTPException(status_code=403, detail="Only the quiz creator can end it.")

        quiz["status"] = "ended"
        quiz["pin"] = None  # Prevents PIN reuse after quiz ends
        quiz["ended_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()

        db.log_audit("LIVE_QUIZ_ENDED", current_user["id"], details=f"Ended live quiz {quiz_id}")
        return {"success": True, "status": "ended"}

@router.post("/join")
def student_join_quiz(req: JoinQuizRequest, current_user: dict = Depends(require_role(["Student"]))):
    """Student joins live quiz with 6-digit PIN. Validates section and active status."""
    pin_clean = req.pin.strip()
    student_id = current_user["id"]
    student_section = current_user.get("section", "A").upper()

    with db.lock:
        target_quiz = None
        for q in db.live_quizzes.values():
            if q.get("status") == "active" and q.get("pin") == pin_clean:
                target_quiz = q
                break

        if not target_quiz:
            raise HTTPException(status_code=404, detail="Invalid PIN or quiz session has already ended.")

        # Class/section verification
        if target_quiz.get("section", "").upper() != student_section:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied: This quiz is designated for Section {target_quiz.get('section')}. You are registered in Section {student_section}."
            )

        # One attempt enforcement
        if student_id in target_quiz.get("submissions", {}):
            raise HTTPException(status_code=400, detail="You have already submitted an attempt for this quiz.")

        # Record join time
        now = datetime.datetime.now(datetime.timezone.utc)
        target_quiz["participants"][student_id] = now.isoformat()

        # Sanitize questions (hide correct answers)
        safe_questions = [
            {
                "id": q["id"],
                "question": q["question"],
                "options": q["options"]
            }
            for q in target_quiz["questions"]
        ]

        return {
            "quiz_id": target_quiz["id"],
            "title": target_quiz["title"],
            "subject_code": target_quiz["subject_code"],
            "time_limit_minutes": target_quiz["time_limit_minutes"],
            "questions": safe_questions,
            "joined_at": now.isoformat()
        }

@router.post("/{quiz_id}/submit")
def submit_live_quiz(quiz_id: str, req: SubmitQuizRequest, current_user: dict = Depends(require_role(["Student"]))):
    """
    Student submits answers. Server enforces time limit (rejects late submissions),
    auto-grades MCQs, and logs to academic performance record.
    """
    student_id = current_user["id"]
    now = datetime.datetime.now(datetime.timezone.utc)

    with db.lock:
        quiz = db.live_quizzes.get(quiz_id)
        if not quiz:
            raise HTTPException(status_code=404, detail="Quiz not found")

        if quiz.get("status") != "active":
            raise HTTPException(status_code=400, detail="Quiz is not currently active.")

        if student_id in quiz.get("submissions", {}):
            raise HTTPException(status_code=400, detail="Attempt already recorded for this student.")

        # Time limit enforcement
        joined_at_str = quiz["participants"].get(student_id)
        if not joined_at_str:
            joined_at_str = req.client_started_at

        try:
            start_time = datetime.datetime.fromisoformat(joined_at_str)
            elapsed_seconds = (now - start_time).total_seconds()
            allowed_seconds = quiz.get("time_limit_minutes", 15) * 60 + 35  # 35-sec network buffer
            if elapsed_seconds > allowed_seconds:
                # Time limit exceeded
                raise HTTPException(status_code=400, detail="Submission rejected: Time limit has expired.")
        except HTTPException:
            raise
        except Exception:
            elapsed_seconds = quiz.get("time_limit_minutes", 15) * 60

        # Auto-grade
        correct_count = 0
        questions = quiz.get("questions", [])
        total = len(questions)

        for q in questions:
            chosen = req.answers.get(q["id"])
            if chosen is not None and chosen == q.get("correct_option"):
                correct_count += 1

        pct = round((correct_count / total * 100.0) if total > 0 else 0.0, 1)

        submission_record = {
            "student_id": student_id,
            "student_name": current_user["name"],
            "roll_no": current_user.get("roll_no", student_id),
            "score": correct_count,
            "total_questions": total,
            "percentage": pct,
            "time_taken_seconds": int(elapsed_seconds),
            "submitted_at": now.isoformat(),
            "answers": req.answers
        }

        quiz["submissions"][student_id] = submission_record

        # Save to student's academic milestone record
        db.add_milestone(
            student_id=student_id,
            title=f"Live Assessment: {quiz['title']}",
            details=f"Scored {correct_count}/{total} ({pct}%) in {quiz['subject_code']} live class quiz."
        )

        return {
            "success": True,
            "score": correct_count,
            "total_questions": total,
            "percentage": pct
        }

@router.get("/{quiz_id}/live")
def get_live_quiz_view(quiz_id: str, current_user: dict = Depends(require_role(["Faculty", "Admin"]))):
    """
    Teacher live view:
    - Joined count and submitted count
    - Class average
    - Leaderboard
    - Per-question accuracy breakdown
    """
    with db.lock:
        quiz = db.live_quizzes.get(quiz_id)
        if not quiz:
            raise HTTPException(status_code=404, detail="Quiz not found")

        joined_count = len(quiz.get("participants", {}))
        submissions = list(quiz.get("submissions", {}).values())
        submitted_count = len(submissions)

        # Class average
        avg_score = round(sum(s["score"] for s in submissions) / submitted_count, 1) if submitted_count > 0 else 0.0
        avg_pct = round(sum(s["percentage"] for s in submissions) / submitted_count, 1) if submitted_count > 0 else 0.0

        # Leaderboard: sorted by score desc, then time_taken asc
        leaderboard = sorted(submissions, key=lambda s: (-s["score"], s["time_taken_seconds"]))

        # Per-question accuracy
        question_stats = []
        for q in quiz.get("questions", []):
            correct_answers = sum(1 for s in submissions if s["answers"].get(q["id"]) == q.get("correct_option"))
            acc_pct = round((correct_answers / submitted_count * 100.0) if submitted_count > 0 else 0.0, 1)
            question_stats.append({
                "id": q["id"],
                "question": q["question"],
                "correct_option": q.get("correct_option"),
                "options": q.get("options"),
                "correct_count": correct_answers,
                "accuracy_percentage": acc_pct
            })

        return {
            "quiz_id": quiz["id"],
            "title": quiz["title"],
            "subject_code": quiz["subject_code"],
            "status": quiz["status"],
            "pin": quiz.get("pin"),
            "joined_count": joined_count,
            "submitted_count": submitted_count,
            "class_average_score": avg_score,
            "class_average_pct": avg_pct,
            "leaderboard": leaderboard,
            "question_stats": question_stats
        }

@router.get("/{quiz_id}/result")
def get_quiz_student_result(quiz_id: str, current_user: dict = Depends(require_role(["Student"]))):
    """Students see their score and the questions with correct answers after completion."""
    student_id = current_user["id"]
    with db.lock:
        quiz = db.live_quizzes.get(quiz_id)
        if not quiz:
            raise HTTPException(status_code=404, detail="Quiz not found")

        submission = quiz.get("submissions", {}).get(student_id)
        if not submission:
            raise HTTPException(status_code=404, detail="No submission record found for this student.")

        # Show questions with chosen answer and correct answer
        review_questions = []
        for q in quiz.get("questions", []):
            chosen = submission["answers"].get(q["id"])
            review_questions.append({
                "id": q["id"],
                "question": q["question"],
                "options": q["options"],
                "chosen_option": chosen,
                "correct_option": q.get("correct_option"),
                "is_correct": chosen == q.get("correct_option")
            })

        return {
            "quiz_id": quiz["id"],
            "title": quiz["title"],
            "subject_code": quiz["subject_code"],
            "score": submission["score"],
            "total": submission["total_questions"],
            "percentage": submission["percentage"],
            "time_taken_seconds": submission["time_taken_seconds"],
            "submitted_at": submission["submitted_at"],
            "questions": review_questions
        }
