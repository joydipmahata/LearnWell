import os
from dotenv import load_dotenv

# Load .env file at startup
load_dotenv()

class Settings:
    PROJECT_NAME: str = "LearnWell"
    PROJECT_SUBTITLE: str = "Explainable Early-Intervention Platform (PS-06 ShikshaSetu)"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "learnwell-hackathon-super-secret-key-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    DEMO_MODE: bool = os.getenv("DEMO_MODE", "true").lower() in ("true", "1", "yes")

    # QR Attendance & Geo-fencing
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    GEOFENCE_RADIUS_METERS: float = float(os.getenv("GEOFENCE_RADIUS_METERS", "150.0"))
    QR_ROTATION_SECONDS: int = int(os.getenv("QR_ROTATION_SECONDS", "7"))
    MAX_GPS_ACCURACY_METERS: float = float(os.getenv("MAX_GPS_ACCURACY_METERS", "100.0"))
    DEV_SKIP_GEOFENCE: bool = os.getenv("DEV_SKIP_GEOFENCE", "false").lower() in ("true", "1", "yes")
    QR_SECRET: str = os.getenv("QR_SECRET", "learnwell-qr-rotation-secret-salt-2026")

    # Optional Supabase
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")

    # Optional LLM
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

settings = Settings()
