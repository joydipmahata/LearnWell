import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from app.config import settings
from app.auth import verify_pin, create_access_token, decode_token, security
from app.store import db

router = APIRouter(prefix="/auth", tags=["Auth"])

class LoginRequest(BaseModel):
    user_id: str
    pin: str

def get_current_user_from_token(credentials = Depends(security)) -> dict:
    if not credentials:
        if settings.DEMO_MODE:
            # Fallback for demo convenience if header is missing
            admin = db.users.get("LW-ADM-0001")
            if admin:
                return admin
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    
    token = credentials.credentials
    payload = decode_token(token)
    if not payload:
        if settings.DEMO_MODE:
            admin = db.users.get("LW-ADM-0001")
            if admin:
                return admin
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user_id = payload.get("sub")
    user = db.users.get(user_id)
    if not user or not user.get("is_active", True):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User account is inactive or not found")
    return user

def require_role(roles: list[str]):
    def role_checker(current_user: dict = Depends(get_current_user_from_token)):
        if current_user.get("role") not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: role {current_user.get('role')} not permitted for this endpoint"
            )
        return current_user
    return role_checker

@router.post("/login")
def login(req: LoginRequest):
    user_id = req.user_id.strip().upper()
    user = db.users.get(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid User ID")
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is disabled")

    # In DEMO_MODE, also allow demo bypass if entered "123456" or user's plain_pin
    is_valid = verify_pin(req.pin.strip(), user.get("pin_hash", "")) or (settings.DEMO_MODE and req.pin == "123456")
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid PIN")

    token = create_access_token(data={"sub": user["id"], "role": user["role"], "name": user["name"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "role": user["role"],
            "branch": user.get("branch"),
            "section": user.get("section"),
            "semester": user.get("semester"),
            "mentor_id": user.get("mentor_id")
        }
    }

@router.get("/me")
def get_me(user: dict = Depends(get_current_user_from_token)):
    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
        "branch": user.get("branch"),
        "section": user.get("section"),
        "semester": user.get("semester"),
        "mentor_id": user.get("mentor_id")
    }

@router.get("/demo-accounts")
def get_demo_accounts():
    """Returns curated demo accounts across roles for quick evaluation in demo mode."""
    if not settings.DEMO_MODE:
        return {"demo_mode": False, "accounts": []}

    accounts = []
    # Admin
    if "LW-ADM-0001" in db.users:
        u = db.users["LW-ADM-0001"]
        accounts.append({
            "id": u["id"],
            "name": u["name"],
            "role": "Admin",
            "pin": "123456",
            "description": "Dean Academic / Platform Administrator"
        })

    # Faculty Mentors
    for fac_id in ["LW-FAC-0001", "LW-FAC-0002", "LW-FAC-0003"]:
        if fac_id in db.users:
            u = db.users[fac_id]
            accounts.append({
                "id": u["id"],
                "name": u["name"],
                "role": "Faculty",
                "pin": "123456",
                "description": f"Mentor ({u.get('department', 'CSE')})"
            })

    # Sample Students (Red, Amber, Green)
    sample_stus = [
        ("LW-STU-0001", "Red Band (High Academic & Attendance Risk)"),
        ("LW-STU-0004", "Amber Band (Moderate Risk, Needs Intervention)"),
        ("LW-STU-0008", "Green Band (High Performing, Good Attendance)")
    ]
    for stu_id, desc in sample_stus:
        if stu_id in db.users:
            u = db.users[stu_id]
            accounts.append({
                "id": u["id"],
                "name": u["name"],
                "role": "Student",
                "pin": "123456",
                "description": desc
            })

    return {"demo_mode": True, "accounts": accounts}
