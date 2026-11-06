import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, field_validator
from typing import Optional, List
from app.routes.auth_routes import get_current_user_from_token, require_role
from app.store import db
from app.notifications import create_notification

router = APIRouter(prefix="/timetable", tags=["Timetable"])

DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

def time_to_minutes(time_str: str) -> int:
    try:
        parts = time_str.strip().split(":")
        return int(parts[0]) * 60 + int(parts[1])
    except Exception:
        raise HTTPException(status_code=400, detail=f"Invalid time format: {time_str}. Use HH:MM in 24-hour format.")

def times_overlap(s1: str, e1: str, s2: str, e2: str) -> bool:
    start1 = time_to_minutes(s1)
    end1 = time_to_minutes(e1)
    start2 = time_to_minutes(s2)
    end2 = time_to_minutes(e2)
    return max(start1, start2) < min(end1, end2)

def check_conflicts(day: str, start_time: str, end_time: str, faculty_id: str, classroom: str, exclude_id: Optional[str] = None):
    start_min = time_to_minutes(start_time)
    end_min = time_to_minutes(end_time)
    if end_min <= start_min:
        raise HTTPException(status_code=400, detail="Class end time must be after start time.")

    for slot in db.timetable_slots:
        if exclude_id and slot.get("id") == exclude_id:
            continue
        if slot.get("day", "").lower() != day.lower():
            continue

        if times_overlap(start_time, end_time, slot["start_time"], slot["end_time"]):
            # Check same room
            if slot.get("classroom", "").strip().upper() == classroom.strip().upper():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Room conflict: Classroom {classroom} is already occupied by {slot.get('subject_code')} (Sec {slot.get('section')}) from {slot['start_time']} to {slot['end_time']}."
                )
            # Check same faculty
            if slot.get("faculty_id") == faculty_id:
                fac_name = slot.get("faculty_name", faculty_id)
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Faculty schedule conflict: {fac_name} is already assigned to teach {slot.get('subject_code')} in {slot.get('classroom')} from {slot['start_time']} to {slot['end_time']}."
                )

class CreateTimetableSlotRequest(BaseModel):
    day: str
    start_time: str
    end_time: str
    subject_code: str
    faculty_id: str
    classroom: str
    section: str = "A"
    semester: int = 4

@router.get("")
def list_timetable_slots(
    day: Optional[str] = None,
    section: Optional[str] = None,
    faculty_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user_from_token)
):
    """Lists timetable slots with optional filters."""
    with db.lock:
        results = list(db.timetable_slots)
        if day:
            results = [s for s in results if s.get("day", "").lower() == day.lower()]
        if section:
            results = [s for s in results if s.get("section", "").upper() == section.upper()]
        if faculty_id:
            results = [s for s in results if s.get("faculty_id") == faculty_id]

        results.sort(key=lambda s: (DAYS_OF_WEEK.index(s.get("day", "Monday")) if s.get("day") in DAYS_OF_WEEK else 99, s.get("start_time", "")))
        return results

@router.get("/today")
def get_today_schedule(current_user: dict = Depends(get_current_user_from_token)):
    """
    Returns today's schedule for current user (Student or Faculty)
    with 'current' slot highlighted and 'next' slot with countdown in minutes.
    """
    now = datetime.datetime.now()
    today_name = now.strftime("%A")
    # For demo reliability during testing, fallback to Monday if weekend
    if today_name not in DAYS_OF_WEEK:
        today_name = "Monday"

    now_minutes = now.hour * 60 + now.minute

    role = current_user.get("role")
    user_id = current_user.get("id")

    with db.lock:
        if role == "Student":
            section = current_user.get("section", "A")
            slots = [s for s in db.timetable_slots if s.get("day", "").lower() == today_name.lower() and s.get("section", "").upper() == section.upper()]
        elif role == "Faculty":
            slots = [s for s in db.timetable_slots if s.get("day", "").lower() == today_name.lower() and s.get("faculty_id") == user_id]
        else:
            slots = [s for s in db.timetable_slots if s.get("day", "").lower() == today_name.lower()]

        slots.sort(key=lambda s: time_to_minutes(s.get("start_time", "00:00")))

        current_slot = None
        next_slot = None
        countdown_minutes = None

        for s in slots:
            s_min = time_to_minutes(s["start_time"])
            e_min = time_to_minutes(s["end_time"])

            if s_min <= now_minutes <= e_min:
                current_slot = {**s, "is_current": True}
            elif s_min > now_minutes:
                if next_slot is None:
                    next_slot = s
                    countdown_minutes = s_min - now_minutes

        # Also return weekly schedule
        if role == "Student":
            section = current_user.get("section", "A")
            weekly = [s for s in db.timetable_slots if s.get("section", "").upper() == section.upper()]
        elif role == "Faculty":
            weekly = [s for s in db.timetable_slots if s.get("faculty_id") == user_id]
        else:
            weekly = list(db.timetable_slots)

        weekly.sort(key=lambda s: (DAYS_OF_WEEK.index(s.get("day", "Monday")) if s.get("day") in DAYS_OF_WEEK else 99, s.get("start_time", "")))

        return {
            "today": today_name,
            "classes_today": slots,
            "current_slot": current_slot,
            "next_slot": next_slot,
            "countdown_minutes": countdown_minutes,
            "weekly_schedule": weekly
        }

