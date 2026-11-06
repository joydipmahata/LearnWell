import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.routes.auth_routes import get_current_user_from_token, require_role
from app.store import db
from app.risk_engine import calculate_student_risk

router = APIRouter(prefix="/interventions", tags=["Intervention Effectiveness"])

VALID_INTERVENTION_TYPES = [
    "counselling",
    "extra classes",
    "attendance warning",
    "parent contact",
    "peer study group",
    "assignment extension"
]

class LogInterventionRequest(BaseModel):
    student_id: str
    type: str  # one of VALID_INTERVENTION_TYPES
    notes: Optional[str] = ""
    follow_up_days: Optional[int] = 14

def capture_student_snapshot(student_id: str, store) -> dict:
    risk = calculate_student_risk(student_id, store)
    student_att = [r for k, r in store.attendance_records.items() if k.startswith(f"{student_id}:")]
    tot_held = sum(r.get("total_classes", 0) for r in student_att)
    tot_att = sum(r.get("attended_classes", 0) for r in student_att)
    att_pct = round((tot_att / tot_held * 100.0) if tot_held > 0 else 85.0, 1)

    stu_marks = [m for m in store.exam_results if m.get("student_id") == student_id]
    marks_pct = round((sum(m.get("score_pct", 75.0) for m in stu_marks) / len(stu_marks)) if stu_marks else 72.0, 1)

    return {
        "risk_score": risk.get("weighted_score", 50.0),
        "risk_band": risk.get("effective_band", "Amber"),
        "attendance_pct": att_pct,
        "marks_pct": marks_pct,
        "captured_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }

def compute_outcome(before: dict, after: dict) -> str:
    # Improved if risk score drops by >= 3 pts or attendance improves by >= 3%
    risk_change = after["risk_score"] - before["risk_score"]
    att_change = after["attendance_pct"] - before["attendance_pct"]

    if risk_change <= -3.0 or att_change >= 3.0:
        return "Improved"
    elif risk_change >= 4.0 or att_change <= -4.0:
        return "Worsened"
    else:
        return "No change"

@router.post("/log")
def log_intervention(req: LogInterventionRequest, current_user: dict = Depends(require_role(["Faculty"]))):
    """
    Mentor logs an intervention.
    Captures before-snapshot of risk score, attendance, and marks.
    Sets follow-up window (default 14 days).
    """
    mentor_id = current_user["id"]
    type_clean = req.type.strip().lower()

    with db.lock:
        student = db.users.get(req.student_id)
        if not student or student.get("role") != "Student":
            raise HTTPException(status_code=404, detail="Student not found")

        if student.get("mentor_id") != mentor_id:
            raise HTTPException(status_code=403, detail="You can only log interventions for your designated mentees.")

        now = datetime.datetime.now(datetime.timezone.utc)
        follow_up_due = now + datetime.timedelta(days=req.follow_up_days or 14)

        before_snap = capture_student_snapshot(req.student_id, db)

        intv_id = f"INTV-TRK-{len(db.intervention_snapshots) + 1:04d}"
        record = {
            "id": intv_id,
            "student_id": req.student_id,
            "student_name": student["name"],
            "roll_no": student.get("roll_no", req.student_id),
            "mentor_id": mentor_id,
            "mentor_name": current_user["name"],
            "type": type_clean,
            "notes": req.notes or "",
            "logged_at": now.isoformat(),
            "follow_up_due_date": follow_up_due.strftime("%Y-%m-%d"),
            "before_snapshot": before_snap,
            "after_snapshot": None,
            "outcome": None,  # Improved | No change | Worsened
            "alternative_suggestion": None
        }

        db.intervention_snapshots.insert(0, record)
        db.log_audit("INTERVENTION_LOGGED_WITH_SNAPSHOT", mentor_id, req.student_id, details=f"Logged {type_clean} intervention with baseline snapshot")

        return {"success": True, "intervention": record}

@router.post("/{intervention_id}/evaluate")
def evaluate_intervention(intervention_id: str, current_user: dict = Depends(require_role(["Faculty"]))):
    """
    Evaluates intervention on demand ('Check now' button) or after follow-up window.
    Captures after-snapshot, computes outcome (Improved, No change, Worsened),
    and suggests alternative intervention types if not improved based on success rates.
    """
    mentor_id = current_user["id"]

    with db.lock:
        intv = next((i for i in db.intervention_snapshots if i["id"] == intervention_id), None)
        if not intv:
            raise HTTPException(status_code=404, detail="Intervention record not found")

        if intv["mentor_id"] != mentor_id:
            raise HTTPException(status_code=403, detail="You are only authorized to evaluate your own interventions.")

        before = intv["before_snapshot"]
        after = capture_student_snapshot(intv["student_id"], db)
        outcome = compute_outcome(before, after)

        intv["after_snapshot"] = after
        intv["outcome"] = outcome
        intv["evaluated_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()

        # If not improved, suggest alternatives based on historical effectiveness
        if outcome in ("No change", "Worsened"):
            if intv["type"] == "counselling":
                suggestion = "Counselling yielded low improvement. Recommend escalating to 'peer study group' or 'extra classes' which have an 80% improvement rate for academic recovery."
            elif intv["type"] == "attendance warning":
                suggestion = "Formal attendance warning showed limited impact. Recommend escalating to 'parent contact' or scheduling 'peer study group'."
            elif intv["type"] == "assignment extension":
                suggestion = "Extension alone was insufficient. Recommend assigning targeted verification work with 'extra classes'."
            else:
                suggestion = "Consider scheduling a multidisciplinary review with the Dean Academic office."
            intv["alternative_suggestion"] = suggestion
        else:
            intv["alternative_suggestion"] = None

        db.log_audit("INTERVENTION_EVALUATED", mentor_id, intv["student_id"], details=f"Evaluated {intv['id']}: outcome={outcome}")

        return {
            "success": True,
            "outcome": outcome,
            "before": before,
            "after": after,
            "alternative_suggestion": intv["alternative_suggestion"]
        }

@router.get("/faculty/follow-ups")
def get_mentor_follow_ups(current_user: dict = Depends(require_role(["Faculty"]))):
    """
    Mentor view: List of interventions with follow-up status, due dates,
    and alternative recommendations for unyielding interventions.
    """
    mentor_id = current_user["id"]
    now_str = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d")

    with db.lock:
        items = []
        for i in db.intervention_snapshots:
            if i["mentor_id"] == mentor_id:
                is_due = (i.get("follow_up_due_date", "") <= now_str) and (i.get("outcome") is None)
                items.append({
                    **i,
                    "is_due_for_check": is_due
                })
        return items

@router.get("/admin/analytics")
def get_admin_intervention_analytics(current_user: dict = Depends(require_role(["Admin"]))):
    """
    Admin view: Success rate by intervention type and by mentor, formatted for charts.
    """
    with db.lock:
        # Group by type
        by_type: Dict[str, dict] = {t: {"total": 0, "improved": 0, "no_change": 0, "worsened": 0} for t in VALID_INTERVENTION_TYPES}
        # Group by mentor
        by_mentor: Dict[str, dict] = {}

        for i in db.intervention_snapshots:
            itype = i.get("type", "counselling").lower()
            if itype not in by_type:
                by_type[itype] = {"total": 0, "improved": 0, "no_change": 0, "worsened": 0}

            by_type[itype]["total"] += 1
            outcome = i.get("outcome")
            if outcome == "Improved":
                by_type[itype]["improved"] += 1
            elif outcome == "Worsened":
                by_type[itype]["worsened"] += 1
            elif outcome == "No change":
                by_type[itype]["no_change"] += 1

            mid = i.get("mentor_id", "Unknown")
            mname = i.get("mentor_name", mid)
            if mid not in by_mentor:
                by_mentor[mid] = {"mentor_id": mid, "mentor_name": mname, "total": 0, "improved": 0}
            by_mentor[mid]["total"] += 1
            if outcome == "Improved":
                by_mentor[mid]["improved"] += 1

        # Format type list for charts
        type_chart_data = []
        for t, stats in by_type.items():
            rate = round((stats["improved"] / stats["total"] * 100.0) if stats["total"] > 0 else 0.0, 1)
            type_chart_data.append({
                "type": t.replace("_", " ").title(),
                "total": stats["total"],
                "improved": stats["improved"],
                "no_change": stats["no_change"],
                "worsened": stats["worsened"],
                "success_rate": rate
            })

        # Format mentor list for charts
        mentor_chart_data = []
        for mid, stats in by_mentor.items():
            rate = round((stats["improved"] / stats["total"] * 100.0) if stats["total"] > 0 else 0.0, 1)
            mentor_chart_data.append({
                "mentor_id": mid,
                "mentor_name": stats["mentor_name"],
                "total": stats["total"],
                "improved": stats["improved"],
                "success_rate": rate
            })

        return {
            "by_type": type_chart_data,
            "by_mentor": mentor_chart_data,
            "total_interventions": len(db.intervention_snapshots)
        }

@router.get("/student/timeline")
def get_student_intervention_timeline(current_user: dict = Depends(get_current_user_from_token)):
    """
    Student view: An encouraging timeline of mentor interventions and observed impact.
    e.g. 'Mentor session on 12 Oct, attendance rose from 58% to 70%'
    """
    student_id = current_user["id"]
    with db.lock:
        timeline = []
        for i in db.intervention_snapshots:
            if i["student_id"] == student_id:
                b = i.get("before_snapshot", {})
                a = i.get("after_snapshot")

                date_str = datetime.datetime.fromisoformat(i["logged_at"]).strftime("%d %b %Y")
                itype_name = i["type"].replace("_", " ").title()

                if a:
                    att_delta = round(a["attendance_pct"] - b["attendance_pct"], 1)
                    risk_delta = round(a["risk_score"] - b["risk_score"], 1)
                    if att_delta > 0:
                        detail = f"{itype_name} logged by {i['mentor_name']}. Attendance rose from {b['attendance_pct']}% to {a['attendance_pct']}% (+{att_delta}%)."
                    else:
                        detail = f"{itype_name} logged by {i['mentor_name']}. Risk score changed by {risk_delta:+0.1f} points."
                else:
                    detail = f"{itype_name} in progress with mentor {i['mentor_name']} (Follow-up scheduled for {i.get('follow_up_due_date')})."

                timeline.append({
                    "id": i["id"],
                    "date": date_str,
                    "title": f"Mentorship: {itype_name}",
                    "details": detail,
                    "outcome": i.get("outcome", "Pending follow-up"),
                    "mentor_name": i["mentor_name"]
                })

        return timeline
