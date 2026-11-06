import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional, List
from app.routes.auth_routes import get_current_user_from_token, require_role
from app.store import db

router = APIRouter(prefix="/questions", tags=["Question Bank"])
router_alias = APIRouter(prefix="/question-bank", tags=["Question Bank"])

VALID_EXAM_TYPES = {"IA1", "IA2", "End-sem"}

class CreateQuestionRequest(BaseModel):
    subject_code: str
    year: int
    semester: int = 4
    exam_type: str  # IA1, IA2, End-sem
    unit: str       # e.g. Unit 1, Unit 2
    topic: str
    marks: int
    question_text: str
    attachment_url: Optional[str] = ""
    attachment_name: Optional[str] = ""

@router.get("")
def list_questions(
    subject_code: Optional[str] = None,
    year: Optional[int] = None,
    exam_type: Optional[str] = None,
    unit: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user_from_token)
):
    """
    Students, Faculty, and Admin can browse and search previous-year questions.
    Read-only for students.
    """
    with db.lock:
        results = list(db.question_bank)
        if subject_code:
            results = [q for q in results if q.get("subject_code", "").upper() == subject_code.upper()]
        if year:
            results = [q for q in results if q.get("year") == year]
        if exam_type:
            results = [q for q in results if q.get("exam_type", "").upper() == exam_type.upper()]
        if unit:
            results = [q for q in results if unit.lower() in q.get("unit", "").lower()]
        if search:
            term = search.lower().strip()
            results = [
                q for q in results
                if term in q.get("question_text", "").lower()
                or term in q.get("topic", "").lower()
                or term in q.get("subject_code", "").lower()
                or term in q.get("subject_name", "").lower()
            ]

        results.sort(key=lambda x: (x.get("year", 0), x.get("created_at", "")), reverse=True)
        return results

@router.post("")
def add_question(req: CreateQuestionRequest, current_user: dict = Depends(require_role(["Admin", "Faculty"]))):
    """Admin and Faculty can upload previous-year questions."""
    exam_clean = req.exam_type.strip()
    if exam_clean not in VALID_EXAM_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid exam type: {req.exam_type}. Must be one of: {', '.join(sorted(VALID_EXAM_TYPES))}")

    with db.lock:
        sub = db.subjects.get(req.subject_code.upper())
        sub_name = sub["name"] if sub else req.subject_code.upper()

        qid = f"QB-{len(db.question_bank) + 1:04d}"
        entry = {
            "id": qid,
            "subject_code": req.subject_code.strip().upper(),
            "subject_name": sub_name,
            "year": req.year,
            "semester": req.semester,
            "exam_type": exam_clean,
            "unit": req.unit.strip(),
            "topic": req.topic.strip(),
            "marks": req.marks,
            "question_text": req.question_text.strip(),
            "attachment_url": req.attachment_url or "",
            "attachment_name": req.attachment_name or "",
            "uploaded_by": current_user["id"],
            "uploader_name": current_user["name"],
            "uploader_role": current_user["role"],
            "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }
        db.question_bank.append(entry)
        db.log_audit("QUESTION_BANK_ADDED", current_user["id"], details=f"Added question {qid} for {entry['subject_code']} ({exam_clean})")
        return {"success": True, "question": entry}

@router.put("/{question_id}")
def update_question(question_id: str, req: CreateQuestionRequest, current_user: dict = Depends(require_role(["Admin", "Faculty"]))):
    """Admin can edit anything; Faculty can edit only their own uploads."""
    role = current_user.get("role")
    user_id = current_user.get("id")

    with db.lock:
        target = next((q for q in db.question_bank if q.get("id") == question_id), None)
        if not target:
            raise HTTPException(status_code=404, detail="Question not found")

        # Faculty authorization check
        if role == "Faculty" and target.get("uploaded_by") != user_id:
            raise HTTPException(status_code=403, detail="Access denied: Faculty can only edit questions they uploaded.")

        exam_clean = req.exam_type.strip()
        sub = db.subjects.get(req.subject_code.upper())
        sub_name = sub["name"] if sub else req.subject_code.upper()

        target.update({
            "subject_code": req.subject_code.strip().upper(),
            "subject_name": sub_name,
            "year": req.year,
            "semester": req.semester,
            "exam_type": exam_clean,
            "unit": req.unit.strip(),
            "topic": req.topic.strip(),
            "marks": req.marks,
            "question_text": req.question_text.strip(),
            "attachment_url": req.attachment_url or target.get("attachment_url", ""),
            "attachment_name": req.attachment_name or target.get("attachment_name", "")
        })

        db.log_audit("QUESTION_BANK_UPDATED", user_id, details=f"Updated question {question_id}")
        return {"success": True, "question": target}

@router.delete("/{question_id}")
def delete_question(question_id: str, current_user: dict = Depends(require_role(["Admin", "Faculty"]))):
    """Admin can delete anything; Faculty can delete only their own uploads."""
    role = current_user.get("role")
    user_id = current_user.get("id")

    with db.lock:
        idx = next((i for i, q in enumerate(db.question_bank) if q.get("id") == question_id), -1)
        if idx == -1:
            raise HTTPException(status_code=404, detail="Question not found")

        target = db.question_bank[idx]
        if role == "Faculty" and target.get("uploaded_by") != user_id:
            raise HTTPException(status_code=403, detail="Access denied: Faculty can only delete questions they uploaded.")

        removed = db.question_bank.pop(idx)
        db.log_audit("QUESTION_BANK_DELETED", user_id, details=f"Deleted question {question_id}")
        return {"success": True, "deleted_id": question_id}
