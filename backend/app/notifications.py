import datetime
import uuid
from typing import Union, List, Optional
from app.store import db

VALID_NOTIFICATION_TYPES = {
    "assignment",
    "deadline",
    "quiz",
    "timetable",
    "intervention",
    "general"
}

def create_notification(
    user_ids: Union[str, List[str]],
    type: str,
    title: str,
    message: str,
    link: Optional[str] = None
) -> List[dict]:
    """
    Creates and records notifications for one or multiple user IDs.
    Any module can call create_notification(user_ids, type, title, message, link).
    """
    if type not in VALID_NOTIFICATION_TYPES:
        type = "general"

    if isinstance(user_ids, str):
        target_ids = [user_ids]
    else:
        target_ids = list(user_ids)

    now = datetime.datetime.now(datetime.timezone.utc)
    created_list = []

    with db.lock:
        for uid in target_ids:
            # Check user exists
            if uid not in db.users:
                continue

            notif_id = f"NOTIF-{len(db.notifications) + 1:05d}"
            notif = {
                "id": notif_id,
                "user_id": uid,
                "type": type,
                "title": title.strip(),
                "message": message.strip(),
                "link": link or "",
                "created_at": now.isoformat(),
                "read": False
            }
            db.notifications.append(notif)
            created_list.append(notif)

    return created_list

def check_and_generate_deadline_reminders():
    """
    Inspects assignments and triggers deadline notifications for enrolled students
    if due within 24 hours and not already notified.
    """
    now = datetime.datetime.now(datetime.timezone.utc)
    today = now.date()

    with db.lock:
        # Find active students
        student_ids = [uid for uid, u in db.users.items() if u.get("role") == "Student" and u.get("is_active", True)]

        for assign_id, assign in db.assignments.items():
            due_str = assign.get("due_date")
            if not due_str:
                continue

            try:
                # Format: YYYY-MM-DD
                due_date = datetime.date.fromisoformat(due_str)
            except Exception:
                continue

            # Check if due within next 24 hours (i.e. due tomorrow or due today)
            days_diff = (due_date - today).days
            if 0 <= days_diff <= 1:
                sub_code = assign.get("subject_code", "Course")
                sub_name = assign.get("subject_name", sub_code)
                assign_title = assign.get("title", "Assignment")

                for stu_id in student_ids:
                    # Check if already generated
                    already_sent = any(
                        n.get("user_id") == stu_id and
                        n.get("type") == "deadline" and
                        assign_id in n.get("message", "")
                        for n in db.notifications
                    )
                    if not already_sent:
                        notif_id = f"NOTIF-{len(db.notifications) + 1:05d}"
                        notif = {
                            "id": notif_id,
                            "user_id": stu_id,
                            "type": "deadline",
                            "title": f"Deadline Reminder: {assign_title}",
                            "message": f"Assignment '{assign_title}' ({assign_id}) for {sub_name} is due within 24 hours on {due_str}. Please review and submit on time.",
                            "link": "/student/attendance",
                            "created_at": now.isoformat(),
                            "read": False
                        }
                        db.notifications.append(notif)