@router.post("")
@router.post("/slots")
def create_timetable_slot(req: CreateTimetableSlotRequest, current_user: dict = Depends(require_role(["Admin"]))):
    """Admin creates a new timetable slot with conflict checking."""
    day_clean = req.day.strip().capitalize()
    if day_clean not in DAYS_OF_WEEK:
        raise HTTPException(status_code=400, detail=f"Invalid day: {req.day}. Must be Monday to Saturday.")

    with db.lock:
        fac = db.users.get(req.faculty_id)
        if not fac or fac.get("role") != "Faculty":
            raise HTTPException(status_code=400, detail="Invalid faculty ID.")

        sub = db.subjects.get(req.subject_code.upper())
        sub_name = sub["name"] if sub else req.subject_code

        # Run conflict checks
        check_conflicts(
            day=day_clean,
            start_time=req.start_time,
            end_time=req.end_time,
            faculty_id=req.faculty_id,
            classroom=req.classroom
        )

        slot_id = f"TT-{len(db.timetable_slots) + 1:03d}"
        new_slot = {
            "id": slot_id,
            "day": day_clean,
            "start_time": req.start_time.strip(),
            "end_time": req.end_time.strip(),
            "subject_code": req.subject_code.strip().upper(),
            "subject_name": sub_name,
            "faculty_id": req.faculty_id,
            "faculty_name": fac["name"],
            "classroom": req.classroom.strip().upper(),
            "section": req.section.strip().upper(),
            "semester": req.semester,
            "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }
        db.timetable_slots.append(new_slot)
        db.log_audit("TIMETABLE_SLOT_CREATED", current_user["id"], details=f"Created {new_slot['subject_code']} on {new_slot['day']} ({new_slot['start_time']}-{new_slot['end_time']}) in {new_slot['classroom']}")

        return {"success": True, "slot": new_slot}

@router.put("/{slot_id}")
def update_timetable_slot(slot_id: str, req: CreateTimetableSlotRequest, current_user: dict = Depends(require_role(["Admin"]))):
    """Admin edits a timetable slot. Enforces conflict prevention and notifies affected teacher and students."""
    day_clean = req.day.strip().capitalize()
    with db.lock:
        target = None
        for s in db.timetable_slots:
            if s.get("id") == slot_id:
                target = s
                break

        if not target:
            raise HTTPException(status_code=404, detail="Timetable slot not found")

        fac = db.users.get(req.faculty_id)
        if not fac or fac.get("role") != "Faculty":
            raise HTTPException(status_code=400, detail="Invalid faculty ID.")

        sub = db.subjects.get(req.subject_code.upper())
        sub_name = sub["name"] if sub else req.subject_code

        # Check conflicts excluding this slot
        check_conflicts(
            day=day_clean,
            start_time=req.start_time,
            end_time=req.end_time,
            faculty_id=req.faculty_id,
            classroom=req.classroom,
            exclude_id=slot_id
        )

        old_info = f"{target['subject_code']} {target['day']} {target['start_time']}-{target['end_time']} in {target['classroom']}"

        target.update({
            "day": day_clean,
            "start_time": req.start_time.strip(),
            "end_time": req.end_time.strip(),
            "subject_code": req.subject_code.strip().upper(),
            "subject_name": sub_name,
            "faculty_id": req.faculty_id,
            "faculty_name": fac["name"],
            "classroom": req.classroom.strip().upper(),
            "section": req.section.strip().upper(),
            "semester": req.semester
        })

        # Send "timetable" notification to affected users:
        # 1. Teacher
        create_notification(
            user_ids=[req.faculty_id],
            type="timetable",
            title=f"Timetable Schedule Update: {target['subject_code']}",
            message=f"Your lecture for {target['subject_name']} (Section {target['section']}) has been updated: {day_clean} from {target['start_time']} to {target['end_time']} in {target['classroom']}.",
            link="/faculty/dashboard"
        )

        # 2. Enrolled students of that section
        affected_students = [
            uid for uid, u in db.users.items()
            if u.get("role") == "Student" and u.get("section", "").upper() == target["section"].upper() and u.get("is_active", True)
        ]
        if affected_students:
            create_notification(
                user_ids=affected_students,
                type="timetable",
                title=f"Class Timetable Changed: {target['subject_code']}",
                message=f"Your {target['subject_name']} class on {day_clean} is now scheduled from {target['start_time']} to {target['end_time']} in room {target['classroom']}.",
                link="/student/dashboard"
            )

        db.log_audit(
            "TIMETABLE_SLOT_UPDATED",
            current_user["id"],
            details=f"Updated slot {slot_id} from [{old_info}] to [{target['subject_code']} {day_clean} {target['start_time']}-{target['end_time']} {target['classroom']}]"
        )

        return {"success": True, "slot": target, "notified_students_count": len(affected_students)}

@router.delete("/{slot_id}")
def delete_timetable_slot(slot_id: str, current_user: dict = Depends(require_role(["Admin"]))):
    """Admin deletes a timetable slot."""
    with db.lock:
        idx = -1
        for i, s in enumerate(db.timetable_slots):
            if s.get("id") == slot_id:
                idx = i
                break

        if idx == -1:
            raise HTTPException(status_code=404, detail="Timetable slot not found")

        removed = db.timetable_slots.pop(idx)
        db.log_audit("TIMETABLE_SLOT_DELETED", current_user["id"], details=f"Deleted slot {removed['id']}: {removed['subject_code']} on {removed['day']}")
        return {"success": True, "deleted_slot": removed}
