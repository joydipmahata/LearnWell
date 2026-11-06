import contextlib
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.store import db
from app.seed_data import seed_database
from app.routes.auth_routes import router as auth_router
from app.routes.admin_routes import router as admin_router
from app.routes.faculty_routes import router as faculty_router
from app.routes.student_routes import router as student_router
from app.routes.shared_routes import router as shared_router
from app.routes.assistant_routes import router as assistant_router
from app.routes.attendance_routes import router as attendance_router
from app.routes.notification_routes import router as notification_router
from app.routes.contact_routes import router as contact_router
from app.routes.timetable_routes import router as timetable_router
from app.routes.extra_assignment_routes import router as extra_assignment_router
from app.routes.question_bank_routes import router as question_bank_router
from app.routes.live_quiz_routes import router as live_quiz_router
from app.routes.risk_planner_routes import router as risk_planner_router
from app.routes.intervention_routes import router as intervention_router
from app.notifications import check_and_generate_deadline_reminders

@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Seed deterministic database
    seed_database(db)
    db.load_persisted()
    check_and_generate_deadline_reminders()
    print(f"[{settings.PROJECT_NAME}] Database successfully seeded and state loaded.")
    yield
    # Shutdown logic if needed

app = FastAPI(
    title=settings.PROJECT_NAME,
    description=settings.PROJECT_SUBTITLE,
    version=settings.VERSION,
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers under API_PREFIX (/api)
app.include_router(auth_router, prefix=settings.API_PREFIX)
app.include_router(admin_router, prefix=settings.API_PREFIX)
app.include_router(faculty_router, prefix=settings.API_PREFIX)
app.include_router(student_router, prefix=settings.API_PREFIX)
app.include_router(shared_router, prefix=settings.API_PREFIX)
app.include_router(assistant_router, prefix=settings.API_PREFIX)
app.include_router(notification_router, prefix=settings.API_PREFIX)
app.include_router(contact_router, prefix=settings.API_PREFIX)
app.include_router(timetable_router, prefix=settings.API_PREFIX)
app.include_router(extra_assignment_router, prefix=settings.API_PREFIX)
app.include_router(question_bank_router, prefix=settings.API_PREFIX)
app.include_router(live_quiz_router, prefix=settings.API_PREFIX)
app.include_router(risk_planner_router, prefix=settings.API_PREFIX)
app.include_router(intervention_router, prefix=settings.API_PREFIX)
app.include_router(attendance_router, prefix=settings.API_PREFIX)

@app.get("/")
def root():
    return {
        "project": settings.PROJECT_NAME,
        "tagline": settings.PROJECT_SUBTITLE,
        "version": settings.VERSION,
        "demo_mode": settings.DEMO_MODE,
        "status": "online"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": "ok"}
