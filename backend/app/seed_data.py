import datetime
import random
from app.auth import hash_pin

def seed_database(store):
    with store.lock:
        if store.users:
            return  # Already seeded

        # Deterministic random seed
        random.seed(42)
        base_time = datetime.datetime.now(datetime.timezone.utc)
        default_pin_hash = hash_pin("123456")

        # 1. Admin
        store.users["LW-ADM-0001"] = {
            "id": "LW-ADM-0001",
            "name": "Dr. Ramesh Sharma (Dean Academic)",
            "email": "dean.academic@learnwell.edu",
            "role": "Admin",
            "pin_hash": default_pin_hash,
            "plain_pin": "123456",
            "is_active": True,
            "created_at": (base_time - datetime.timedelta(days=90)).isoformat()
        }

        # 2. Faculty / Mentors (3 mentors)
        mentors_info = [
            ("LW-FAC-0001", "Prof. Sunita Rao", "sunita.rao@learnwell.edu", "Computer Science & Engineering"),
            ("LW-FAC-0002", "Dr. Rajesh Kulkarni", "rajesh.kulkarni@learnwell.edu", "Information Technology"),
            ("LW-FAC-0003", "Prof. Anita Desai", "anita.desai@learnwell.edu", "Electronics & Communication")
        ]

        for fac_id, name, email, dept in mentors_info:
            store.users[fac_id] = {
                "id": fac_id,
                "name": name,
                "email": email,
                "role": "Faculty",
                "department": dept,
                "pin_hash": default_pin_hash,
                "plain_pin": "123456",
                "is_active": True,
                "created_at": (base_time - datetime.timedelta(days=80)).isoformat()
            }

        # 3. Courses Across Semesters 1 to 4
        all_subjects = [
            # Semester 1
            {"code": "CS101", "name": "Programming for Problem Solving", "branch": "CSE", "semester": 1, "credits": 4, "total_classes": 44},
            {"code": "MA101", "name": "Engineering Mathematics I", "branch": "CSE", "semester": 1, "credits": 4, "total_classes": 44},
            {"code": "PH101", "name": "Engineering Physics", "branch": "CSE", "semester": 1, "credits": 3, "total_classes": 36},
            {"code": "EE101", "name": "Basic Electrical Engineering", "branch": "CSE", "semester": 1, "credits": 3, "total_classes": 36},
            # Semester 2
            {"code": "CS201", "name": "Data Structures & Algorithms", "branch": "CSE", "semester": 2, "credits": 4, "total_classes": 46},
            {"code": "MA201", "name": "Engineering Mathematics II", "branch": "CSE", "semester": 2, "credits": 4, "total_classes": 44},
            {"code": "EC201", "name": "Digital Logic & Computer Design", "branch": "CSE", "semester": 2, "credits": 3, "total_classes": 40},
            {"code": "CS202", "name": "Object Oriented Programming", "branch": "CSE", "semester": 2, "credits": 3, "total_classes": 40},
            # Semester 3
            {"code": "CS301", "name": "Computer Organization & Architecture", "branch": "CSE", "semester": 3, "credits": 4, "total_classes": 46},
            {"code": "CS302", "name": "Discrete Mathematics", "branch": "CSE", "semester": 3, "credits": 4, "total_classes": 44},
            {"code": "CS303", "name": "Software Engineering", "branch": "CSE", "semester": 3, "credits": 3, "total_classes": 40},
            {"code": "CS304", "name": "Web Technologies", "branch": "CSE", "semester": 3, "credits": 3, "total_classes": 40},
            # Semester 4 (Current Semester)
            {"code": "CS401", "name": "Design & Analysis of Algorithms", "branch": "CSE", "semester": 4, "credits": 4, "total_classes": 48},
            {"code": "CS402", "name": "Operating Systems", "branch": "CSE", "semester": 4, "credits": 4, "total_classes": 46},
            {"code": "CS403", "name": "Database Management Systems", "branch": "CSE", "semester": 4, "credits": 4, "total_classes": 44},
            {"code": "CS404", "name": "Computer Networks", "branch": "CSE", "semester": 4, "credits": 3, "total_classes": 42},
            {"code": "CS405", "name": "Formal Languages & Automata Theory", "branch": "CSE", "semester": 4, "credits": 3, "total_classes": 40},
            {"code": "CS406", "name": "Full Stack Web Engineering Lab", "branch": "CSE", "semester": 4, "credits": 2, "total_classes": 30},
        ]
        for sub in all_subjects:
            store.subjects[sub["code"]] = sub

        curr_subjects = [s for s in all_subjects if s["semester"] == 4]

        # 4. Assignments
        assignment_templates = [
            {"id": "ASN-01", "title": "Divide & Conquer Algorithms Implementation", "code": "CS401", "due_days_ago": 25, "total": 100},
            {"id": "ASN-02", "title": "Process Synchronization & Semaphore Lab", "code": "CS402", "due_days_ago": 18, "total": 100},
            {"id": "ASN-03", "title": "ER Modeling & Normalization Assignment", "code": "CS403", "due_days_ago": 10, "total": 100},
            {"id": "ASN-04", "title": "TCP/UDP Socket Programming in Python", "code": "CS404", "due_days_ago": 3, "total": 100},
            {"id": "ASN-05", "title": "NFA to DFA Conversion and Minimization", "code": "CS405", "due_days_ago": -4, "total": 100},
            {"id": "ASN-06", "title": "Full Stack API & Web Security Practice", "code": "CS406", "due_days_ago": -1, "total": 100},
        ]
        for a in assignment_templates:
            store.assignments[a["id"]] = {
                "id": a["id"],
                "title": a["title"],
                "subject_code": a["code"],
                "subject_name": store.subjects[a["code"]]["name"],
                "semester": 4,
                "due_date": (base_time - datetime.timedelta(days=a["due_days_ago"])).strftime("%Y-%m-%d"),
                "total_marks": a["total"]
            }

        # 5. Core Prototype Student: Aarav Mehta (LW-STU-0001)
        student_names = [
            ("Aarav Mehta", "Red", "declining"),
        ]

        for idx, (s_name, target_band, target_trend) in enumerate(student_names, start=1):
            stu_id = f"LW-STU-{idx:04d}"
            if idx <= 10:
                mentor_id = "LW-FAC-0001"
            elif idx <= 20:
                mentor_id = "LW-FAC-0002"
            elif idx <= 28:
                mentor_id = "LW-FAC-0003"
            else:
                mentor_id = None  # Unassigned for admin testing

            branch = "CSE" if idx <= 24 else "IT"
            section = "A" if idx % 2 == 1 else "B"
            email = f"{s_name.lower().replace(' ', '.')}@student.learnwell.edu"

            # 14-day default flag setup
            flag_start = base_time - datetime.timedelta(days=2)
            flag_expiry = flag_start + datetime.timedelta(days=14)

            store.users[stu_id] = {
                "id": stu_id,
                "roll_no": f"23BCSE{idx:03d}",
                "name": s_name,
                "email": email,
                "role": "Student",
                "branch": branch,
                "section": section,
                "semester": 4,
                "student_phone": f"987654{idx:04d}",
                "parent_phone": f"912345{idx:04d}",
                "mentor_id": mentor_id,
                "pin_hash": default_pin_hash,
                "plain_pin": "123456",
                "is_active": True,
                "created_at": (base_time - datetime.timedelta(days=120)).isoformat(),
                "flag_info": {
                    "start_date": flag_start.isoformat(),
                    "expiry_date": flag_expiry.isoformat(),
                    "status": "active",
                    "history": [
                        {
                            "status": "active",
                            "date": flag_start.strftime("%Y-%m-%d"),
                            "timestamp": flag_start.isoformat(),
                            "reason": f"Flag initiated for Semester 4 academic & attendance tracking."
                        }
                    ],
                    "last_band": target_band,
                    "last_attendance": 65.0 if target_band == "Red" else (72.0 if target_band == "Amber" else 88.0)
                }
            }

            # Attendance targets
            if target_band == "Red":
                overall_att_target = random.uniform(52.0, 66.0)
            elif target_band == "Amber":
                overall_att_target = random.uniform(68.0, 78.0)
            else:
                overall_att_target = random.uniform(84.0, 96.0)

            # Subject-wise attendance for Semester 4
            for sub in curr_subjects:
                total_held = random.randint(28, 36)
                sub_target = max(40.0, min(99.0, overall_att_target + random.uniform(-6, 6)))
                attended = int(round(total_held * (sub_target / 100.0)))
                store.attendance_records[f"{stu_id}:{sub['code']}"] = {
                    "student_id": stu_id,
                    "subject_code": sub["code"],
                    "subject_name": sub["name"],
                    "total_classes": total_held,
                    "attended_classes": attended,
                    "total_course_classes": sub["total_classes"],
                    "percentage": round((attended / total_held) * 100.0, 1)
                }

            # 8 weeks of attendance history for trend calculation
            for day in range(56, 0, -2):
                dt = base_time - datetime.timedelta(days=day)
                if target_trend == "declining":
                    p_present = (overall_att_target + 15) / 100.0 if day > 28 else (overall_att_target - 15) / 100.0
                elif target_trend == "improving":
                    p_present = (overall_att_target - 12) / 100.0 if day > 28 else (overall_att_target + 12) / 100.0
                else:
                    p_present = overall_att_target / 100.0

                p_present = max(0.1, min(0.98, p_present))
                is_pres = random.random() < p_present
                store.attendance_history.append({
                    "student_id": stu_id,
                    "subject_code": "CS401",
                    "timestamp": dt.isoformat(),
                    "status": "present" if is_pres else "absent"
                })

            # Base marks configuration
            if target_band == "Red":
                base_marks = random.uniform(42.0, 56.0)
            elif target_band == "Amber":
                base_marks = random.uniform(60.0, 72.0)
            else:
                base_marks = random.uniform(78.0, 92.0)

            # Full History Across Semesters 1 to 4:
            # Generate exam results for each semester
            for sem in [1, 2, 3, 4]:
                sem_subs = [s for s in all_subjects if s["semester"] == sem]
                sem_backlogs = 0

                # Determine semester performance shift
                if sem < 4:
                    sem_multiplier = (1.0 - (4 - sem) * 0.04) if target_trend == "declining" else (1.0 - (4 - sem) * -0.04)
                    sem_base = max(35.0, min(95.0, base_marks * sem_multiplier + random.uniform(-4, 4)))
                else:
                    sem_base = base_marks

                for sub in sem_subs:
                    # Semesters 1, 2, 3 had complete exams
                    delta = -12.0 if target_trend == "declining" else (10.0 if target_trend == "improving" else 0.0)
                    m1 = max(25.0, min(95.0, sem_base - delta/2 + random.uniform(-5, 5)))
                    m2 = max(24.0, min(95.0, sem_base + delta/2 + random.uniform(-5, 5)))
                    q1 = max(20.0, min(100.0, sem_base + random.uniform(-6, 6)))

                    # Failed checkpoints for Red band
                    if target_band == "Red" and sub["code"] in ("CS302", "EC201", "CS401", "CS405") and idx in (1, 2, 11, 16, 27):
                        m2 = random.uniform(28.0, 38.0)
                        sem_backlogs += 1

                    days_offset = (4 - sem) * 90 + 35
                    ia1_date = (base_time - datetime.timedelta(days=days_offset + 25)).strftime("%Y-%m-%d")
                    ia1_score = round(m1 * 0.5, 1)
                    store.exam_results.append({
                        "student_id": stu_id,
                        "semester": sem,
                        "exam_name": "Internal Assessment 1",
                        "subject_code": sub["code"],
                        "subject_name": sub["name"],
                        "subject": sub["name"],
                        "score": ia1_score,
                        "marks_obtained": ia1_score,
                        "max_marks": 50,
                        "score_pct": round(m1, 1),
                        "date": ia1_date,
                        "exam_date": ia1_date
                    })
                    ia2_date = (base_time - datetime.timedelta(days=days_offset + 10)).strftime("%Y-%m-%d")
                    ia2_score = round(m2 * 0.5, 1)
                    store.exam_results.append({
                        "student_id": stu_id,
                        "semester": sem,
                        "exam_name": "Internal Assessment 2",
                        "subject_code": sub["code"],
                        "subject_name": sub["name"],
                        "subject": sub["name"],
                        "score": ia2_score,
                        "marks_obtained": ia2_score,
                        "max_marks": 50,
                        "score_pct": round(m2, 1),
                        "date": ia2_date,
                        "exam_date": ia2_date
                    })
                    q1_date = (base_time - datetime.timedelta(days=days_offset + 18)).strftime("%Y-%m-%d")
                    q1_score = round(q1 * 0.2, 1)
                    store.exam_results.append({
                        "student_id": stu_id,
                        "semester": sem,
                        "exam_name": "Quiz 1",
                        "subject_code": sub["code"],
                        "subject_name": sub["name"],
                        "subject": sub["name"],
                        "score": q1_score,
                        "marks_obtained": q1_score,
                        "max_marks": 20,
                        "score_pct": round(q1, 1),
                        "date": q1_date,
                        "exam_date": q1_date
                    })

                    if sem < 4:
                        end_score = round(max(30.0, min(98.0, (m1 + m2) / 2 + random.uniform(-4, 4))), 1)
                        end_date = (base_time - datetime.timedelta(days=days_offset - 10)).strftime("%Y-%m-%d")
                        store.exam_results.append({
                            "student_id": stu_id,
                            "semester": sem,
                            "exam_name": "End Semester Exam",
                            "subject_code": sub["code"],
                            "subject_name": sub["name"],
                            "subject": sub["name"],
                            "score": round(end_score, 1),
                            "marks_obtained": round(end_score, 1),
                            "max_marks": 100,
                            "score_pct": end_score,
                            "date": end_date,
                            "exam_date": end_date
                        })

                # Compute semester SGPA/CGPA
                sem_sgpa = round(max(4.8, min(9.8, (sem_base / 10.0) + (0.2 if target_band == "Green" else (-0.4 if target_band == "Red" else 0.0)))), 2)
                if sem_backlogs > 0:
                    sem_sgpa = round(max(4.5, sem_sgpa - 0.8), 2)

                if stu_id not in store.semester_summaries:
                    store.semester_summaries[stu_id] = []

                prev_cgpa = store.semester_summaries[stu_id][-1]["cgpa"] if store.semester_summaries[stu_id] else sem_sgpa
                cur_cgpa = round((prev_cgpa * (sem - 1) + sem_sgpa) / sem, 2)

                store.semester_summaries[stu_id].append({
                    "semester": sem,
                    "sgpa": sem_sgpa,
                    "cgpa": cur_cgpa,
                    "backlogs": sem_backlogs,
                    "status": "Passed" if sem_backlogs == 0 else f"{sem_backlogs} Backlog(s)"
                })

                # Seed mentor feedback for each semester
                if mentor_id:
                    feedback_texts = {
                        1: f"Orientation completed well. Good foundation in Mathematics and Basic Electrical.",
                        2: f"Proficiency in Data Structures is satisfactory. Encouraged to practice recursive tree traversals.",
                        3: f"Semester 3 coursework was rigorous. {'Need to remediate Discrete Math backlog.' if sem_backlogs > 0 else 'Maintained stable SGPA trajectory.'}",
                        4: f"Current semester checkpoint: {'Close monitoring needed on Algorithm analysis and OS.' if target_band == 'Red' else 'Consistent lab submissions and good classroom engagement.'}"
                    }
                    mentor_u = store.users.get(mentor_id, {})
                    store.academic_feedback.append({
                        "id": f"FDBK-{stu_id}-S{sem}",
                        "student_id": stu_id,
                        "mentor_id": mentor_id,
                        "mentor_name": mentor_u.get("name", "Prof. Sunita Rao"),
                        "semester": sem,
                        "subject_code": f"CS{sem}01",
                        "feedback": feedback_texts[sem],
                        "feedback_text": feedback_texts[sem],
                        "created_at": (base_time - datetime.timedelta(days=(4 - sem) * 75 + 10)).isoformat()
                    })

            # Seed 2-4 Improvement & Milestone Records for EVERY student over the last 8 weeks
            # (Requirement: "seed 2-4 records for EVERY student ... with dates over the last 8 weeks.")
            milestone_bank = [
                ("Attendance Turnaround", "Achieved 100% attendance across all scheduled lectures during the last two weeks.", 4),
                ("Assignment Submission Streak", "Submitted 3 consecutive lab assignments 48 hours prior to the deadline.", 14),
                ("Mentor Check-in Completed", "One-on-one academic counselling completed; mutually agreed action plan established.", 25),
                ("Assessment Score Milestone", "Improved internal assessment score by +8% compared to baseline benchmark.", 38),
            ]
            # Select 2 to 4 milestones for each student deterministically
            num_milestones = 2 + (idx % 3)
            for m_i in range(num_milestones):
                m_title, m_desc, m_days = milestone_bank[m_i]
                store.add_milestone(
                    student_id=stu_id,
                    title=m_title,
                    details=m_desc,
                    recorded_by=mentor_id or "LW-FAC-0001",
                    date_str=(base_time - datetime.timedelta(days=m_days)).strftime("%Y-%m-%d")
                )

            # Assignment Submissions for Semester 4
            for a_idx, a in enumerate(assignment_templates):
                if a["due_days_ago"] < 0:
                    status = "pending"
                    marks = None
                elif target_band == "Red" and a_idx in (2, 3):
                    status = "missed"
                    marks = 0
                elif target_band in ("Red", "Amber") and a_idx == 1:
                    status = "late"
                    marks = random.randint(55, 75)
                else:
                    status = "submitted"
                    marks = random.randint(70, 95)

                store.assignment_submissions.append({
                    "id": f"SUB-{stu_id}-{a['id']}",
                    "student_id": stu_id,
                    "student_name": s_name,
                    "assignment_id": a["id"],
                    "assignment_title": a["title"],
                    "subject_code": a["code"],
                    "status": status,
                    "submitted_at": (base_time - datetime.timedelta(days=a["due_days_ago"] - 1)).strftime("%Y-%m-%d %H:%M") if status in ("submitted", "late") else None,
                    "marks": marks
                })

            # Interventions for Red/Amber students
            if target_band in ("Red", "Amber") and mentor_id:
                store.interventions.append({
                    "id": f"INTV-{stu_id}-01",
                    "student_id": stu_id,
                    "mentor_id": mentor_id,
                    "type": "attendance counselling" if overall_att_target < 75 else "remedial/peer tutoring",
                    "status": "in progress" if idx % 2 == 0 else "accepted",
                    "reject_reason": None,
                    "notes": "Action plan defined for weekly attendance verification and tutorial sessions.",
                    "created_at": (base_time - datetime.timedelta(days=5)).isoformat(),
                    "updated_at": (base_time - datetime.timedelta(days=2)).isoformat()
                })
                store.interventions.append({
                    "id": f"INTV-{stu_id}-02",
                    "student_id": stu_id,
                    "mentor_id": mentor_id,
                    "type": "study-plan check-in",
                    "status": "pending",
                    "reject_reason": None,
                    "notes": "Scheduled bi-weekly review sessions for Algorithms and Database concepts.",
                    "created_at": (base_time - datetime.timedelta(days=3)).isoformat(),
                    "updated_at": (base_time - datetime.timedelta(days=3)).isoformat()
                })

            # Sample Chat Message
            if mentor_id and idx in (1, 2, 4, 5, 8, 11, 14):
                store.chat_messages.append({
                    "id": f"MSG-{stu_id}-01",
                    "sender_id": mentor_id,
                    "receiver_id": stu_id,
                    "text": f"Hi {s_name.split()[0]}, I noticed your recent attendance in Operating Systems slipped below 75%. Let's meet tomorrow during office hours.",
                    "timestamp": (base_time - datetime.timedelta(days=2, hours=3)).isoformat(),
                    "is_read": True
                })
                store.chat_messages.append({
                    "id": f"MSG-{stu_id}-02",
                    "sender_id": stu_id,
                    "receiver_id": mentor_id,
                    "text": "Thank you Professor. I was unwell last week, but I will be there at 3 PM to review the missed topics.",
                    "timestamp": (base_time - datetime.timedelta(days=1, hours=4)).isoformat(),
                    "is_read": False if idx in (1, 4) else True
                })

            # Exam Seating data for each student
            store.exam_seating.append({
                "student_id": stu_id,
                "student_name": s_name,
                "roll_no": f"23BCSE{idx:03d}",
                "exam_name": "Mid-Term Examination Spring 2026",
                "subject": "Design & Analysis of Algorithms (CS401)",
                "exam_date": (base_time + datetime.timedelta(days=14)).strftime("%Y-%m-%d"),
                "exam_time": "10:00 AM - 01:00 PM",
                "room_no": f"LH-{101 + (idx // 15)}",
                "seat_no": f"R{(idx % 15) + 1}-C{((idx % 3) + 1)}",
                "block": "Block B (Academic Complex)"
            })
            store.exam_seating.append({
                "student_id": stu_id,
                "student_name": s_name,
                "roll_no": f"23BCSE{idx:03d}",
                "exam_name": "Mid-Term Examination Spring 2026",
                "subject": "Database Management Systems (CS403)",
                "exam_date": (base_time + datetime.timedelta(days=16)).strftime("%Y-%m-%d"),
                "exam_time": "02:00 PM - 05:00 PM",
                "room_no": f"LH-{101 + (idx // 15)}",
                "seat_no": f"R{(idx % 15) + 1}-C{((idx % 3) + 1)}",
                "block": "Block B (Academic Complex)"
            })

        # 5b. Additional Student Cohort from UCI Student Performance Dataset (student-mat.csv)
        from app.seed_loader import load_uci_students
        load_uci_students(csv_path="backend/data/student-mat.csv", limit=120, seed=42, store=store)

        # 6. Notices
        sample_notices = [
            {
                "id": "NOT-001",
                "title": "Mid-Term Examination Schedule & Hall Ticket Issuance",
                "content": "All students enrolled in Semester 4 are advised to download and print their Hall Tickets from the Exam Seating tab. Entry without official hall ticket and college ID card will not be permitted.",
                "category": "Examinations",
                "author_id": "LW-ADM-0001",
                "author_name": "Dr. Ramesh Sharma (Dean Academic)",
                "created_at": (base_time - datetime.timedelta(days=2)).isoformat(),
                "pinned": True
            },
            {
                "id": "NOT-002",
                "title": "Mandatory 75% Attendance Compliance Notice",
                "content": "In accordance with institutional academic regulations, students with overall attendance below 75% must schedule a mandatory counselling session with their faculty mentor before end-term condonation deadlines.",
                "category": "Academic Policy",
                "author_id": "LW-ADM-0001",
                "author_name": "Dr. Ramesh Sharma (Dean Academic)",
                "created_at": (base_time - datetime.timedelta(days=5)).isoformat(),
                "pinned": True
            },
            {
                "id": "NOT-003",
                "title": "Remedial Tutoring & Peer Study Sessions Schedule",
                "content": "Department peer-led study groups for Data Structures and Operating Systems are now operational in Central Library Discussion Room 3, every Tuesday and Thursday from 4:30 PM to 6:00 PM.",
                "category": "Academic Support",
                "author_id": "LW-FAC-0001",
                "author_name": "Prof. Sunita Rao",
                "created_at": (base_time - datetime.timedelta(days=8)).isoformat(),
                "pinned": False
            }
        ]
        for n in sample_notices:
            store.notices.append(n)

        # 7. Notifications (Phase 1)
        # Seed realistic notifications covering all 6 types:
        # assignment, deadline, quiz, timetable, intervention, general
        sample_notifications = [
            # Aarav Mehta (LW-STU-0001)
            {
                "id": "NOTIF-00001",
                "user_id": "LW-STU-0001",
                "type": "deadline",
                "title": "Deadline Reminder: Full Stack API & Security Practice",
                "message": "Assignment ASN-06 is due in 24 hours. Submit your repository link before 11:59 PM.",
                "link": "/student/attendance",
                "created_at": (base_time - datetime.timedelta(hours=2)).isoformat(),
                "read": False
            },
            {
                "id": "NOTIF-00002",
                "user_id": "LW-STU-0001",
                "type": "intervention",
                "title": "Mentorship Check-in Scheduled",
                "message": "Prof. Sunita Rao has flagged your record for attendance counselling this Thursday at 3:30 PM.",
                "link": "/student/mentor",
                "created_at": (base_time - datetime.timedelta(hours=5)).isoformat(),
                "read": False
            },
            {
                "id": "NOTIF-00003",
                "user_id": "LW-STU-0001",
                "type": "assignment",
                "title": "New Assignment Published: CS403 DBMS",
                "message": "ER Modeling & Normalization Assignment (ASN-03) has been uploaded. Maximum marks: 100.",
                "link": "/student/attendance",
                "created_at": (base_time - datetime.timedelta(days=1, hours=3)).isoformat(),
                "read": False
            },
            {
                "id": "NOTIF-00004",
                "user_id": "LW-STU-0001",
                "type": "quiz",
                "title": "Verification Quiz Available",
                "message": "A short verification quiz for Algorithms Unit 3 has been activated by your instructor.",
                "link": "/student/results",
                "created_at": (base_time - datetime.timedelta(days=2)).isoformat(),
                "read": True
            },
            {
                "id": "NOTIF-00005",
                "user_id": "LW-STU-0001",
                "type": "timetable",
                "title": "Classroom Venue Relocation",
                "message": "Tomorrow's CS401 lecture is moved to Lecture Hall LH-204 (Block B).",
                "link": "/student/dashboard",
                "created_at": (base_time - datetime.timedelta(days=3)).isoformat(),
                "read": True
            },
            {
                "id": "NOTIF-00006",
                "user_id": "LW-STU-0001",
                "type": "general",
                "title": "Mid-Term Examination Hall Tickets Released",
                "message": "Official hall tickets and desk seating allocations are ready for download.",
                "link": "/student/exam-seating",
                "created_at": (base_time - datetime.timedelta(days=4)).isoformat(),
                "read": True
            },
            # Priya Nair (LW-STU-0002)
            {
                "id": "NOTIF-00007",
                "user_id": "LW-STU-0002",
                "type": "deadline",
                "title": "Deadline Reminder: Full Stack API & Security Practice",
                "message": "Assignment ASN-06 is due in 24 hours. Submit your repository link before 11:59 PM.",
                "link": "/student/attendance",
                "created_at": (base_time - datetime.timedelta(hours=2)).isoformat(),
                "read": False
            },
            {
                "id": "NOTIF-00008",
                "user_id": "LW-STU-0002",
                "type": "intervention",
                "title": "Remedial Study Group Recommended",
                "message": "Your mentor Prof. Sunita Rao recommended joining the Thursday CS402 peer study group.",
                "link": "/student/mentor",
                "created_at": (base_time - datetime.timedelta(hours=8)).isoformat(),
                "read": False
            },
            # Ananya Verma (LW-STU-0004) - Amber band
            {
                "id": "NOTIF-00009",
                "user_id": "LW-STU-0004",
                "type": "deadline",
                "title": "Upcoming Submission Deadline",
                "message": "Process Synchronization Lab report is due tomorrow at 5:00 PM.",
                "link": "/student/attendance",
                "created_at": (base_time - datetime.timedelta(hours=1)).isoformat(),
                "read": False
            },
            {
                "id": "NOTIF-00010",
                "user_id": "LW-STU-0004",
                "type": "quiz",
                "title": "OS Concept Quiz Scheduled",
                "message": "Operating Systems Chapter 4 Quiz will open this Friday at 10:00 AM.",
                "link": "/student/results",
                "created_at": (base_time - datetime.timedelta(days=1)).isoformat(),
                "read": False
            },
            # Aditya Sharma (LW-STU-0008) - Green band
            {
                "id": "NOTIF-00011",
                "user_id": "LW-STU-0008",
                "type": "general",
                "title": "Dean's Commendation List Updated",
                "message": "Your academic performance has met the threshold for the semester honors recommendation.",
                "link": "/student/results",
                "created_at": (base_time - datetime.timedelta(hours=4)).isoformat(),
                "read": False
            },
            {
                "id": "NOTIF-00012",
                "user_id": "LW-STU-0008",
                "type": "assignment",
                "title": "Elective Project Topic Selection",
                "message": "Select your capstone research domain under Prof. Anita Desai before end of week.",
                "link": "/student/dashboard",
                "created_at": (base_time - datetime.timedelta(days=1)).isoformat(),
                "read": True
            },
            # Faculty (LW-FAC-0001)
            {
                "id": "NOTIF-00013",
                "user_id": "LW-FAC-0001",
                "type": "intervention",
                "title": "Mentee Attendance Warning: Aarav Mehta",
                "message": "Mentee Aarav Mehta has fallen below the 70% threshold in Operating Systems (CS402).",
                "link": "/faculty/mentorship",
                "created_at": (base_time - datetime.timedelta(hours=6)).isoformat(),
                "read": False
            },
            {
                "id": "NOTIF-00014",
                "user_id": "LW-FAC-0001",
                "type": "general",
                "title": "Academic Council Department Meeting",
                "message": "Department curriculum review session scheduled for Friday at 3:00 PM in Conference Room 1.",
                "link": "/faculty/dashboard",
                "created_at": (base_time - datetime.timedelta(days=1)).isoformat(),
                "read": False
            },
            # Admin (LW-ADM-0001)
            {
                "id": "NOTIF-00015",
                "user_id": "LW-ADM-0001",
                "type": "general",
                "title": "End-Semester Seating Plan Finalized",
                "message": "All examination halls and seating allotments have been indexed across Semester 4 batches.",
                "link": "/admin/exam-seating",
                "created_at": (base_time - datetime.timedelta(hours=3)).isoformat(),
                "read": False
            }
        ]
        for notif in sample_notifications:
            store.notifications.append(notif)

        # 8. Timetable Slots (Phase 2)
        # Non-conflicting schedules across Monday-Friday for Section A & B
        tt_templates = [
            # Monday
            ("Monday", "09:00", "10:00", "CS401", "LW-FAC-0001", "LH-101", "A"),
            ("Monday", "10:15", "11:15", "CS402", "LW-FAC-0001", "LH-101", "A"),
            ("Monday", "11:30", "12:30", "CS403", "LW-FAC-0002", "LH-101", "A"),
            ("Monday", "14:00", "16:00", "CS406", "LW-FAC-0003", "Lab-4", "A"),
            ("Monday", "09:00", "10:00", "CS403", "LW-FAC-0002", "LH-102", "B"),
            ("Monday", "10:15", "11:15", "CS404", "LW-FAC-0002", "LH-102", "B"),
            # Tuesday
            ("Tuesday", "09:00", "10:00", "CS404", "LW-FAC-0002", "LH-101", "A"),
            ("Tuesday", "10:15", "11:15", "CS405", "LW-FAC-0003", "LH-101", "A"),
            ("Tuesday", "11:30", "12:30", "CS401", "LW-FAC-0001", "LH-101", "A"),
            ("Tuesday", "14:00", "15:00", "CS402", "LW-FAC-0001", "LH-101", "A"),
            ("Tuesday", "09:00", "10:00", "CS401", "LW-FAC-0001", "LH-102", "B"),
            ("Tuesday", "10:15", "11:15", "CS403", "LW-FAC-0002", "LH-102", "B"),
            # Wednesday
            ("Wednesday", "09:00", "10:00", "CS402", "LW-FAC-0001", "LH-101", "A"),
            ("Wednesday", "10:15", "11:15", "CS403", "LW-FAC-0002", "LH-101", "A"),
            ("Wednesday", "11:30", "12:30", "CS405", "LW-FAC-0003", "LH-101", "A"),
            ("Wednesday", "14:00", "16:00", "CS406", "LW-FAC-0003", "Lab-4", "B"),
            # Thursday
            ("Thursday", "09:00", "10:00", "CS401", "LW-FAC-0001", "LH-101", "A"),
            ("Thursday", "10:15", "11:15", "CS404", "LW-FAC-0002", "LH-101", "A"),
            ("Thursday", "11:30", "12:30", "CS402", "LW-FAC-0001", "LH-101", "A"),
            ("Thursday", "14:00", "15:00", "CS405", "LW-FAC-0003", "LH-101", "A"),
            # Friday
            ("Friday", "09:00", "10:00", "CS403", "LW-FAC-0002", "LH-101", "A"),
            ("Friday", "10:15", "11:15", "CS401", "LW-FAC-0001", "LH-101", "A"),
            ("Friday", "11:30", "12:30", "CS404", "LW-FAC-0002", "LH-101", "A"),
            ("Friday", "14:00", "15:00", "CS402", "LW-FAC-0001", "LH-101", "A"),
        ]

        for idx, (day, s_time, e_time, code, fac_id, room, sec) in enumerate(tt_templates, start=1):
            sub = store.subjects.get(code, {})
            fac = store.users.get(fac_id, {})
            slot_entry = {
                "id": f"TT-{idx:03d}",
                "day": day,
                "start_time": s_time,
                "end_time": e_time,
                "subject_code": code,
                "subject_name": sub.get("name", code),
                "faculty_id": fac_id,
                "faculty_name": fac.get("name", fac_id),
                "classroom": room,
                "section": sec,
                "semester": 4,
                "created_at": (base_time - datetime.timedelta(days=30)).isoformat()
            }
            store.timetable_slots.append(slot_entry)

        # 9. Extra Assignments (Phase 3)
        easn_1 = {
            "id": "EASN-001",
            "mentor_id": "LW-FAC-0001",
            "mentor_name": "Prof. Sunita Rao",
            "title": "Dynamic Programming & Memoization Clinic",
            "description": "Solve optimal substructure exercises for 0/1 Knapsack and Longest Common Subsequence. Review standard DP recurrence relations before answering the quiz.",
            "subject_code": "CS401",
            "student_ids": ["LW-STU-0001", "LW-STU-0002", "LW-STU-0003"],
            "due_date": (base_time + datetime.timedelta(days=5)).strftime("%Y-%m-%d"),
            "questions": [
                {
                    "id": "Q1",
                    "question": "What is the primary difference between Memoization and Tabulation in DP?",
                    "options": [
                        "Memoization is top-down using recursion; Tabulation is bottom-up using iteration.",
                        "Memoization is iterative; Tabulation is recursive.",
                        "Memoization requires more space than Tabulation always.",
                        "Tabulation cannot solve optimal substructure problems."
                    ],
                    "correct_option": 0,
                    "explanation": "Memoization caches recursive call results top-down, whereas Tabulation iteratively builds a DP table bottom-up."
                },
                {
                    "id": "Q2",
                    "question": "Which algorithmic problem exhibits optimal substructure?",
                    "options": [
                        "Fractional Knapsack",
                        "0/1 Knapsack",
                        "Longest Common Subsequence",
                        "Both 0/1 Knapsack and Longest Common Subsequence"
                    ],
                    "correct_option": 3,
                    "explanation": "Both 0/1 Knapsack and LCS can be solved with subproblems that provide the optimal solution to larger instances."
                },
                {
                    "id": "Q3",
                    "question": "What is the time complexity of the standard 0/1 Knapsack DP solution with N items and capacity W?",
                    "options": ["O(N log W)", "O(N * W)", "O(2^N)", "O(N + W)"],
                    "correct_option": 1,
                    "explanation": "The pseudo-polynomial DP solution runs in O(N * W) time using a 2D matrix or optimized 1D array."
                }
            ],
            "created_at": (base_time - datetime.timedelta(days=2)).isoformat()
        }
        store.extra_assignments["EASN-001"] = easn_1

        easn_2 = {
            "id": "EASN-002",
            "mentor_id": "LW-FAC-0001",
            "mentor_name": "Prof. Sunita Rao",
            "title": "Process Deadlocks & Banker's Safety Verification",
            "description": "Trace safe state allocation vectors and deadlock prevention strategies in OS.",
            "subject_code": "CS402",
            "student_ids": ["LW-STU-0001", "LW-STU-0004"],
            "due_date": (base_time - datetime.timedelta(days=2)).strftime("%Y-%m-%d"),  # Expired deadline
            "questions": [
                {
                    "id": "Q1",
                    "question": "Which condition is NOT one of Coffman's four deadlock conditions?",
                    "options": ["Mutual exclusion", "Hold and wait", "Preemption allowed", "Circular wait"],
                    "correct_option": 2,
                    "explanation": "No preemption is the necessary condition. If preemption is allowed, deadlock cannot occur."
                },
                {
                    "id": "Q2",
                    "question": "What is the safety state criterion in Banker's algorithm?",
                    "options": [
                        "There exists at least one sequence of process execution that allows all processes to finish.",
                        "All processes must request resources simultaneously.",
                        "The system has zero free resource instances remaining.",
                        "Only high-priority threads acquire locks."
                    ],
                    "correct_option": 0,
                    "explanation": "A state is considered safe if there exists a safe sequence where each process can allocate its maximum need and finish."
                }
            ],
            "created_at": (base_time - datetime.timedelta(days=9)).isoformat()
        }
        store.extra_assignments["EASN-002"] = easn_2

        # 10. Question Bank (Phase 4)
        sample_questions = [
            {
                "id": "QB-0001",
                "subject_code": "CS401",
                "subject_name": "Design & Analysis of Algorithms",
                "year": 2025,
                "semester": 4,
                "exam_type": "IA1",
                "unit": "Unit 1: Divide and Conquer",
                "topic": "Master Theorem & Recurrence Relations",
                "marks": 10,
                "question_text": "State Master's Theorem. Solve the recurrence relation T(n) = 3T(n/4) + n log n and determine its asymptotic tight bound.",
                "attachment_url": "",
                "attachment_name": "",
                "uploaded_by": "LW-FAC-0001",
                "uploader_name": "Prof. Sunita Rao",
                "uploader_role": "Faculty",
                "created_at": (base_time - datetime.timedelta(days=20)).isoformat()
            },
            {
                "id": "QB-0002",
                "subject_code": "CS401",
                "subject_name": "Design & Analysis of Algorithms",
                "year": 2024,
                "semester": 4,
                "exam_type": "End-sem",
                "unit": "Unit 3: Dynamic Programming",
                "topic": "Matrix Chain Multiplication",
                "marks": 14,
                "question_text": "Explain the Matrix Chain Multiplication problem. Find the most optimal parenthesization for dimensions <10, 20, 30, 40, 30> using DP.",
                "attachment_url": "",
                "attachment_name": "",
                "uploaded_by": "LW-ADM-0001",
                "uploader_name": "Dr. Ramesh Sharma (Dean Academic)",
                "uploader_role": "Admin",
                "created_at": (base_time - datetime.timedelta(days=40)).isoformat()
            },
            {
                "id": "QB-0003",
                "subject_code": "CS402",
                "subject_name": "Operating Systems",
                "year": 2025,
                "semester": 4,
                "exam_type": "IA2",
                "unit": "Unit 2: Concurrency & Synchronization",
                "topic": "Semaphores and Dining Philosophers",
                "marks": 8,
                "question_text": "Describe the Dining Philosophers synchronization challenge. Propose a starvation-free semaphore-based solution with pseudo-code.",
                "attachment_url": "",
                "attachment_name": "",
                "uploaded_by": "LW-FAC-0001",
                "uploader_name": "Prof. Sunita Rao",
                "uploader_role": "Faculty",
                "created_at": (base_time - datetime.timedelta(days=15)).isoformat()
            },
            {
                "id": "QB-0004",
                "subject_code": "CS403",
                "subject_name": "Database Management Systems",
                "year": 2024,
                "semester": 4,
                "exam_type": "End-sem",
                "unit": "Unit 4: Relational Normalization",
                "topic": "BCNF and 3NF Decomposition",
                "marks": 12,
                "question_text": "Differentiate between 3NF and BCNF with functional dependencies. Given R(A,B,C,D,E) with F={A->BC, CD->E, B->D}, test if R is in BCNF.",
                "attachment_url": "",
                "attachment_name": "",
                "uploaded_by": "LW-FAC-0002",
                "uploader_name": "Dr. Rajesh Kulkarni",
                "uploader_role": "Faculty",
                "created_at": (base_time - datetime.timedelta(days=35)).isoformat()
            }
        ]
        for q in sample_questions:
            store.question_bank.append(q)

        # 11. Live Quizzes (Phase 5)
        live_quiz_1 = {
            "id": "QUIZ-0001",
            "title": "Operating Systems Semaphore & Threads Live Sprint",
            "subject_code": "CS402",
            "subject_name": "Operating Systems",
            "section": "A",
            "time_limit_minutes": 10,
            "teacher_id": "LW-FAC-0001",
            "teacher_name": "Prof. Sunita Rao",
            "status": "draft",
            "pin": None,
            "questions": [
                {
                    "id": "LQ1",
                    "question": "Which scheduling algorithm is non-preemptive?",
                    "options": ["Round Robin", "First-Come First-Served (FCFS)", "Shortest Remaining Time First", "Priority Preemptive"],
                    "correct_option": 1
                },
                {
                    "id": "LQ2",
                    "question": "What is the effect of wait() operation on a semaphore variable S?",
                    "options": ["S++", "S--", "S is reset to 1", "S is doubled"],
                    "correct_option": 1
                },
                {
                    "id": "LQ3",
                    "question": "Which component is shared across threads of the same process?",
                    "options": ["Stack memory", "Register set", "Heap and code segments", "Program counter"],
                    "correct_option": 2
                }
            ],
            "participants": {},
            "submissions": {},
            "created_at": (base_time - datetime.timedelta(hours=4)).isoformat()
        }
        store.live_quizzes["QUIZ-0001"] = live_quiz_1

        # Seed an ended quiz with submissions to test leaderboard & class average
        ended_quiz = {
            "id": "QUIZ-0002",
            "title": "Algorithms Complexity Blitz",
            "subject_code": "CS401",
            "subject_name": "Design & Analysis of Algorithms",
            "section": "A",
            "time_limit_minutes": 5,
            "teacher_id": "LW-FAC-0001",
            "teacher_name": "Prof. Sunita Rao",
            "status": "ended",
            "pin": None,
            "questions": [
                {
                    "id": "EQ1",
                    "question": "Worst-case time complexity of QuickSort is:",
                    "options": ["O(N log N)", "O(N^2)", "O(N)", "O(log N)"],
                    "correct_option": 1
                },
                {
                    "id": "EQ2",
                    "question": "Which data structure is utilized in breadth-first search?",
                    "options": ["Stack", "Queue", "Priority Queue", "Binary Search Tree"],
                    "correct_option": 1
                }
            ],
            "participants": {
                "LW-STU-0001": (base_time - datetime.timedelta(days=1, minutes=10)).isoformat(),
                "LW-STU-0002": (base_time - datetime.timedelta(days=1, minutes=9)).isoformat(),
                "LW-STU-0004": (base_time - datetime.timedelta(days=1, minutes=8)).isoformat(),
            },
            "submissions": {
                "LW-STU-0001": {
                    "student_id": "LW-STU-0001",
                    "student_name": "Aarav Mehta",
                    "roll_no": "23BCSE001",
                    "score": 2,
                    "total_questions": 2,
                    "percentage": 100.0,
                    "time_taken_seconds": 120,
                    "submitted_at": (base_time - datetime.timedelta(days=1, minutes=8)).isoformat(),
                    "answers": {"EQ1": 1, "EQ2": 1}
                },
                "LW-STU-0002": {
                    "student_id": "LW-STU-0002",
                    "student_name": "Priya Nair",
                    "roll_no": "23BCSE002",
                    "score": 1,
                    "total_questions": 2,
                    "percentage": 50.0,
                    "time_taken_seconds": 145,
                    "submitted_at": (base_time - datetime.timedelta(days=1, minutes=7)).isoformat(),
                    "answers": {"EQ1": 1, "EQ2": 0}
                }
            },
            "created_at": (base_time - datetime.timedelta(days=2)).isoformat(),
            "ended_at": (base_time - datetime.timedelta(days=1)).isoformat()
        }
        store.live_quizzes["QUIZ-0002"] = ended_quiz

        # 12. Intervention Effectiveness Tracker Snapshots (Phase 7)
        past_snapshots = [
            {
                "id": "INTV-TRK-0001",
                "student_id": "LW-STU-0001",
                "student_name": "Aarav Mehta",
                "roll_no": "23BCSE001",
                "mentor_id": "LW-FAC-0001",
                "mentor_name": "Prof. Sunita Rao",
                "type": "counselling",
                "notes": "1-on-1 attendance counselling to address lab class absence patterns.",
                "logged_at": (base_time - datetime.timedelta(days=21)).isoformat(),
                "follow_up_due_date": (base_time - datetime.timedelta(days=7)).strftime("%Y-%m-%d"),
                "before_snapshot": {
                    "risk_score": 78.4,
                    "risk_band": "Red",
                    "attendance_pct": 58.0,
                    "marks_pct": 62.0,
                    "captured_at": (base_time - datetime.timedelta(days=21)).isoformat()
                },
                "after_snapshot": {
                    "risk_score": 64.0,
                    "risk_band": "Amber",
                    "attendance_pct": 70.0,
                    "marks_pct": 66.0,
                    "captured_at": (base_time - datetime.timedelta(days=7)).isoformat()
                },
                "outcome": "Improved",
                "alternative_suggestion": None
            },
            {
                "id": "INTV-TRK-0002",
                "student_id": "LW-STU-0002",
                "student_name": "Priya Nair",
                "roll_no": "23BCSE002",
                "mentor_id": "LW-FAC-0001",
                "mentor_name": "Prof. Sunita Rao",
                "type": "attendance warning",
                "notes": "Formal letter warning regarding low attendance in CS402.",
                "logged_at": (base_time - datetime.timedelta(days=16)).isoformat(),
                "follow_up_due_date": (base_time - datetime.timedelta(days=2)).strftime("%Y-%m-%d"),
                "before_snapshot": {
                    "risk_score": 72.0,
                    "risk_band": "Red",
                    "attendance_pct": 61.0,
                    "marks_pct": 58.0,
                    "captured_at": (base_time - datetime.timedelta(days=16)).isoformat()
                },
                "after_snapshot": {
                    "risk_score": 74.0,
                    "risk_band": "Red",
                    "attendance_pct": 60.0,
                    "marks_pct": 57.0,
                    "captured_at": (base_time - datetime.timedelta(days=2)).isoformat()
                },
                "outcome": "Worsened",
                "alternative_suggestion": "Formal attendance warning showed limited impact. Recommend escalating to 'parent contact' or scheduling 'peer study group'."
            },
            {
                "id": "INTV-TRK-0003",
                "student_id": "LW-STU-0004",
                "student_name": "Ananya Verma",
                "roll_no": "23BCSE004",
                "mentor_id": "LW-FAC-0001",
                "mentor_name": "Prof. Sunita Rao",
                "type": "peer study group",
                "notes": "Enrolled into Thursday Operating Systems library peer tutoring circle.",
                "logged_at": (base_time - datetime.timedelta(days=18)).isoformat(),
                "follow_up_due_date": (base_time - datetime.timedelta(days=4)).strftime("%Y-%m-%d"),
                "before_snapshot": {
                    "risk_score": 58.0,
                    "risk_band": "Amber",
                    "attendance_pct": 71.0,
                    "marks_pct": 68.0,
                    "captured_at": (base_time - datetime.timedelta(days=18)).isoformat()
                },
                "after_snapshot": {
                    "risk_score": 48.0,
                    "risk_band": "Amber",
                    "attendance_pct": 78.0,
                    "marks_pct": 74.0,
                    "captured_at": (base_time - datetime.timedelta(days=4)).isoformat()
                },
                "outcome": "Improved",
                "alternative_suggestion": None
            },
            {
                "id": "INTV-TRK-0004",
                "student_id": "LW-STU-0001",
                "student_name": "Aarav Mehta",
                "roll_no": "23BCSE001",
                "mentor_id": "LW-FAC-0001",
                "mentor_name": "Prof. Sunita Rao",
                "type": "extra classes",
                "notes": "Remedial lab sessions for full stack engineering.",
                "logged_at": (base_time - datetime.timedelta(days=3)).isoformat(),
                "follow_up_due_date": (base_time + datetime.timedelta(days=11)).strftime("%Y-%m-%d"),
                "before_snapshot": {
                    "risk_score": 64.0,
                    "risk_band": "Amber",
                    "attendance_pct": 70.0,
                    "marks_pct": 66.0,
                    "captured_at": (base_time - datetime.timedelta(days=3)).isoformat()
                },
                "after_snapshot": None,
                "outcome": None,
                "alternative_suggestion": None
            },
            {
                "id": "INTV-TRK-0005",
                "student_id": "LW-STU-0003",
                "student_name": store.users.get("LW-STU-0003", {}).get("name", "Student 0003"),
                "roll_no": "23BCSE003",
                "mentor_id": "LW-FAC-0002",
                "mentor_name": "Dr. Rajesh Kulkarni",
                "type": "peer study group",
                "notes": "Assigned to Tuesday Operating Systems peer discussion group.",
                "logged_at": (base_time - datetime.timedelta(days=24)).isoformat(),
                "follow_up_due_date": (base_time - datetime.timedelta(days=10)).strftime("%Y-%m-%d"),
                "before_snapshot": {
                    "risk_score": 74.0,
                    "risk_band": "Red",
                    "attendance_pct": 62.0,
                    "marks_pct": 54.0,
                    "captured_at": (base_time - datetime.timedelta(days=24)).isoformat()
                },
                "after_snapshot": {
                    "risk_score": 52.0,
                    "risk_band": "Amber",
                    "attendance_pct": 74.0,
                    "marks_pct": 65.0,
                    "captured_at": (base_time - datetime.timedelta(days=10)).isoformat()
                },
                "outcome": "Improved",
                "alternative_suggestion": None
            },
            {
                "id": "INTV-TRK-0006",
                "student_id": "LW-STU-0005",
                "student_name": store.users.get("LW-STU-0005", {}).get("name", "Student 0005"),
                "roll_no": "23BCSE005",
                "mentor_id": "LW-FAC-0003",
                "mentor_name": "Prof. Anita Desai",
                "type": "attendance counselling",
                "notes": "Discussed morning commute delays affecting 9 AM lecture attendance.",
                "logged_at": (base_time - datetime.timedelta(days=22)).isoformat(),
                "follow_up_due_date": (base_time - datetime.timedelta(days=8)).strftime("%Y-%m-%d"),
                "before_snapshot": {
                    "risk_score": 78.0,
                    "risk_band": "Red",
                    "attendance_pct": 59.0,
                    "marks_pct": 58.0,
                    "captured_at": (base_time - datetime.timedelta(days=22)).isoformat()
                },
                "after_snapshot": {
                    "risk_score": 58.0,
                    "risk_band": "Amber",
                    "attendance_pct": 72.0,
                    "marks_pct": 62.0,
                    "captured_at": (base_time - datetime.timedelta(days=8)).isoformat()
                },
                "outcome": "Improved",
                "alternative_suggestion": None
            },
            {
                "id": "INTV-TRK-0007",
                "student_id": "LW-STU-0006",
                "student_name": store.users.get("LW-STU-0006", {}).get("name", "Student 0006"),
                "roll_no": "23BCSE006",
                "mentor_id": "LW-FAC-0001",
                "mentor_name": "Prof. Sunita Rao",
                "type": "remedial/peer tutoring",
                "notes": "Remedial tutorials for Discrete Mathematics and Algorithms.",
                "logged_at": (base_time - datetime.timedelta(days=20)).isoformat(),
                "follow_up_due_date": (base_time - datetime.timedelta(days=6)).strftime("%Y-%m-%d"),
                "before_snapshot": {
                    "risk_score": 62.0,
                    "risk_band": "Amber",
                    "attendance_pct": 74.0,
                    "marks_pct": 64.0,
                    "captured_at": (base_time - datetime.timedelta(days=20)).isoformat()
                },
                "after_snapshot": {
                    "risk_score": 36.0,
                    "risk_band": "Green",
                    "attendance_pct": 86.0,
                    "marks_pct": 78.0,
                    "captured_at": (base_time - datetime.timedelta(days=6)).isoformat()
                },
                "outcome": "Improved",
                "alternative_suggestion": None
            },
            {
                "id": "INTV-TRK-0008",
                "student_id": "LW-STU-0007",
                "student_name": store.users.get("LW-STU-0007", {}).get("name", "Student 0007"),
                "roll_no": "23BCSE007",
                "mentor_id": "LW-FAC-0002",
                "mentor_name": "Dr. Rajesh Kulkarni",
                "type": "attendance warning",
                "notes": "Warning issued for repeated absence in database lab sessions.",
                "logged_at": (base_time - datetime.timedelta(days=25)).isoformat(),
                "follow_up_due_date": (base_time - datetime.timedelta(days=11)).strftime("%Y-%m-%d"),
                "before_snapshot": {
                    "risk_score": 68.0,
                    "risk_band": "Amber",
                    "attendance_pct": 72.0,
                    "marks_pct": 60.0,
                    "captured_at": (base_time - datetime.timedelta(days=25)).isoformat()
                },
                "after_snapshot": {
                    "risk_score": 76.0,
                    "risk_band": "Red",
                    "attendance_pct": 60.0,
                    "marks_pct": 56.0,
                    "captured_at": (base_time - datetime.timedelta(days=11)).isoformat()
                },
                "outcome": "Worsened",
                "alternative_suggestion": "Formal warning showed adverse reaction. Recommend scheduling supportive parent contact and peer mentor buddy."
            },
            {
                "id": "INTV-TRK-0009",
                "student_id": "LW-STU-0009",
                "student_name": store.users.get("LW-STU-0009", {}).get("name", "Student 0009"),
                "roll_no": "23BCSE009",
                "mentor_id": "LW-FAC-0003",
                "mentor_name": "Prof. Anita Desai",
                "type": "extra classes",
                "notes": "Additional weekend review sessions for Automata and formal grammar.",
                "logged_at": (base_time - datetime.timedelta(days=19)).isoformat(),
                "follow_up_due_date": (base_time - datetime.timedelta(days=5)).strftime("%Y-%m-%d"),
                "before_snapshot": {
                    "risk_score": 72.0,
                    "risk_band": "Red",
                    "attendance_pct": 66.0,
                    "marks_pct": 52.0,
                    "captured_at": (base_time - datetime.timedelta(days=19)).isoformat()
                },
                "after_snapshot": {
                    "risk_score": 54.0,
                    "risk_band": "Amber",
                    "attendance_pct": 78.0,
                    "marks_pct": 68.0,
                    "captured_at": (base_time - datetime.timedelta(days=5)).isoformat()
                },
                "outcome": "Improved",
                "alternative_suggestion": None
            },
            {
                "id": "INTV-TRK-0010",
                "student_id": "LW-STU-0010",
                "student_name": store.users.get("LW-STU-0010", {}).get("name", "Student 0010"),
                "roll_no": "23BCSE010",
                "mentor_id": "LW-FAC-0001",
                "mentor_name": "Prof. Sunita Rao",
                "type": "study-plan check-in",
                "notes": "Reviewed daily study timetable and library revision schedule.",
                "logged_at": (base_time - datetime.timedelta(days=17)).isoformat(),
                "follow_up_due_date": (base_time - datetime.timedelta(days=3)).strftime("%Y-%m-%d"),
                "before_snapshot": {
                    "risk_score": 60.0,
                    "risk_band": "Amber",
                    "attendance_pct": 74.0,
                    "marks_pct": 62.0,
                    "captured_at": (base_time - datetime.timedelta(days=17)).isoformat()
                },
                "after_snapshot": {
                    "risk_score": 38.0,
                    "risk_band": "Green",
                    "attendance_pct": 88.0,
                    "marks_pct": 76.0,
                    "captured_at": (base_time - datetime.timedelta(days=3)).isoformat()
                },
                "outcome": "Improved",
                "alternative_suggestion": None
            },
            {
                "id": "INTV-TRK-0011",
                "student_id": "LW-STU-0011",
                "student_name": store.users.get("LW-STU-0011", {}).get("name", "Student 0011"),
                "roll_no": "23BCSE011",
                "mentor_id": "LW-FAC-0002",
                "mentor_name": "Dr. Rajesh Kulkarni",
                "type": "attendance counselling",
                "notes": "Follow-up session regarding lab class attendance.",
                "logged_at": (base_time - datetime.timedelta(days=21)).isoformat(),
                "follow_up_due_date": (base_time - datetime.timedelta(days=7)).strftime("%Y-%m-%d"),
                "before_snapshot": {
                    "risk_score": 70.0,
                    "risk_band": "Red",
                    "attendance_pct": 64.0,
                    "marks_pct": 58.0,
                    "captured_at": (base_time - datetime.timedelta(days=21)).isoformat()
                },
                "after_snapshot": {
                    "risk_score": 70.0,
                    "risk_band": "Red",
                    "attendance_pct": 64.0,
                    "marks_pct": 58.0,
                    "captured_at": (base_time - datetime.timedelta(days=7)).isoformat()
                },
                "outcome": "No Change",
                "alternative_suggestion": "Attendance plateaued. Recommend one-on-one lab remedial sessions and peer accountability partner."
            },
            {
                "id": "INTV-TRK-0012",
                "student_id": "LW-STU-0012",
                "student_name": store.users.get("LW-STU-0012", {}).get("name", "Student 0012"),
                "roll_no": "23BCSE012",
                "mentor_id": "LW-FAC-0003",
                "mentor_name": "Prof. Anita Desai",
                "type": "peer study group",
                "notes": "Joined the Friday networking and socket programming study circle.",
                "logged_at": (base_time - datetime.timedelta(days=23)).isoformat(),
                "follow_up_due_date": (base_time - datetime.timedelta(days=9)).strftime("%Y-%m-%d"),
                "before_snapshot": {
                    "risk_score": 56.0,
                    "risk_band": "Amber",
                    "attendance_pct": 76.0,
                    "marks_pct": 65.0,
                    "captured_at": (base_time - datetime.timedelta(days=23)).isoformat()
                },
                "after_snapshot": {
                    "risk_score": 34.0,
                    "risk_band": "Green",
                    "attendance_pct": 90.0,
                    "marks_pct": 80.0,
                    "captured_at": (base_time - datetime.timedelta(days=9)).isoformat()
                },
                "outcome": "Improved",
                "alternative_suggestion": None
            },
            {
                "id": "INTV-TRK-0013",
                "student_id": "LW-STU-0013",
                "student_name": store.users.get("LW-STU-0013", {}).get("name", "Student 0013"),
                "roll_no": "23BCSE013",
                "mentor_id": "LW-FAC-0001",
                "mentor_name": "Prof. Sunita Rao",
                "type": "remedial/peer tutoring",
                "notes": "Remedial exercises for recursive divide and conquer analysis.",
                "logged_at": (base_time - datetime.timedelta(days=20)).isoformat(),
                "follow_up_due_date": (base_time - datetime.timedelta(days=6)).strftime("%Y-%m-%d"),
                "before_snapshot": {
                    "risk_score": 75.0,
                    "risk_band": "Red",
                    "attendance_pct": 60.0,
                    "marks_pct": 50.0,
                    "captured_at": (base_time - datetime.timedelta(days=20)).isoformat()
                },
                "after_snapshot": {
                    "risk_score": 61.0,
                    "risk_band": "Amber",
                    "attendance_pct": 72.0,
                    "marks_pct": 62.0,
                    "captured_at": (base_time - datetime.timedelta(days=6)).isoformat()
                },
                "outcome": "Improved",
                "alternative_suggestion": None
            },
            {
                "id": "INTV-TRK-0014",
                "student_id": "LW-STU-0014",
                "student_name": store.users.get("LW-STU-0014", {}).get("name", "Student 0014"),
                "roll_no": "23BCSE014",
                "mentor_id": "LW-FAC-0002",
                "mentor_name": "Dr. Rajesh Kulkarni",
                "type": "extra classes",
                "notes": "Attended 4 remedial lab problem-solving sessions.",
                "logged_at": (base_time - datetime.timedelta(days=18)).isoformat(),
                "follow_up_due_date": (base_time - datetime.timedelta(days=4)).strftime("%Y-%m-%d"),
                "before_snapshot": {
                    "risk_score": 58.0,
                    "risk_band": "Amber",
                    "attendance_pct": 75.0,
                    "marks_pct": 66.0,
                    "captured_at": (base_time - datetime.timedelta(days=18)).isoformat()
                },
                "after_snapshot": {
                    "risk_score": 35.0,
                    "risk_band": "Green",
                    "attendance_pct": 89.0,
                    "marks_pct": 78.0,
                    "captured_at": (base_time - datetime.timedelta(days=4)).isoformat()
                },
                "outcome": "Improved",
                "alternative_suggestion": None
            },
            {
                "id": "INTV-TRK-0015",
                "student_id": "LW-STU-0015",
                "student_name": store.users.get("LW-STU-0015", {}).get("name", "Student 0015"),
                "roll_no": "23BCSE015",
                "mentor_id": "LW-FAC-0003",
                "mentor_name": "Prof. Anita Desai",
                "type": "study-plan check-in",
                "notes": "Reviewed study hours and exam preparation outline.",
                "logged_at": (base_time - datetime.timedelta(days=22)).isoformat(),
                "follow_up_due_date": (base_time - datetime.timedelta(days=8)).strftime("%Y-%m-%d"),
                "before_snapshot": {
                    "risk_score": 64.0,
                    "risk_band": "Amber",
                    "attendance_pct": 71.0,
                    "marks_pct": 60.0,
                    "captured_at": (base_time - datetime.timedelta(days=22)).isoformat()
                },
                "after_snapshot": {
                    "risk_score": 72.0,
                    "risk_band": "Red",
                    "attendance_pct": 63.0,
                    "marks_pct": 54.0,
                    "captured_at": (base_time - datetime.timedelta(days=8)).isoformat()
                },
                "outcome": "Worsened",
                "alternative_suggestion": "Self-directed plan proved insufficient. Recommend structured attendance contract and assigning faculty office hours check-in."
            },
            {
                "id": "INTV-TRK-0016",
                "student_id": "LW-STU-0016",
                "student_name": store.users.get("LW-STU-0016", {}).get("name", "Student 0016"),
                "roll_no": "23BCSE016",
                "mentor_id": "LW-FAC-0001",
                "mentor_name": "Prof. Sunita Rao",
                "type": "attendance counselling",
                "notes": "Mandatory counselling session for 60% attendance threshold.",
                "logged_at": (base_time - datetime.timedelta(days=26)).isoformat(),
                "follow_up_due_date": (base_time - datetime.timedelta(days=12)).strftime("%Y-%m-%d"),
                "before_snapshot": {
                    "risk_score": 80.0,
                    "risk_band": "Red",
                    "attendance_pct": 56.0,
                    "marks_pct": 52.0,
                    "captured_at": (base_time - datetime.timedelta(days=26)).isoformat()
                },
                "after_snapshot": {
                    "risk_score": 64.0,
                    "risk_band": "Amber",
                    "attendance_pct": 70.0,
                    "marks_pct": 61.0,
                    "captured_at": (base_time - datetime.timedelta(days=12)).isoformat()
                },
                "outcome": "Improved",
                "alternative_suggestion": None
            },
            {
                "id": "INTV-TRK-0017",
                "student_id": "LW-STU-0017",
                "student_name": store.users.get("LW-STU-0017", {}).get("name", "Student 0017"),
                "roll_no": "23BCSE017",
                "mentor_id": "LW-FAC-0002",
                "mentor_name": "Dr. Rajesh Kulkarni",
                "type": "peer study group",
                "notes": "Group study sessions for database query optimization.",
                "logged_at": (base_time - datetime.timedelta(days=15)).isoformat(),
                "follow_up_due_date": (base_time - datetime.timedelta(days=1)).strftime("%Y-%m-%d"),
                "before_snapshot": {
                    "risk_score": 52.0,
                    "risk_band": "Amber",
                    "attendance_pct": 78.0,
                    "marks_pct": 68.0,
                    "captured_at": (base_time - datetime.timedelta(days=15)).isoformat()
                },
                "after_snapshot": {
                    "risk_score": 32.0,
                    "risk_band": "Green",
                    "attendance_pct": 92.0,
                    "marks_pct": 82.0,
                    "captured_at": (base_time - datetime.timedelta(days=1)).isoformat()
                },
                "outcome": "Improved",
                "alternative_suggestion": None
            },
            {
                "id": "INTV-TRK-0018",
                "student_id": "LW-STU-0018",
                "student_name": store.users.get("LW-STU-0018", {}).get("name", "Student 0018"),
                "roll_no": "23BCSE018",
                "mentor_id": "LW-FAC-0003",
                "mentor_name": "Prof. Anita Desai",
                "type": "extra classes",
                "notes": "Remedial lecture series underway for Operating Systems paging mechanisms.",
                "logged_at": (base_time - datetime.timedelta(days=4)).isoformat(),
                "follow_up_due_date": (base_time + datetime.timedelta(days=10)).strftime("%Y-%m-%d"),
                "before_snapshot": {
                    "risk_score": 66.0,
                    "risk_band": "Amber",
                    "attendance_pct": 70.0,
                    "marks_pct": 62.0,
                    "captured_at": (base_time - datetime.timedelta(days=4)).isoformat()
                },
                "after_snapshot": None,
                "outcome": None,
                "alternative_suggestion": None
            }
        ]
        for s in past_snapshots:
            store.intervention_snapshots.append(s)
