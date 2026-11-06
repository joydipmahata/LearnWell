import datetime
from typing import Dict, Any, List
from app.config import settings
from app.store import db
from app.risk_engine import calculate_student_risk

def generate_pending_assignments_summary(mentor_id: str) -> Dict[str, Any]:
    with db.lock:
        mentees = [
            s for s in db.users.values()
            if s.get("role") == "Student" and s.get("is_active", True) and s.get("mentor_id") == mentor_id
        ]
        mentee_ids = {s["id"] for s in mentees}
        submissions = [s for s in db.assignment_submissions if s.get("student_id") in mentee_ids]
        
        missed = [s for s in submissions if s["status"] in ("missed", "overdue")]
        late = [s for s in submissions if s["status"] == "late"]
        pending = [s for s in submissions if s["status"] == "pending"]

        now_str = datetime.datetime.now(datetime.timezone.utc).strftime("%d %b %Y")
        
        # Build cited facts
        facts = []
        if missed:
            # Group by student
            stu_missed = {}
            for m in missed:
                stu_missed.setdefault(m["student_name"], []).append(m["assignment_title"])
            for st_name, asgns in stu_missed.items():
                facts.append(f"• {st_name}: {len(asgns)} overdue/missed assignment(s) ({', '.join(asgns[:2])})")
        else:
            facts.append("• No students have overdue submissions at this time.")

        summary_text = (
            f"### Assignment Submission Status Summary\n\n"
            f"Across your mentee cohort ({len(mentees)} students):\n"
            f"- **Missed / Overdue:** {len(missed)} submission(s)\n"
            f"- **Late Submissions:** {len(late)} submission(s)\n"
            f"- **Pending (Upcoming):** {len(pending)} active submission(s)\n\n"
            f"**Specific Overdue Submissions:**\n"
            + "\n".join(facts) +
            f"\n\n**Actionable Suggestion:** Prioritize scheduling brief check-ins with students having 2+ missed submissions before upcoming internal deadlines."
        )

        return {
            "query_type": "pending_assignments",
            "summary": summary_text,
            "disclaimer": f"AI-generated summary based on data as of {now_str}. Mentor decides."
        }

def generate_student_attention_summary(student_id: str, mentor_id: str) -> Dict[str, Any]:
    with db.lock:
        student = db.users.get(student_id)
        if not student or student.get("mentor_id") != mentor_id:
            return {"error": "Student not found or not in your mentee list"}

        risk = calculate_student_risk(student_id, db)
        now_str = datetime.datetime.now(datetime.timezone.utc).strftime("%d %b %Y")

        metrics = risk.get("metrics", {})
        att_pct = metrics.get("attendance_overall", 0.0)
        att_trend = metrics.get("attendance_trend_delta", 0.0)
        avg_marks = metrics.get("average_marks", 0.0)
        missed = metrics.get("missed_submissions", 0)

        # Subject breakdown
        sub_records = [rec for key, rec in db.attendance_records.items() if key.startswith(f"{student_id}:")]
        critical_subs = [r for r in sub_records if r.get("percentage", 100) < 75.0]

        summary_text = (
            f"### Individual Academic Risk Profile: {student['name']} ({student_id})\n\n"
            f"**Current Status:** Band **{risk.get('effective_band')}** | Risk Score: **{risk.get('weighted_score')}/100** | Direction: **{risk.get('trend_direction').capitalize()}**\n\n"
            f"**Observed Academic Indicators:**\n"
            f"1. **Attendance:** Overall attendance is **{att_pct:.1f}%** ({att_trend:+0.1f}% 30-day shift). "
            f"{len(critical_subs)} course(s) are currently under 75%.\n"
            f"2. **Assessment Scores:** Internal exam mean score is **{avg_marks:.1f}%**.\n"
            f"3. **Coursework Deliverables:** {missed} assignment(s) missed or overdue.\n\n"
            f"**Key Contributing Factors:**\n"
            f"• {risk.get('plain_language_explanation')}\n\n"
            f"**Suggested Next Steps:**\n"
            f"- Verify flag status (Expires in {risk.get('flag', {}).get('days_remaining', 14)} days).\n"
            f"- Consider initiating '{'Attendance Counselling' if att_pct < 75 else 'Remedial / Peer Tutoring'}' intervention."
        )

        return {
            "query_type": "student_attention",
            "student_id": student_id,
            "summary": summary_text,
            "disclaimer": f"AI-generated summary based on data as of {now_str}. Mentor decides."
        }

def generate_weekly_attention_summary(mentor_id: str) -> Dict[str, Any]:
    with db.lock:
        mentees = [
            s for s in db.users.values()
            if s.get("role") == "Student" and s.get("is_active", True) and s.get("mentor_id") == mentor_id
        ]
        now_str = datetime.datetime.now(datetime.timezone.utc).strftime("%d %b %Y")

        red_students = []
        amber_declining = []
        
        for s in mentees:
            risk = calculate_student_risk(s["id"], db)
            band = risk.get("effective_band")
            trend = risk.get("trend_direction")
            if band == "Red":
                red_students.append((s["name"], risk["weighted_score"], risk["top_factors"][0]["detail"]))
            elif band == "Amber" and trend == "declining":
                amber_declining.append((s["name"], risk["weighted_score"], risk["top_factors"][0]["detail"]))

        summary_text = (
            f"### Weekly Attention Priority List\n\n"
            f"**Immediate Priority (Red Band):**\n"
        )
        if red_students:
            for name, score, reason in red_students:
                summary_text += f"- **{name}** (Risk Score {score}/100): {reason}\n"
        else:
            summary_text += "- No students currently in Red band.\n"

        summary_text += f"\n**Secondary Focus (Amber Band - Declining Trend):**\n"
        if amber_declining:
            for name, score, reason in amber_declining:
                summary_text += f"- **{name}** (Risk Score {score}/100): {reason}\n"
        else:
            summary_text += "- No amber band students showing declining trends this week.\n"

        summary_text += (
            f"\n**Recommended Action Plan:**\n"
            f"1. Conduct priority 1-on-1 check-ins with Red band students within 48 hours.\n"
            f"2. Check pending intervention tasks and track sign-offs before the 14-day flag expiry.\n"
        )

        return {
            "query_type": "weekly_attention",
            "summary": summary_text,
            "disclaimer": f"AI-generated summary based on data as of {now_str}. Mentor decides."
        }
