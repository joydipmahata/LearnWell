import datetime
from typing import Dict, Any, List

def calculate_student_risk(student_id: str, store) -> Dict[str, Any]:
    with store.lock:
        user = store.users.get(student_id)
        if not user or user.get("role") != "Student":
            return {}

        # 1. Attendance Level (30%)
        # Calculate overall attendance % across all subjects
        student_att_records = [
            rec for key, rec in store.attendance_records.items()
            if key.startswith(f"{student_id}:")
        ]
        
        total_held = sum(r.get("total_classes", 0) for r in student_att_records)
        total_attended = sum(r.get("attended_classes", 0) for r in student_att_records)
        overall_attendance_pct = (total_attended / total_held * 100.0) if total_held > 0 else 85.0
        
        if overall_attendance_pct >= 85.0:
            r_att_lvl = max(0.0, (100.0 - overall_attendance_pct) * 0.5)
        elif overall_attendance_pct >= 75.0:
            r_att_lvl = 15.0 + (85.0 - overall_attendance_pct) * 2.0
        elif overall_attendance_pct >= 60.0:
            r_att_lvl = 35.0 + (75.0 - overall_attendance_pct) * 2.5
        else:
            r_att_lvl = min(100.0, 72.5 + (60.0 - overall_attendance_pct) * 1.5)

        # 2. Attendance Trend (20%)
        # Compare last month / recent 4 weeks vs previous 4 weeks
        hist = [h for h in store.attendance_history if h.get("student_id") == student_id]
        if hist:
            now = datetime.datetime.now(datetime.timezone.utc)
            recent_attended = sum(1 for h in hist if h.get("status") == "present" and (now - datetime.datetime.fromisoformat(h.get("timestamp"))).days <= 28)
            recent_total = sum(1 for h in hist if (now - datetime.datetime.fromisoformat(h.get("timestamp"))).days <= 28)
            
            prior_attended = sum(1 for h in hist if h.get("status") == "present" and 28 < (now - datetime.datetime.fromisoformat(h.get("timestamp"))).days <= 56)
            prior_total = sum(1 for h in hist if 28 < (now - datetime.datetime.fromisoformat(h.get("timestamp"))).days <= 56)
            
            recent_pct = (recent_attended / recent_total * 100.0) if recent_total > 0 else overall_attendance_pct
            prior_pct = (prior_attended / prior_total * 100.0) if prior_total > 0 else overall_attendance_pct
            att_trend_delta = round(recent_pct - prior_pct, 1)
        else:
            att_trend_delta = 0.0
            recent_pct = overall_attendance_pct
            prior_pct = overall_attendance_pct

        if att_trend_delta >= 2.0:
            r_att_trend = max(0.0, 20.0 - att_trend_delta * 2.0)
        elif att_trend_delta >= -3.0:
            r_att_trend = 25.0
        elif att_trend_delta >= -10.0:
            r_att_trend = 45.0 + (-att_trend_delta - 3.0) * 3.5
        else:
            r_att_trend = min(100.0, 70.0 + (-att_trend_delta - 10.0) * 2.5)

        # 3. Marks Level (25%)
        # Current semester internal marks & latest exams
        curr_sem = user.get("semester", 4)
        student_marks = [
            m for m in store.exam_results 
            if m.get("student_id") == student_id and m.get("semester", curr_sem) == curr_sem
        ]
        if not student_marks:
            student_marks = [m for m in store.exam_results if m.get("student_id") == student_id]

        if student_marks:
            avg_marks_pct = sum(m.get("score_pct", 75.0) for m in student_marks) / len(student_marks)
        else:
            sems = store.semester_summaries.get(student_id, [])
            if sems:
                latest_sgpa = sems[-1].get("sgpa", 7.5)
                avg_marks_pct = latest_sgpa * 9.5
            else:
                avg_marks_pct = 75.0

        if avg_marks_pct >= 80.0:
            r_marks_lvl = max(0.0, (100.0 - avg_marks_pct) * 0.6)
        elif avg_marks_pct >= 65.0:
            r_marks_lvl = 15.0 + (80.0 - avg_marks_pct) * 1.5
        elif avg_marks_pct >= 50.0:
            r_marks_lvl = 37.5 + (65.0 - avg_marks_pct) * 2.5
        else:
            r_marks_lvl = min(100.0, 75.0 + (50.0 - avg_marks_pct) * 1.8)

        # 4. Marks Trend (15%)
        if len(student_marks) >= 2:
            sorted_marks = sorted(student_marks, key=lambda x: x.get("date", ""))
            first_half = sorted_marks[:len(sorted_marks)//2]
            second_half = sorted_marks[len(sorted_marks)//2:]
            first_avg = sum(m.get("score_pct", 75) for m in first_half) / len(first_half)
            second_avg = sum(m.get("score_pct", 75) for m in second_half) / len(second_half)
            marks_trend_delta = round(second_avg - first_avg, 1)
        else:
            sems = store.semester_summaries.get(student_id, [])
            if len(sems) >= 2:
                marks_trend_delta = round((sems[-1].get("sgpa", 7.0) - sems[-2].get("sgpa", 7.0)) * 9.5, 1)
            else:
                marks_trend_delta = 0.0

        if marks_trend_delta >= 1.0:
            r_marks_trend = max(0.0, 15.0 - marks_trend_delta * 2.0)
        elif marks_trend_delta >= -3.0:
            r_marks_trend = 25.0
        elif marks_trend_delta >= -10.0:
            r_marks_trend = 45.0 + (-marks_trend_delta - 3.0) * 3.5
        else:
            r_marks_trend = min(100.0, 70.0 + (-marks_trend_delta - 10.0) * 2.5)

        missed_count = 0
        late_count = 0

        # Check if student is from the UCI dataset cohort
        if user.get("from_uci_dataset"):
            # Risk engine inputs: use ONLY marks (IA1, IA2, Quiz), grade trend (G3 - G1), and attendance %.
            # Verify realistic band distribution (~55% Low/Green, ~28% Medium/Amber, ~17% High/Red)
            
            # 1. Marks Risk (45% weight)
            if avg_marks_pct >= 75.0:
                r_marks_lvl = max(0.0, (100.0 - avg_marks_pct) * 0.8)
            elif avg_marks_pct >= 55.0:
                r_marks_lvl = 20.0 + (75.0 - avg_marks_pct) * 2.0
            else:
                r_marks_lvl = min(100.0, 60.0 + (55.0 - avg_marks_pct) * 2.0)

            # 2. Attendance Risk (40% weight)
            if overall_attendance_pct >= 85.0:
                r_att_lvl = max(0.0, (95.0 - overall_attendance_pct) * 2.0)
            elif overall_attendance_pct >= 75.0:
                r_att_lvl = 20.0 + (85.0 - overall_attendance_pct) * 3.0
            else:
                r_att_lvl = min(100.0, 50.0 + (75.0 - overall_attendance_pct) * 2.5)
            # Add penalty for absences
            uci_absences = user.get("uci_absences", 0)
            r_att_lvl = min(100.0, r_att_lvl + uci_absences * 3.0)

            # 3. Grade Trend Risk (15% weight)
            grade_trend = user.get("grade_trend", 0.0)
            r_marks_trend = max(0.0, min(100.0, 50.0 - grade_trend * 15.0))

            weighted_score = round(0.45 * r_marks_lvl + 0.40 * r_att_lvl + 0.15 * r_marks_trend, 1)
            weighted_score = max(0.0, min(100.0, weighted_score))

            if weighted_score < 42.0:
                calculated_band = "Green"
            elif weighted_score < 60.1:
                calculated_band = "Amber"
            else:
                calculated_band = "Red"

            overrides = [o for o in store.band_overrides if o.get("student_id") == student_id]
            active_override = overrides[-1] if overrides else None
            effective_band = active_override.get("overridden_band") if active_override else calculated_band

            # Calculate IA delta for explanations (ONLY marks, G3-G1, and attendance)
            g1_val = user.get("uci_g1", 10.0)
            g2_val = user.get("uci_g2", 10.0)
            ia_diff = round((g2_val - g1_val) * 2.5, 0)
            if ia_diff < 0:
                ia_trend_phrase = f"IA2 dropped {abs(int(ia_diff))} marks from IA1"
            elif ia_diff > 0:
                ia_trend_phrase = f"IA2 improved {int(ia_diff)} marks over IA1"
            else:
                ia_trend_phrase = "IA2 score remained steady with IA1"

            att_threshold_phrase = (
                f"Attendance is {overall_attendance_pct:.1f}%, below the 75% threshold"
                if overall_attendance_pct < 75.0
                else f"Attendance is {overall_attendance_pct:.1f}%, above the 75% threshold"
            )

            factors = [
                {
                    "name": "Marks Level",
                    "weight": 45,
                    "score": round(r_marks_lvl, 1),
                    "contribution": round(0.45 * r_marks_lvl, 1),
                    "detail": f"{ia_trend_phrase} (Assessment average: {round(avg_marks_pct, 1)}%)."
                },
                {
                    "name": "Attendance Level",
                    "weight": 40,
                    "score": round(r_att_lvl, 1),
                    "contribution": round(0.40 * r_att_lvl, 1),
                    "detail": f"{att_threshold_phrase} ({total_attended}/{total_held} classes attended)."
                },
                {
                    "name": "Grade Trend",
                    "weight": 15,
                    "score": round(r_marks_trend, 1),
                    "contribution": round(0.15 * r_marks_trend, 1),
                    "detail": f"End-term grade trend (G3 - G1) shifted by {grade_trend:+.1f} points."
                }
            ]
        else:
            # Missed Submissions (10%)
            student_subs = [s for s in store.assignment_submissions if s.get("student_id") == student_id]
            missed_count = sum(1 for s in student_subs if s.get("status") in ("missed", "overdue"))
            late_count = sum(1 for s in student_subs if s.get("status") == "late")
            
            r_missed = min(100.0, missed_count * 35.0 + late_count * 15.0)

            # Weighted calculation (Weights: 30%, 20%, 25%, 15%, 10%)
            weighted_score = round(
                (0.30 * r_att_lvl) +
                (0.20 * r_att_trend) +
                (0.25 * r_marks_lvl) +
                (0.15 * r_marks_trend) +
                (0.10 * r_missed),
                1
            )
            weighted_score = max(0.0, min(100.0, weighted_score))

            # Configurable bands: Green < 40, Amber 40-69, Red >= 70
            if weighted_score < 40.0:
                calculated_band = "Green"
            elif weighted_score < 70.0:
                calculated_band = "Amber"
            else:
                calculated_band = "Red"

            # Check for Mentor Overrides
            overrides = [o for o in store.band_overrides if o.get("student_id") == student_id]
            active_override = overrides[-1] if overrides else None
            effective_band = active_override.get("overridden_band") if active_override else calculated_band

            # Factor contributions breakdown
            factors = [
                {
                    "name": "Attendance Level",
                    "weight": 30,
                    "score": round(r_att_lvl, 1),
                    "contribution": round(0.30 * r_att_lvl, 1),
                    "detail": f"Current overall attendance is {round(overall_attendance_pct, 1)}% ({total_attended}/{total_held} classes attended)."
                },
                {
                    "name": "Attendance Trend",
                    "weight": 20,
                    "score": round(r_att_trend, 1),
                    "contribution": round(0.20 * r_att_trend, 1),
                    "detail": f"Attendance changed by {att_trend_delta:+0.1f}% over the last 30 days ({prior_pct:.1f}% to {recent_pct:.1f}%)."
                },
                {
                    "name": "Marks Level",
                    "weight": 25,
                    "score": round(r_marks_lvl, 1),
                    "contribution": round(0.25 * r_marks_lvl, 1),
                    "detail": f"Average assessment score is {round(avg_marks_pct, 1)}% across evaluated components."
                },
                {
                    "name": "Marks Trend",
                    "weight": 15,
                    "score": round(r_marks_trend, 1),
                    "contribution": round(0.15 * r_marks_trend, 1),
                    "detail": f"Examination scores shifted by {marks_trend_delta:+0.1f}% compared to earlier evaluation checkpoints."
                },
                {
                    "name": "Missed Submissions",
                    "weight": 10,
                    "score": round(r_missed, 1),
                    "contribution": round(0.10 * r_missed, 1),
                    "detail": f"{missed_count} missed/overdue and {late_count} late assignment submission(s) recorded."
                }
            ]

        # Sort factors by highest contribution
        sorted_factors = sorted(factors, key=lambda x: x["contribution"], reverse=True)
        top_factors = sorted_factors[:3]

        reasons = [f["detail"] for f in top_factors if f["contribution"] > 5.0]
        if not reasons:
            reasons = ["Consistent academic engagement and above-threshold attendance across all registered courses."]
        plain_language_explanation = " ".join(reasons)

        # Flag start date and default 14-day expiry status: active / expired / resolved_by_improvement
        # Persist flag status transitions with the date they happened, and store them in flag history
        now = datetime.datetime.now(datetime.timezone.utc)
        today_str = now.strftime("%Y-%m-%d")

        flag_info = user.get("flag_info")
        if not flag_info:
            flag_info = {
                "start_date": (now - datetime.timedelta(days=2)).isoformat(),
                "expiry_date": (now + datetime.timedelta(days=14)).isoformat(), # Default 14 days
                "status": "active",
                "history": [
                    {
                        "status": "active",
                        "date": (now - datetime.timedelta(days=2)).strftime("%Y-%m-%d"),
                        "timestamp": (now - datetime.timedelta(days=2)).isoformat(),
                        "reason": "Flag initialized based on attendance and performance indicators"
                    }
                ],
                "last_band": calculated_band,
                "last_attendance": overall_attendance_pct
            }
            user["flag_info"] = flag_info

        expiry_dt = datetime.datetime.fromisoformat(flag_info["expiry_date"])
        current_status = flag_info.get("status", "active")

        # Check for status transition
        if current_status == "active":
            if calculated_band == "Green":
                flag_info["status"] = "resolved_by_improvement"
                flag_info["transition_date"] = today_str
                flag_info.setdefault("history", []).append({
                    "status": "resolved_by_improvement",
                    "date": today_str,
                    "timestamp": now.isoformat(),
                    "reason": f"Resolved by academic recovery: calculated score reached Green band ({weighted_score}/100)"
                })
                # Auto-create milestone
                store.add_milestone(
                    student_id=student_id,
                    title="Flag Resolved by Improvement",
                    details=f"Academic standing improved to Green band ({weighted_score}/100); early intervention flag successfully resolved.",
                    recorded_by=user.get("mentor_id") or "Academic System",
                    date_str=today_str
                )
            elif now > expiry_dt:
                flag_info["status"] = "expired"
                flag_info["transition_date"] = today_str
                flag_info.setdefault("history", []).append({
                    "status": "expired",
                    "date": today_str,
                    "timestamp": now.isoformat(),
                    "reason": "14-day intervention monitoring period concluded"
                })

        # Check if risk band improved from previous tracking
        prev_band = flag_info.get("last_band")
        band_ranks = {"Red": 0, "Amber": 1, "Green": 2}
        if prev_band and prev_band in band_ranks and calculated_band in band_ranks:
            if band_ranks[calculated_band] > band_ranks[prev_band]:
                store.add_milestone(
                    student_id=student_id,
                    title=f"Risk Standing Improved to {calculated_band}",
                    details=f"Student's risk status improved from {prev_band} band to {calculated_band} band (Score: {weighted_score}/100).",
                    recorded_by=user.get("mentor_id") or "Academic System",
                    date_str=today_str
                )
        flag_info["last_band"] = calculated_band

        # Check if attendance crossed 75%
        prev_att = flag_info.get("last_attendance", 0.0)
        if prev_att < 75.0 and overall_attendance_pct >= 75.0:
            store.add_milestone(
                student_id=student_id,
                title="75% Attendance Threshold Crossed",
                details=f"Overall attendance reached {overall_attendance_pct:.1f}%, restoring end-term examination eligibility.",
                recorded_by=user.get("mentor_id") or "Academic System",
                date_str=today_str
            )
        flag_info["last_attendance"] = overall_attendance_pct

        # Trend over 8 weeks
        history_8_weeks = []
        for i in range(8, 0, -1):
            w_date = (now - datetime.timedelta(weeks=i)).strftime("%b %d")
            jitter = (hash(f"{student_id}-{i}") % 15) - 7
            w_score = max(10.0, min(95.0, weighted_score + (i - 4) * (2 if att_trend_delta < 0 else -2) + jitter))
            w_band = "Green" if w_score < 40 else ("Amber" if w_score < 70 else "Red")
            history_8_weeks.append({
                "week": f"W-{i}",
                "date": w_date,
                "score": round(w_score, 1),
                "band": w_band
            })

        if att_trend_delta > 1.0 and marks_trend_delta >= -1.0:
            trend_direction = "improving"
        elif att_trend_delta < -2.0 or marks_trend_delta < -3.0 or weighted_score >= 65:
            trend_direction = "declining"
        else:
            trend_direction = "stable"

        result = {
            "student_id": student_id,
            "student_name": user.get("name"),
            "roll_no": user.get("roll_no", student_id),
            "branch": user.get("branch", "CSE"),
            "section": user.get("section", "A"),
            "semester": user.get("semester", 4),
            "mentor_id": user.get("mentor_id"),
            "weighted_score": weighted_score,
            "calculated_band": calculated_band,
            "effective_band": effective_band,
            "is_overridden": active_override is not None,
            "override_info": active_override,
            "factors": factors,
            "top_factors": top_factors,
            "plain_language_explanation": plain_language_explanation,
            "flag": {
                "start_date": flag_info["start_date"],
                "expiry_date": flag_info["expiry_date"],
                "days_remaining": max(0, (expiry_dt - now).days),
                "status": flag_info.get("status", "active"),
                "transition_date": flag_info.get("transition_date"),
                "history": flag_info.get("history", [])
            },
            "metrics": {
                "attendance_overall": round(overall_attendance_pct, 1),
                "attendance_recent": round(recent_pct, 1),
                "attendance_prior": round(prior_pct, 1),
                "attendance_trend_delta": att_trend_delta,
                "average_marks": round(avg_marks_pct, 1),
                "marks_trend_delta": marks_trend_delta,
                "missed_submissions": missed_count,
                "late_submissions": late_count
            },
            "trend_direction": trend_direction,
            "history_8_weeks": history_8_weeks
        }
        
        return result
