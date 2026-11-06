from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List
from app.routes.auth_routes import get_current_user_from_token, require_role
from app.store import db
from app.notifications import create_notification, check_and_generate_deadline_reminders, VALID_NOTIFICATION_TYPES

router = APIRouter(prefix="/notifications", tags=["Notifications"])

class CreateNotificationRequest(BaseModel):
    user_ids: List[str]
    type: str
    title: str
    message: str
    link: Optional[str] = ""

@router.get("")
def list_notifications(current_user: dict = Depends(get_current_user_from_token)):
    """Returns all notifications for the authenticated user."""
    # Check for any upcoming deadlines and auto-trigger reminders
    if current_user.get("role") == "Student":
        check_and_generate_deadline_reminders()

    user_id = current_user["id"]
    with db.lock:
        user_notifs = [n for n in db.notifications if n.get("user_id") == user_id]
        # Sort newest first
        user_notifs.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        unread_count = sum(1 for n in user_notifs if not n.get("read", False))

        return {
            "notifications": user_notifs,
            "unread_count": unread_count,
            "total_count": len(user_notifs)
        }

@router.put("/{notification_id}/read")
@router.post("/{notification_id}/read")
def mark_notification_read(notification_id: str, current_user: dict = Depends(get_current_user_from_token)):
    """Marks a single notification as read for the authenticated user."""
    user_id = current_user["id"]
    with db.lock:
        target = None
        for n in db.notifications:
            if n.get("id") == notification_id:
                target = n
                break

        if not target:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")

        # Security check: notification must belong to current user
        if target.get("user_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You cannot modify notifications belonging to another user."
            )

        target["read"] = True
        return {"success": True, "notification": target}

@router.put("/mark-all-read")
@router.post("/mark-all-read")
def mark_all_read(current_user: dict = Depends(get_current_user_from_token)):
    """Marks all unread notifications for the authenticated user as read."""
    user_id = current_user["id"]
    marked_count = 0
    with db.lock:
        for n in db.notifications:
            if n.get("user_id") == user_id and not n.get("read", False):
                n["read"] = True
                marked_count += 1

    return {"success": True, "marked_count": marked_count}

@router.post("/create")
def api_create_notification(req: CreateNotificationRequest, current_user: dict = Depends(require_role(["Admin", "Faculty"]))):
    """Admin or Faculty can manually emit a notification."""
    if req.type not in VALID_NOTIFICATION_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid notification type. Must be one of: {', '.join(sorted(VALID_NOTIFICATION_TYPES))}"
        )

    created = create_notification(
        user_ids=req.user_ids,
        type=req.type,
        title=req.title,
        message=req.message,
        link=req.link
    )
    return {"success": True, "count": len(created), "notifications": created}
