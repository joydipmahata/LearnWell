from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from app.routes.auth_routes import require_role
from app.assistant import (
    generate_pending_assignments_summary,
    generate_student_attention_summary,
    generate_weekly_attention_summary
)

router = APIRouter(prefix="/assistant", tags=["Mentor Assistant"], dependencies=[Depends(require_role(["Faculty"]))])

@router.get("/pending-assignments")
def get_pending_assignments_summary(current_user = Depends(require_role(["Faculty"]))):
    return generate_pending_assignments_summary(current_user["id"])

@router.get("/student-attention")
def get_student_attention_summary(student_id: str = Query(...), current_user = Depends(require_role(["Faculty"]))):
    res = generate_student_attention_summary(student_id, current_user["id"])
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res

@router.get("/weekly-attention")
def get_weekly_attention_summary(current_user = Depends(require_role(["Faculty"]))):
    return generate_weekly_attention_summary(current_user["id"])
