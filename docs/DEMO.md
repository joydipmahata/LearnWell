# LearnWell - 3-Minute Hackathon Demo Script (PS-06 "ShikshaSetu")

This walk-through demonstrates LearnWell's explainable, decision-support early-intervention capabilities across all three authorized roles: **Faculty (Mentor)**, **Student**, and **Admin**.

---

## ⏱️ Minute 0:00 – 0:45: Landing Page & Transparent Risk Architecture
1. **Public Landing Page (`http://localhost:5173/`)**:
   - Highlight the **"How LearnWell Works"** flowchart:
     `Academic Data Streams -> 0-100 Weighted Score -> Band + Plain-Language Explanation -> Proactive Interventions -> 1-on-1 Guidance -> Turnaround Tracking -> 14-Day Expiry`.
   - Point out the **Fairness Commitment Footer** on every page: zero demographic or protected attributes; non-punitive decision support with auto-expiring flags.
2. **Login Page (`/login`)**:
   - Click **"Sign In"**. Show the three role tabs: **Student**, **Faculty**, **Admin**.
   - Note the **DEMO_MODE panel**: pre-configured 1-click accounts for quick evaluation without manual PIN copying.

---

## ⏱️ Minute 0:45 – 1:45: Faculty / Mentor Experience (Flagship Module)
1. **Log in as Faculty Mentor**:
   - In the Demo panel, click **Log in** next to `Prof. Sunita Rao (LW-FAC-0001)`.
   - Land on the **Mentorship Command Center** (`/faculty/dashboard`):
     - **"Who Needs Me Today"** priority alert: Red band students (e.g. Aarav Mehta) and Amber band students with declining velocity.
     - **Summary Counters**: Green (<40), Amber (40-69), Red (≥70), plus Improving vs. Declining counts.
     - **Recharts Visualizations**: 8-week cohort risk progression bar chart & 30-day attendance shifts.
     - **"What Changed This Week"** event feed: instant awareness of sudden drops or recoveries.
2. **Open Student Case File (`Aarav Mehta` - Red Band)**:
   - Click **"Open Case File"**.
   - Show the **Algorithmic Risk Explanation Banner**:
     - Plain-language explanation citing real data figures (e.g., overall attendance 62.4%, internal exam drop of 11%, 2 missed submissions).
     - Top contributing factors with exact mathematical point weights.
     - Flag expiry badge: 14-day clock active.
   - Switch to **Interventions Tab**:
     - View active structured interventions: *Attendance Counselling*, *Remedial Tutoring*.
     - Demonstrate status transition: click **In Progress** or **Mark Done**.
     - Demonstrate rejection with mandatory reason dialog.
   - Click **"Override Band"**:
     - Demonstrate manual mentor judgment override with mandatory clinical justification reason (audited in the Case Audit Log).
   - Click **"Print Case Report"**:
     - Instant printable/PDF official case dossier.

---

## ⏱️ Minute 1:45 – 2:30: Academic Insights Hub & AI Assistant
1. Navigate to **Mentorship** tab (`/faculty/mentorship`):
   - **At Risk: Results**: Adjust the SGPA Threshold slider (e.g., 6.5) or toggle "Declining Only". Click **Export CSV**.
   - **At Risk: Attendance**: Adjust attendance threshold (75%). Click **Export CSV**.
   - **Results Explorer**: Switch between Semesters 1, 2, 3, and 4; examine Continuous Assessment checkpoints and Quizzes.
   - **Assignments Tracker**: Cohort submission counts (Submitted on Time, Late, Missed, Pending).
   - **Mentor AI Decision Assistant**:
     - Click **"Who needs attention this week?"** -> Returns structured, data-grounded guidance with zero demographic hallucinations.
     - Notice the mandatory citation label: *"AI-generated summary based on data as of [date]. Mentor decides."*
2. Demonstrate **Dynamic QR Class Attendance** (`/faculty/attendance`):
   - Click **"Start QR Session"** for Algorithms (CS401).
   - Live 45-second anti-proxy countdown token is generated (`LW-QR-XXXXXXXX`).

---

## ⏱️ Minute 2:30 – 3:00: Student & Admin Portals
1. **Student Experience**:
   - Log out, or sign in as `Aarav Mehta (LW-STU-0001)`:
   - **3 Core Cards**:
     - *My Risk*: Transparent plain explanation and days remaining.
     - *Attendance Standing*: Total held vs. attended.
     - *Next Upcoming Exam*: Date, hall, and seat number.
   - Open **Attendance & What-If Calculator** (`/student/attendance`):
     - Interactive slider: *"If I attend next 8 classes, projected attendance increases from 62.4% to 75.8% (Exam Eligible)!"*
     - Enter the live faculty QR token to register present.
   - Open **Exam Seating & Hall Ticket** (`/student/exam-seating`):
     - Full official Admit Card with photo box, candidate details, schedule, and **Print Hall Ticket** button.
   - Open **My Mentor** (`/student/mentor`):
     - View assigned mentor, active interventions, and send a message in private 1-on-1 chat.
2. **Admin Experience**:
   - Sign in as `Dr. Ramesh Sharma (LW-ADM-0001)`:
   - **Admin Dashboard**: System counts, unassigned alerts, whole-institution risk donut chart.
   - **User Management** (`/admin/users`): Click **Add Student** -> Auto-generated 6-digit PIN shown ONCE.
   - **Mentor Assignments** (`/admin/mentor-assignments`): 1-click pair unassigned students to faculty mentors.
   - **Exam Seating** (`/admin/exam-seating`): CSV upload parser.
   - **Notices** (`/admin/notices`): Publish campus announcements pinned across all portals.
