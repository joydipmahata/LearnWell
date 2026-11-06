import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from app.routes.auth_routes import get_current_user_from_token, require_role
from app.store import db
from app.risk_engine import calculate_student_risk

router = APIRouter(prefix="/risk", tags=["Risk & What-If Planner"])

class SimulateRecoveryRequest(BaseModel):
    student_id: str
    attendance_pct: Optional[float] = Field(None, ge=40.0, le=100.0)
    expected_marks: Optional[float] = Field(None, ge=20.0, le=100.0)
    mentor_sessions: Optional[int] = Field(0, ge=0, le=10)

@router.post("/simulate")
def simulate_risk_recovery(req: SimulateRecoveryRequest, current_user: dict = Depends(get_current_user_from_token)):
    """
    What-If Recovery Planner:
    Re-runs the institutional risk engine with overridden values without saving them.
    Returns: new risk band, score change, concrete targets needed, factor impacts, and plain-language explanation.
    """
    role = current_user.get("role")
    user_id = current_user.get("id")
    student_id = req.student_id

    # RBAC check
    with db.lock:
        student = db.users.get(student_id)
        if not student or student.get("role") != "Student":
            raise HTTPException(status_code=404, detail="Student not found")

        if role == "Student" and student_id != user_id:
            raise HTTPException(status_code=403, detail="Students can only simulate their own risk recovery.")
        if role == "Faculty" and student.get("mentor_id") != user_id:
            raise HTTPException(status_code=403, detail="Mentors can only simulate risk for their assigned mentees.")

        # 1. Baseline risk calculation
        base_risk = calculate_student_risk(student_id, db)
        base_score = base_risk.get("weighted_score", 50.0)
        base_band = base_risk.get("effective_band", "Amber")

        # 2. Extract baseline metrics
        student_att = [r for k, r in db.attendance_records.items() if k.startswith(f"{student_id}:")]
        tot_held = sum(r.get("total_classes", 0) for r in student_att)
        tot_att = sum(r.get("attended_classes", 0) for r in student_att)
        curr_att_pct = (tot_att / tot_held * 100.0) if tot_held > 0 else 85.0

        stu_marks = [m for m in db.exam_results if m.get("student_id") == student_id]
        curr_marks_pct = (sum(m.get("score_pct", 75.0) for m in stu_marks) / len(stu_marks)) if stu_marks else 72.0

        # Overrides
        sim_att_pct = req.attendance_pct if req.attendance_pct is not None else curr_att_pct
        sim_marks_pct = req.expected_marks if req.expected_marks is not None else curr_marks_pct
        sim_sessions = req.mentor_sessions or 0

        # Recalculate component risk scores based on formulas from risk_engine.py
        # 1. Attendance Level (30%)
        if sim_att_pct >= 85.0:
            r_att = max(0.0, (100.0 - sim_att_pct) * 0.5)
        elif sim_att_pct >= 75.0:
            r_att = 15.0 + (85.0 - sim_att_pct) * 2.0
        elif sim_att_pct >= 60.0:
            r_att = 35.0 + (75.0 - sim_att_pct) * 2.5
        else:
            r_att = min(100.0, 72.5 + (60.0 - sim_att_pct) * 1.5)

        # 2. Attendance Trend (20%) - assume positive trend if attendance improving
        att_diff = sim_att_pct - curr_att_pct
        if att_diff >= 2.0:
            r_trend = max(0.0, 20.0 - att_diff * 1.5)
        elif att_diff >= -3.0:
            r_trend = 25.0
        else:
            r_trend = min(100.0, 50.0 + abs(att_diff) * 2.0)

        # 3. Marks Level (25%)
        if sim_marks_pct >= 75.0:
            r_marks = max(0.0, (100.0 - sim_marks_pct) * 0.6)
        elif sim_marks_pct >= 60.0:
            r_marks = 20.0 + (75.0 - sim_marks_pct) * 2.0
        elif sim_marks_pct >= 45.0:
            r_marks = 50.0 + (60.0 - sim_marks_pct) * 2.0
        else:
            r_marks = min(100.0, 80.0 + (45.0 - sim_marks_pct) * 1.5)

        # 4. Marks Trend (15%)
        marks_diff = sim_marks_pct - curr_marks_pct
        if marks_diff >= 3.0:
            r_marks_trend = max(0.0, 15.0 - marks_diff * 1.5)
        elif marks_diff >= -3.0:
            r_marks_trend = 25.0
        else:
            r_marks_trend = min(100.0, 50.0 + abs(marks_diff) * 2.5)

        # 5. Missed Work / Engagement (10%)
        # Mentor sessions reduce engagement risk
        r_missed = max(0.0, 30.0 - (sim_sessions * 10.0))

        # Weighted calculation
        sim_weighted = round(
            (0.30 * r_att) +
            (0.20 * r_trend) +
            (0.25 * r_marks) +
            (0.15 * r_marks_trend) +
            (0.10 * r_missed),
            1
        )
        sim_weighted = max(0.0, min(100.0, sim_weighted))

        if sim_weighted < 40.0:
            sim_band = "Green"
        elif sim_weighted < 70.0:
            sim_band = "Amber"
        else:
            sim_band = "Red"

        score_change = round(sim_weighted - base_score, 1)

        # Plain language explanation
        explanations = []
        if sim_att_pct > curr_att_pct:
            att_pt_gain = round(abs(score_change * 0.5), 1)
            explanations.append(f"Reaching {sim_att_pct:.0f}% attendance lowers your academic risk by approximately {att_pt_gain} points.")
        if sim_marks_pct > curr_marks_pct:
            explanations.append(f"Achieving {sim_marks_pct:.0f}% in your upcoming exams improves assessment standing by {marks_diff:+.1f}%.")
        if sim_sessions > 0:
            explanations.append(f"Attending {sim_sessions} mentor review session(s) mitigates coursework risk by {(sim_sessions * 3.0):.1f} points.")

        if not explanations:
            explanation_summary = f"Current projection maintains your risk score at {sim_weighted} in the {sim_band} band."
        else:
            explanation_summary = " ".join(explanations)

        # Concrete target calculation:
        # How many of next 10 classes to attend to reach 75% or Green
        classes_needed = max(0, min(10, int(round((0.75 * (tot_held + 10) - tot_att)))))
        if curr_att_pct < 75.0:
            concrete_target = f"Attend at least {max(1, min(10, classes_needed))} of the next 10 upcoming classes to restore your attendance to above 75%."
        elif base_band == "Red":
            concrete_target = "Attend the next 9 of 10 classes and achieve ≥65% in the upcoming mid-term to transition into the Amber band."
        elif base_band == "Amber":
            concrete_target = "Maintain attendance above 85% and achieve ≥75% in the next assessment to transition into the Green band."
        else:
            concrete_target = "Maintain steady attendance (≥85%) to stay in the Green commended tier."

        return {
            "student_id": student_id,
            "baseline": {
                "score": base_score,
                "band": base_band,
                "attendance_pct": round(curr_att_pct, 1),
                "marks_pct": round(curr_marks_pct, 1)
            },
            "simulated": {
                "score": sim_weighted,
                "band": sim_band,
                "score_change": score_change,
                "attendance_pct": round(sim_att_pct, 1),
                "marks_pct": round(sim_marks_pct, 1),
                "mentor_sessions": sim_sessions
            },
            "plain_language_explanation": explanation_summary,
            "concrete_target": concrete_target
        }
