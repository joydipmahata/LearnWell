# LearnWell 
**Explainable Early-Intervention Student Platform**

**Hackathon Problem Statement:** PS-06 – ShikshaSetu
**Team:** CodeCraft

> **LearnWell** is an explainable decision-support platform designed to identify students at academic or engagement risk early, explain **why** in plain language citing real figures, and guide faculty mentors through concrete, structured interventions.

## Project Links
| Resource | Link |
|---|---|
| Demo Video | [Watch here](https://youtu.be/ORtVtcEHqJY?si=df2WCrPYmU7f7mC7) |
| Presentation (PPT) | [View here](https://docs.google.com/presentation/d/1JjOVbHDCAwkQwJGujUgG_zJiveb0zkXL/edit?usp=sharing&ouid=100495293853518116218&rtpof=true&sd=true) |
| GitHub Repository | [LearnWell](https://github.com/joydipmahata/LearnWell) |

---

## About the Project
LearnWell uses attendance, assessment and assignment data to calculate a 0–100 risk score for each student, explain the reasons behind it, and suggest suitable interventions to mentors. Mentors always make the final decision.

## Key Features
- Student academic risk identification (Green / Amber / Red bands)
- Explainable risk scores with the top contributing factors and real figures
- Attendance and assessment analysis, including dynamic QR-based class attendance
- Personalized intervention suggestions with a structured status lifecycle
- Faculty/Mentor dashboard, Student dashboard and Admin dashboard
- Mentor feedback, audited band overrides, and progress tracking
- Offline mentor AI assistant with data citations

## User Roles
1. **Student:** personal risk standing, subject-wise attendance with classes needed for 75%, interactive "what-if" calculator, exam hall tickets, and 1-on-1 mentor guidance.
2. **Faculty (Mentor):** access scoped strictly to assigned mentees (enforced by backend 403 authorization), priority feeds, case dossiers, structured interventions, and AI assistance.
3. **Admin:** student and faculty provisioning with single-reveal auto-generated PINs, mentor pairing, CSV exam seating upload, and campus-wide notices.

## Architectural Principles
- **Explainable by design:** a transparent 0–100 weighted model, not a black box. The top 2–3 factors are always shown with actual figures.
- **Fair and non-punitive:** no demographic or personal traits are used. Risk bands are decision support, never punishment.
- **No permanent labels:** risk flags expire after 14 days, or resolve as soon as attendance or assessment improves.
- **Strict role isolation:** each role sees only what it is authorized to see.

---

## Technology Stack
| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Vite, Tailwind CSS v4, React Router v7, Recharts, Lucide Icons, html5-qrcode, jsQR, qrcode.react |
| **Backend** | Python 3.13, FastAPI, Uvicorn, Pydantic v2, PyJWT, bcrypt, python-dotenv |
| **Database** | Thread-safe in-memory store seeded at startup (Supabase supported optionally) |
| **AI / Logic** | Rule-based explainable risk engine and offline mentor assistant (OpenAI/Gemini optional via API keys) |
| **Testing** | Pytest |
| **Styling** | Dark mode (`#0F172A`, `#1E293B`, `#334155`) and light mode (`#F8FAFC`, `#FFFFFF`), WCAG AA contrast |
| **Risk Palette** | Reserved for risk states only: Green `#16A34A`, Amber `#D97706`, Red `#DC2626` |

---

## Explainable Risk Engine
The 0–100 weighted score combines five signals:

```
Risk Score = 0.30 × Attendance Level
           + 0.20 × Attendance Trend
           + 0.25 × Marks Level
           + 0.15 × Marks Trend
           + 0.10 × Missed Submissions
```

| Signal | Weight | Meaning |
|---|---|---|
| Attendance level | 30% | Overall attendance against the 75% institutional threshold |
| Attendance trend | 20% | 30-day velocity (recent 4 weeks vs prior 4 weeks) |
| Marks level | 25% | Mean percentage across internal assessments and prior semester SGPA |
| Marks trend | 15% | Trajectory between earlier and latest assessments |
| Missed submissions | 10% | Count of overdue or late coursework |

### Risk Bands
- 🟢 **Green (< 40):** good standing, low intervention priority.
- 🟡 **Amber (40–69):** moderate risk, recommended check-in and study plan review.
- 🔴 **Red (≥ 70):** high compound risk, immediate intervention required within 48 hours.

---

## Data & Privacy Notice
> Demo marks and absences are derived from the public **UCI Student Performance Dataset** (`G1`, `G2`, `G3`, `absences` only). Names, IDs, emails and phone numbers are **synthetic**.

LearnWell seeds 120 additional students (alongside the core demo accounts) from the UCI Student Performance Dataset (`backend/data/student-mat.csv`, Cortez & Silva, 2008). The loader is `backend/app/seed_loader.py`.

**Fairness and privacy guarantees**
- **Academic signals only:** just 4 columns are used: `G1`, `G2`, `G3` and `absences`.
  - `G1` and `G2` are scaled to internal assessments (`IA1`, `IA2`, out of 50) and a continuous evaluation (`Quiz 1`, out of 20).
  - `G3` is the latest-term milestone and grade trajectory benchmark (G3 − G1).
  - `absences` is converted to attendance across 187 scheduled classes (95% at 0 absences down to 35% at 75 absences), with 30-day daily records.
- **No demographic or personal data:** all other columns (`studytime`, `failures`, `health`, `alcohol`, `family`, `romantic`, `school`, `sex`, `age`, etc.) are excluded and never read by the risk engine or AI assistant.
- **100% synthetic identities:** names, IDs (`LW-STU-0002` onwards), roll numbers (`23BCSE002` onwards), emails (`firstname.lastname@learnwell.edu`) and non-routable phone numbers (`90000xxxxx`, `91000xxxxx`) are all generated. No real person is represented.
- **Realistic risk distribution:** about 55% Green, 28–30% Amber, 15–17% Red.

---

## Project Structure
```
├── backend/
│   ├── app/
│   │   ├── config.py             # Settings, JWT config, DEMO_MODE flag
│   │   ├── auth.py               # bcrypt PIN hashing, JWT generation and verification
│   │   ├── store.py              # Thread-safe in-memory store
│   │   ├── risk_engine.py        # Transparent 0-100 risk scoring and explanations
│   │   ├── assistant.py          # Mentor AI assistant (rule-based, offline by default)
│   │   ├── seed_data.py          # Deterministic seed data (core demo accounts)
│   │   ├── seed_loader.py        # UCI cohort loader (120 students)
│   │   └── routes/               # auth, admin, faculty, student, attendance, interventions,
│   │                             # timetable, quizzes, question bank, notifications, etc.
│   ├── data/student-mat.csv      # UCI Student Performance dataset
│   ├── test_*.py                 # Pytest tests
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/client.js         # Fetch client with auth headers
│   │   ├── context/              # Auth and toast context
│   │   ├── components/           # Navbar, Sidebar, RiskBadge, planners, trackers
│   │   ├── pages/                # student/, faculty/, admin/, shared/, Landing, Login
│   │   └── App.jsx               # Role-based protected routes
│   ├── package.json
│   └── vite.config.js
├── docs/DEMO.md                  # 3-minute demo script
├── .env.example
├── run-dev.bat                   # One-click Windows start
└── run-dev.sh                    # One-click macOS/Linux start
```

---

## Quick Start

**Prerequisites:** Python 3.10+ (tested on 3.13) and Node.js 18+ with npm.

### 1. Clone and configure
```bash
git clone https://github.com/joydipmahata/LearnWell.git
cd LearnWell
cp .env.example .env
```
On Windows use `copy .env.example .env`. The defaults work fully offline, and API keys are optional.

### 2. Option A: One-click scripts
- Windows: `run-dev.bat`
- macOS/Linux: `chmod +x run-dev.sh && ./run-dev.sh`

### 3. Option B: Manual
**Terminal 1: Backend** (from the project root)
```bash
pip install -r backend/requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --app-dir backend --reload
```
API docs: http://127.0.0.1:8000/docs

**Terminal 2: Frontend**
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:5173

### Run the tests (optional)
```bash
cd backend
pip install pytest httpx
python -m pytest
```

---

## Pre-Seeded Demo Credentials
With `DEMO_MODE=true`, the login page also shows a one-click demo panel.

| Role | Unique ID | PIN | Description |
|---|---|---|---|
| Admin | `LW-ADM-0001` | `123456` | Dr. Ramesh Sharma (Dean Academic) |
| Faculty (Mentor) | `LW-FAC-0001` | `123456` | Prof. Sunita Rao (Computer Science) |
| Faculty (Mentor) | `LW-FAC-0002` | `123456` | Dr. Rajesh Kulkarni (Information Tech) |
| Student (Red) | `LW-STU-0001` | `123456` | Aarav Mehta (high compound risk) |
| Student (Amber) | `LW-STU-0004` | `123456` | Ishita Sen (moderate risk) |
| Student (Green) | `LW-STU-0008` | `123456` | Aditya Sharma (good standing) |

---

## Phone Testing (Rotating QR and Geo-fencing)
Mobile browsers require HTTPS (or `localhost`) for GPS and camera access. Plain `http://<laptop-ip>:5173` will be blocked.

### Option A: Vite local HTTPS
1. Start the backend on all interfaces:
```bash
   python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --app-dir backend --reload
```
2. Start the frontend with HTTPS:
```bash
   cd frontend
   $env:VITE_HTTPS="true"          # Windows PowerShell
   npm run dev -- --host 0.0.0.0
```
   On macOS/Linux: `VITE_HTTPS=true npm run dev -- --host 0.0.0.0`
3. Put your phone and laptop on the same Wi-Fi, open the Network URL Vite prints (for example `https://192.168.1.50:5173`), accept the self-signed certificate, and allow Location access.

### Option B: Cloudflare Tunnel (trusted HTTPS, no warnings)
1. Run the backend and frontend (`npm run dev -- --host`).
2. In a third terminal run:
```bash
   npx cloudflared tunnel --url http://localhost:5173
```
3. Open the generated `https://…trycloudflare.com` URL on your phone. `/api` requests are proxied to the local backend automatically.

### Laptop testing without moving (`DEV_SKIP_GEOFENCE`)
Use the "Geo-fence disabled (dev)" toggle on the Attendance screen, or run:
```bash
curl -X POST http://127.0.0.1:8000/api/attendance/config/dev-toggle
```
An amber badge appears on teacher and student screens. The 7-second rotating HMAC-SHA256 token, session checks and single-scan rule still apply.

---

## Smoke Test Checklist
- [x] **Phase 1:** tabbed login, unique IDs, single-reveal PINs, JWT auth, role guards, mentor pairing, notices, CSV exam seating
- [x] **Phase 2:** 0–100 transparent score, Green/Amber/Red bands, 14-day flag expiry, plain-language factor explanations
- [x] **Phase 3:** backend 403 mentor isolation, mentor dashboard with trends, case detail with 75% recovery formula, structured interventions, notes, audited band override, 1-on-1 chat
- [x] **Phase 4:** insights hub with threshold sliders and CSV export, results explorer, assignments tracker, offline mentor AI assistant with citations
- [x] **Phase 5:** dark/light theme, risk colors isolated to risk states, role home pages, what-if attendance calculator, fairness footer on every page
- [x] **Phase 6:** deterministic seed, printable hall tickets and case reports, system flowchart, 3-minute demo script in `docs/DEMO.md`

---

## Project Screenshots
Add images to a `screenshots/` folder and link them here, for example:
`![Faculty Dashboard](screenshots/faculty-dashboard.png)`

## Team
**Team Name:** CodeCraft
**Project:** LearnWell – ShikshaSetu

## Hackathon Submission
Developed for the ShikshaSetu problem statement (PS-06).
- **Demo Video:** [Watch here](https://youtu.be/ORtVtcEHqJY?si=df2WCrPYmU7f7mC7)
- **Presentation (PPT):** [View here](https://docs.google.com/presentation/d/1JjOVbHDCAwkQwJGujUgG_zJiveb0zkXL/edit?usp=sharing&ouid=100495293853518116218&rtpof=true&sd=true)
