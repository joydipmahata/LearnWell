"""
Seed loader for UCI Student Performance Dataset (student-mat.csv)
Fairness & Privacy Constraints:
- ONLY 4 columns are extracted: G1, G2, G3, absences.
- All other columns (studytime, failures, health, alcohol, family, etc.) are strictly ignored.
- All identities (names, IDs, emails, non-routable phones) are 100% synthetically generated.
- Deterministic (Random(seed)) and idempotent.
"""

import os
import csv
import random
import datetime
from typing import Optional, List, Dict, Any
from app.auth import hash_pin

FIRST_NAMES = [
    "Aarav", "Priya", "Rohan", "Ishita", "Ananya", "Kabir", "Diya", "Aditya",
    "Neha", "Vikram", "Tanvi", "Kunal", "Sanya", "Arjun", "Meera", "Varun",
    "Sneha", "Harsh", "Ritu", "Gaurav", "Anushka", "Siddharth", "Pooja", "Kavya",
    "Manish", "Bhavna", "Nikhil", "Simran", "Rahul", "Shreya", "Dev", "Riya",
    "Aryan", "Anika", "Karan", "Tara", "Yash", "Maya", "Vivaan", "Ishan",
    "Alok", "Swati", "Deepa", "Manav", "Trisha", "Akash", "Payal", "Kartik",
    "Divya", "Pranav", "Sakshi", "Tarun", "Radhika", "Mohit", "Sunita", "Chirag",
    "Preeti", "Sanjay", "Nidhi", "Amit", "Shalini", "Vishal", "Shruti", "Abhinav",
    "Priyanka", "Rajesh", "Chetna", "Sameer", "Kritika", "Naveen", "Smriti", "Manan"
]

LAST_NAMES = [
    "Mehta", "Nair", "Gupta", "Sen", "Verma", "Joshi", "Patel", "Sharma",
    "Choudhary", "Rao", "Iyer", "Saxena", "Malhotra", "Singhal", "Pillai",
    "Deshmukh", "Reddy", "Vardhan", "Agarwal", "Nanda", "Roy", "Bhat",
    "Hegde", "Menon", "Tiwari", "Das", "Kothari", "Kaur", "Trivedi",
    "Mukherjee", "Kapoor", "Banerjee", "Chatterjee", "Mishra", "Pandey",
    "Kulkarni", "Desai", "Bose", "Bhattacharya", "Dutta", "Sethi", "Gill",
    "Chopra", "Ahuja", "Khanna", "Saxena", "Bhardwaj", "Goswami", "Sengupta"
]

def resolve_csv_path(csv_path: str) -> str:
    """Resolve csv path whether called from workspace root or backend dir."""
    if os.path.exists(csv_path):
        return os.path.abspath(csv_path)
    candidates = [
        os.path.join(os.path.dirname(__file__), "..", "data", "student-mat.csv"),
        os.path.join(os.path.dirname(__file__), "..", "..", "backend", "data", "student-mat.csv"),
        os.path.join("backend", "data", "student-mat.csv"),
        os.path.join("data", "student-mat.csv"),
    ]
    for c in candidates:
        if os.path.exists(c):
            return os.path.abspath(c)
    return os.path.abspath(csv_path)

def load_uci_students(csv_path: str = "backend/data/student-mat.csv", limit: int = 120, seed: int = 42, store = None) -> List[Dict[str, Any]]:
    """
    Loads students from UCI student-mat.csv using strictly G1, G2, G3, absences.
    Deterministic with seed=42. Idempotent against store.
    """
    resolved_path = resolve_csv_path(csv_path)
    if not os.path.exists(resolved_path):
        raise FileNotFoundError(f"UCI dataset file not found at: {resolved_path}")

    # Read ONLY 4 columns: G1, G2, G3, absences
    raw_rows = []
    with open(resolved_path, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter=";")
        for row in reader:
            try:
                g1 = float(row["G1"].strip().strip('"'))
                g2 = float(row["G2"].strip().strip('"'))
                g3 = float(row["G3"].strip().strip('"'))
                absences = int(row["absences"].strip().strip('"'))
                raw_rows.append({
                    "G1": g1,
                    "G2": g2,
                    "G3": g3,
                    "absences": absences
                })
            except (KeyError, ValueError) as err:
                continue

    if not raw_rows:
        return []

    # Deterministic sampling / slicing
    rng = random.Random(seed)
    
    # We select rows deterministically
    if len(raw_rows) > limit:
        # Sample deterministically with rng
        selected_rows = rng.sample(raw_rows, limit)
    else:
        selected_rows = raw_rows[:limit]

    base_time = datetime.datetime.now(datetime.timezone.utc)
    default_pin_hash = hash_pin("123456")

    # Generate unique names
    seen_names = {"Aarav Mehta"}  # Reserve Aarav Mehta for LW-STU-0001
    synthetic_identities = []
    
    # Shuffle names deterministically to pair them
    shuffled_first = list(FIRST_NAMES)
    shuffled_last = list(LAST_NAMES)
    rng.shuffle(shuffled_first)
    rng.shuffle(shuffled_last)

    pair_idx = 0
    while len(synthetic_identities) < len(selected_rows):
        f_idx = pair_idx % len(shuffled_first)
        l_idx = (pair_idx // len(shuffled_first) + pair_idx) % len(shuffled_last)
        candidate_name = f"{shuffled_first[f_idx]} {shuffled_last[l_idx]}"
        if candidate_name not in seen_names:
            seen_names.add(candidate_name)
            synthetic_identities.append(candidate_name)
        pair_idx += 1

    mentors = ["LW-FAC-0001", "LW-FAC-0002", "LW-FAC-0003"]
    # Sections cycle B, A, C for idx=2, 3, 4 ... so idx=2 is Sec B and idx=3 is Sec A
    section_cycle = ["B", "A", "C"]

    subjects_info = [
        {"code": "CS401", "name": "Design & Analysis of Algorithms", "held": 34, "total": 48},
        {"code": "CS402", "name": "Operating Systems", "held": 33, "total": 46},
        {"code": "CS403", "name": "Database Management Systems", "held": 32, "total": 44},
        {"code": "CS404", "name": "Computer Networks", "held": 31, "total": 42},
        {"code": "CS405", "name": "Formal Languages & Automata Theory", "held": 30, "total": 40},
        {"code": "CS406", "name": "Full Stack Web Engineering Lab", "held": 27, "total": 30},
    ]  # sum of held = 187

    loaded_students = []
    email_counts = {}

    for i, data in enumerate(selected_rows):
        idx = i + 2  # LW-STU-0002 onwards
        stu_id = f"LW-STU-{idx:04d}"
        roll_no = f"23BCSE{idx:03d}"
        full_name = synthetic_identities[i]
        first, last = full_name.split(" ", 1)
        base_email_prefix = f"{first.lower()}.{last.lower()}"
        email_counts[base_email_prefix] = email_counts.get(base_email_prefix, 0) + 1
        cnt = email_counts[base_email_prefix]
        email = f"{base_email_prefix}@learnwell.edu" if cnt == 1 else f"{base_email_prefix}{cnt}@learnwell.edu"

        # Non-routable 10-digit phone numbers
        student_phone = f"90000{idx:05d}"
        parent_phone = f"91000{idx:05d}"

        section = section_cycle[i % 3]
        mentor_id = mentors[i % 3]

        g1 = data["G1"]
        g2 = data["G2"]
        g3 = data["G3"]
        absences = data["absences"]

        # 1. Attendance Mapping
        # Convert absences into attendance out of 187 classes (95% at 0 down to 35% at 75 absences)
        att_pct = max(35.0, min(95.0, round(95.0 - (absences / 75.0) * 60.0, 1)))
        total_held_overall = 187
        total_attended_overall = int(round(total_held_overall * (att_pct / 100.0)))

        # 2. Grade trend (G3 - G1)
        grade_trend = round(g3 - g1, 1)
        if grade_trend > 0:
            trend_str = "improving"
        elif grade_trend < 0:
            trend_str = "declining"
        else:
            trend_str = "stable"

        # 3. Risk Score calculation (ONLY marks, grade trend G3-G1, and attendance %)
        avg_m = round((g1 + g2) * 2.5, 1)  # out of 100%
        
        # Marks risk (0-100)
        if avg_m >= 75.0:
            r_marks = max(0.0, (100.0 - avg_m) * 0.8)
        elif avg_m >= 55.0:
            r_marks = 20.0 + (75.0 - avg_m) * 2.0
        else:
            r_marks = min(100.0, 60.0 + (55.0 - avg_m) * 2.0)

        # Attendance risk (0-100)
        if att_pct >= 85.0:
            r_att = max(0.0, (95.0 - att_pct) * 2.0)
        elif att_pct >= 75.0:
            r_att = 20.0 + (85.0 - att_pct) * 3.0
        else:
            r_att = min(100.0, 50.0 + (75.0 - att_pct) * 2.5)
        # Absences factor
        r_att = min(100.0, r_att + absences * 3.0)

        # Grade trend risk (0-100)
        r_trend = max(0.0, min(100.0, 50.0 - grade_trend * 15.0))

        # Weighted calculation (45% marks, 40% attendance, 15% trend)
        weighted_score = round(0.45 * r_marks + 0.40 * r_att + 0.15 * r_trend, 1)
        weighted_score = max(0.0, min(100.0, weighted_score))

        # Target distribution calibration: Green < 42.0, Amber 42.0 - 60.0, Red >= 60.1
        if weighted_score < 42.0:
            band = "Green"
        elif weighted_score < 60.1:
            band = "Amber"
        else:
            band = "Red"

        flag_start = base_time - datetime.timedelta(days=rng.randint(2, 6))
        flag_expiry = flag_start + datetime.timedelta(days=14)

        user_dict = {
            "id": stu_id,
            "roll_no": roll_no,
            "name": full_name,
            "email": email,
            "role": "Student",
            "branch": "CSE",
            "section": section,
            "semester": 4,
            "student_phone": student_phone,
            "parent_phone": parent_phone,
            "mentor_id": mentor_id,
            "pin_hash": default_pin_hash,
            "plain_pin": "123456",
            "is_active": True,
            "created_at": (base_time - datetime.timedelta(days=120)).isoformat(),
            "from_uci_dataset": True,
            "uci_g1": g1,
            "uci_g2": g2,
            "uci_g3": g3,
            "uci_absences": absences,
            "grade_trend": grade_trend,
            "trend_str": trend_str,
            "calculated_band": band,
            "weighted_risk_score": weighted_score,
            "flag_info": {
                "start_date": flag_start.isoformat(),
                "expiry_date": flag_expiry.isoformat(),
                "status": "active" if band in ("Red", "Amber") else "resolved",
                "history": [
                    {
                        "status": "active" if band in ("Red", "Amber") else "resolved",
                        "date": flag_start.strftime("%Y-%m-%d"),
                        "timestamp": flag_start.isoformat(),
                        "reason": f"UCI Cohort academic checkpoint: Band {band} (Attendance: {att_pct}%, Assessment Avg: {avg_m}%)."
                    }
                ],
                "last_band": band,
                "last_attendance": att_pct
            }
        }

        # Subject-wise attendance records (out of 187 total classes)
        att_records = []
        for s_idx, sub in enumerate(subjects_info):
            sub_held = sub["held"]
            # Small deterministic variation (+/- 2%)
            var_pct = rng.uniform(-2.5, 2.5)
            sub_att_pct = max(20.0, min(100.0, att_pct + var_pct))
            sub_attended = int(round(sub_held * (sub_att_pct / 100.0)))
            sub_attended = max(0, min(sub_held, sub_attended))
            actual_pct = round((sub_attended / sub_held) * 100.0, 1)
            att_records.append({
                "student_id": stu_id,
                "subject_code": sub["code"],
                "subject_name": sub["name"],
                "total_classes": sub_held,
                "attended_classes": sub_attended,
                "total_course_classes": sub["total"],
                "percentage": actual_pct
            })

        # Daily attendance history over last 30 days
        daily_history = []
        for day in range(30, 0, -1):
            dt = base_time - datetime.timedelta(days=day)
            # Improving trend has slightly higher recent attendance, declining has lower
            if trend_str == "improving":
                p_present = min(0.98, (att_pct + 8.0) / 100.0)
            elif trend_str == "declining":
                p_present = max(0.15, (att_pct - 8.0) / 100.0)
            else:
                p_present = att_pct / 100.0
            
            is_pres = rng.random() < p_present
            daily_history.append({
                "student_id": stu_id,
                "subject_code": subjects_info[day % len(subjects_info)]["code"],
                "timestamp": dt.isoformat(),
                "status": "present" if is_pres else "absent"
            })

        # Marks Mapping: CS401-CS406 (IA1, IA2, Quiz 1)
        # IA1 = G1 scaled to /50 (G1 * 2.5)
        # IA2 = G2 scaled to /50 (G2 * 2.5)
        # Quiz 1 = ((G1 + G2) / 2) scaled to /20 ((G1 + G2) / 2.0)
        # Deterministic per-subject variation +/- 3 marks
        exam_results = []
        for s_idx, sub in enumerate(subjects_info):
            # Per-subject variation (+/- 3 marks)
            var1 = rng.randint(-3, 3)
            var2 = rng.randint(-3, 3)
            var_q = rng.randint(-2, 2)

            ia1_score = round(max(0.0, min(50.0, (g1 * 2.5) + var1)), 1)
            ia2_score = round(max(0.0, min(50.0, (g2 * 2.5) + var2)), 1)
            quiz_score = round(max(0.0, min(20.0, ((g1 + g2) / 2.0) + var_q)), 1)

            ia1_pct = round((ia1_score / 50.0) * 100.0, 1)
            ia2_pct = round((ia2_score / 50.0) * 100.0, 1)
            quiz_pct = round((quiz_score / 20.0) * 100.0, 1)

            ia1_date = (base_time - datetime.timedelta(days=45 + (s_idx * 2))).strftime("%Y-%m-%d")
            quiz_date = (base_time - datetime.timedelta(days=25 + (s_idx * 2))).strftime("%Y-%m-%d")
            ia2_date = (base_time - datetime.timedelta(days=12 + (s_idx * 2))).strftime("%Y-%m-%d")

            exam_results.append({
                "student_id": stu_id,
                "semester": 4,
                "exam_name": "Internal Assessment 1",
                "subject_code": sub["code"],
                "subject_name": sub["name"],
                "subject": sub["name"],
                "score": ia1_score,
                "marks_obtained": ia1_score,
                "max_marks": 50,
                "score_pct": ia1_pct,
                "date": ia1_date,
                "exam_date": ia1_date
            })
            exam_results.append({
                "student_id": stu_id,
                "semester": 4,
                "exam_name": "Quiz 1",
                "subject_code": sub["code"],
                "subject_name": sub["name"],
                "subject": sub["name"],
                "score": quiz_score,
                "marks_obtained": quiz_score,
                "max_marks": 20,
                "score_pct": quiz_pct,
                "date": quiz_date,
                "exam_date": quiz_date
            })
            exam_results.append({
                "student_id": stu_id,
                "semester": 4,
                "exam_name": "Internal Assessment 2",
                "subject_code": sub["code"],
                "subject_name": sub["name"],
                "subject": sub["name"],
                "score": ia2_score,
                "marks_obtained": ia2_score,
                "max_marks": 50,
                "score_pct": ia2_pct,
                "date": ia2_date,
                "exam_date": ia2_date
            })

        # Semester summaries 1-4 with G3 reflecting latest-term performance
        # SGPA scale 0-10
        sem1_sgpa = round(max(4.0, min(10.0, (g1 / 20.0) * 10.0 + rng.uniform(-0.3, 0.3))), 2)
        sem2_sgpa = round(max(4.0, min(10.0, ((g1 + g2) / 40.0) * 10.0 + rng.uniform(-0.2, 0.2))), 2)
        sem3_sgpa = round(max(4.0, min(10.0, (g2 / 20.0) * 10.0 + rng.uniform(-0.2, 0.2))), 2)
        # Sem 4 uses G3 for end-of-term standing
        sem4_sgpa = round(max(4.0, min(10.0, (g3 / 20.0) * 10.0)), 2)

        sem_summaries = []
        running_cgpa = 0.0
        for s_num, sgpa in enumerate([sem1_sgpa, sem2_sgpa, sem3_sgpa, sem4_sgpa], start=1):
            running_cgpa = round((running_cgpa * (s_num - 1) + sgpa) / s_num, 2)
            backlogs = 1 if sgpa < 5.0 else 0
            sem_summaries.append({
                "semester": s_num,
                "sgpa": sgpa,
                "cgpa": running_cgpa,
                "backlogs": backlogs,
                "status": "Passed" if backlogs == 0 else "1 Backlog"
            })

        # Milestones (2-4 records)
        milestone_choices = [
            ("Continuous Assessment Progress", f"Completed internal assessments across {len(subjects_info)} engineering modules.", 35),
            ("Attendance Consistency Checkpoint", f"Recorded {att_pct}% cumulative attendance across 187 scheduled sessions.", 20),
            ("Mid-Term Performance Benchmark", f"Semester 4 grade trajectory reflecting {'positive upward progression' if grade_trend > 0 else 'curriculum review'}.", 10),
            ("Faculty Mentor Check-in", "Academic counselling session completed with mentor review.", 5)
        ]
        num_m = 2 + (i % 3)
        milestones = milestone_choices[:num_m]

        loaded_students.append({
            "user": user_dict,
            "attendance_records": att_records,
            "daily_history": daily_history,
            "exam_results": exam_results,
            "semester_summaries": sem_summaries,
            "milestones": milestones
        })

    # If store is provided, merge idempotently
    if store is not None:
        with store.lock:
            for item in loaded_students:
                u = item["user"]
                stu_id = u["id"]
                # Skip if already in store
                if stu_id in store.users:
                    continue

                store.users[stu_id] = u

                for att in item["attendance_records"]:
                    store.attendance_records[f"{stu_id}:{att['subject_code']}"] = att

                for h in item["daily_history"]:
                    store.attendance_history.append(h)

                for ex in item["exam_results"]:
                    store.exam_results.append(ex)

                store.semester_summaries[stu_id] = item["semester_summaries"]

                for title, desc, days_ago in item["milestones"]:
                    store.add_milestone(
                        student_id=stu_id,
                        title=title,
                        details=desc,
                        recorded_by=u["mentor_id"],
                        date_str=(base_time - datetime.timedelta(days=days_ago)).strftime("%Y-%m-%d")
                    )

                # Seed mentor feedback notes for cohort student
                mentor_user = store.users.get(u["mentor_id"], {})
                mentor_name = mentor_user.get("name", "Faculty Mentor")
                sem4_text = (
                    "Semester 4 checkpoint: Attendance counselling required. Targeted remedial tutoring initiated."
                    if trend_str == "declining"
                    else (
                        "Consistent lab submissions and positive continuous assessment scores."
                        if trend_str == "improving"
                        else "Coursework on track. Maintained steady assessment performance."
                    )
                )
                store.academic_feedback.append({
                    "id": f"FDBK-{stu_id}-S4",
                    "student_id": stu_id,
                    "mentor_id": u["mentor_id"],
                    "mentor_name": mentor_name,
                    "semester": 4,
                    "subject_code": "CS401",
                    "feedback": sem4_text,
                    "feedback_text": sem4_text,
                    "created_at": (base_time - datetime.timedelta(days=10)).isoformat()
                })
                store.academic_feedback.append({
                    "id": f"FDBK-{stu_id}-S3",
                    "student_id": stu_id,
                    "mentor_id": u["mentor_id"],
                    "mentor_name": mentor_name,
                    "semester": 3,
                    "subject_code": "CS301",
                    "feedback": "Completed Semester 3 curriculum prerequisites. Steady foundation in core modules.",
                    "feedback_text": "Completed Semester 3 curriculum prerequisites. Steady foundation in core modules.",
                    "created_at": (base_time - datetime.timedelta(days=90)).isoformat()
                })

                # Exam seating
                idx_num = int(stu_id.split("-")[-1])
                store.exam_seating.append({
                    "student_id": stu_id,
                    "student_name": u["name"],
                    "roll_no": u["roll_no"],
                    "exam_name": "Mid-Term Examination Spring 2026",
                    "subject": "Design & Analysis of Algorithms (CS401)",
                    "exam_date": (base_time + datetime.timedelta(days=14)).strftime("%Y-%m-%d"),
                    "exam_time": "10:00 AM - 01:00 PM",
                    "room_no": f"LH-{101 + (idx_num // 15)}",
                    "seat_no": f"R{(idx_num % 15) + 1}-C{((idx_num % 3) + 1)}",
                    "block": "Block B (Academic Complex)"
                })
                store.exam_seating.append({
                    "student_id": stu_id,
                    "student_name": u["name"],
                    "roll_no": u["roll_no"],
                    "exam_name": "Mid-Term Examination Spring 2026",
                    "subject": "Database Management Systems (CS403)",
                    "exam_date": (base_time + datetime.timedelta(days=16)).strftime("%Y-%m-%d"),
                    "exam_time": "02:00 PM - 05:00 PM",
                    "room_no": f"LH-{101 + (idx_num // 15)}",
                    "seat_no": f"R{(idx_num % 15) + 1}-C{((idx_num % 3) + 1)}",
                    "block": "Block B (Academic Complex)"
                })

    return loaded_students
