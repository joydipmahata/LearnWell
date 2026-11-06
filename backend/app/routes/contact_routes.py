import re
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, field_validator
from typing import Optional, List
from app.routes.auth_routes import get_current_user_from_token, require_role
from app.store import db

router = APIRouter(prefix="/contacts", tags=["Contacts"])

PHONE_REGEX = re.compile(r"^\d{10}$")
EMAIL_REGEX = re.compile(r"^[\w\.-]+@[\w\.-]+\.\w+$")

def clean_phone(phone_str: str) -> str:
    """Strips common formatting like +91, hyphens, and whitespace."""
    if not phone_str:
        return ""
    cleaned = phone_str.strip().replace(" ", "").replace("-", "")
    if cleaned.startswith("+91"):
        cleaned = cleaned[3:]
    elif cleaned.startswith("0") and len(cleaned) == 11:
        cleaned = cleaned[1:]
    return cleaned

def validate_phone_number(phone: str, field_name: str = "phone number"):
    cleaned = clean_phone(phone)
    if not PHONE_REGEX.match(cleaned):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid {field_name}. Must be exactly 10 digits."
        )
    return cleaned

def validate_email_address(email: str):
    email = email.strip()
    if not EMAIL_REGEX.match(email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email format. Please provide a valid email address (e.g. user@domain.com)."
        )
    return email

class UpdateStudentContactRequest(BaseModel):
    student_phone: Optional[str] = None
    parent_phone: Optional[str] = None
    student_email: Optional[str] = None

@router.get("/student/{student_id}")
def get_student_contact(student_id: str, current_user: dict = Depends(get_current_user_from_token)):
    """
    Returns contact information for a student according to role permissions:
    - Admin: can view contacts for any student.
    - Faculty/Mentor: can view contacts for their mentees only.
    - Student: can view their own record only (parent phone never visible to other students).
    """
    role = current_user.get("role")
    user_id = current_user.get("id")

    with db.lock:
        target_student = db.users.get(student_id)
        if not target_student or target_student.get("role") != "Student":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student record not found")

        # RBAC Check
        if role == "Student":
            if student_id != user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: Students can only view their own contact details."
                )
        elif role == "Faculty":
            # Mentor can view contacts for their mentees only
            if target_student.get("mentor_id") != user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: Faculty mentors can only view contact details for their assigned mentees."
                )
        elif role == "Admin":
            pass # Admin can view all
        else:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized role")

        mentor_name = "Unassigned"
        if target_student.get("mentor_id") and target_student["mentor_id"] in db.users:
            mentor_name = db.users[target_student["mentor_id"]]["name"]

        return {
            "student_id": target_student["id"],
            "name": target_student["name"],
            "roll_no": target_student.get("roll_no", target_student["id"]),
            "student_phone": target_student.get("student_phone", ""),
            "parent_phone": target_student.get("parent_phone", ""),
            "student_email": target_student.get("email", ""),
            "branch": target_student.get("branch", "CSE"),
            "section": target_student.get("section", "A"),
            "semester": target_student.get("semester", 4),
            "mentor_id": target_student.get("mentor_id"),
            "mentor_name": mentor_name
        }

@router.put("/student/{student_id}")
def update_student_contact(
    student_id: str,
    req: UpdateStudentContactRequest,
    current_user: dict = Depends(get_current_user_from_token)
):
    """
    Updates student contact details:
    - Admin: can add and edit student phone, parent phone, and email for all students.
    - Student: can edit only their own student phone and email. Cannot edit parent phone.
    - Faculty: forbidden from editing contacts.
    """
    role = current_user.get("role")
    user_id = current_user.get("id")

    if role == "Faculty":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Faculty mentors have read-only access to mentee contacts."
        )

    with db.lock:
        target_student = db.users.get(student_id)
        if not target_student or target_student.get("role") != "Student":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student record not found")

        # Validate role permissions
        if role == "Student":
            if student_id != user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: Students can only edit their own contact details."
                )
            # Student cannot edit parent/guardian phone
            existing_parent_phone = clean_phone(target_student.get("parent_phone", ""))
            if req.parent_phone is not None:
                new_clean_parent = clean_phone(req.parent_phone)
                if new_clean_parent != existing_parent_phone:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Access denied: Students cannot alter parent/guardian phone numbers. Contact an Administrator."
                    )

        # Validate fields
        new_student_phone = None
        if req.student_phone is not None:
            new_student_phone = validate_phone_number(req.student_phone, "student phone number")

        new_student_email = None
        if req.student_email is not None:
            new_student_email = validate_email_address(req.student_email)

        new_parent_phone = None
        if req.parent_phone is not None and role == "Admin":
            new_parent_phone = validate_phone_number(req.parent_phone, "parent/guardian phone number")

        # Apply updates
        if new_student_phone is not None:
            target_student["student_phone"] = new_student_phone

        if new_student_email is not None:
            target_student["email"] = new_student_email

        if new_parent_phone is not None and role == "Admin":
            target_student["parent_phone"] = new_parent_phone

        db.log_audit(
            action="UPDATE_CONTACT_DETAILS",
            performed_by=f"{current_user['name']} ({role})",
            student_id=student_id,
            details=f"Updated contacts: phone={target_student.get('student_phone')}, email={target_student.get('email')}, parent_phone={target_student.get('parent_phone')}"
        )

        return {
            "success": True,
            "student_id": target_student["id"],
            "student_phone": target_student.get("student_phone", ""),
            "parent_phone": target_student.get("parent_phone", ""),
            "student_email": target_student.get("email", "")
        }

@router.get("/all")
def list_all_contacts(current_user: dict = Depends(require_role(["Admin"]))):
    """Admin endpoint to list all student contacts."""
    with db.lock:
        contacts = []
        for u in db.users.values():
            if u.get("role") == "Student":
                mentor_name = "Unassigned"
                if u.get("mentor_id") and u["mentor_id"] in db.users:
                    mentor_name = db.users[u["mentor_id"]]["name"]

                contacts.append({
                    "student_id": u["id"],
                    "name": u["name"],
                    "roll_no": u.get("roll_no", u["id"]),
                    "student_phone": u.get("student_phone", ""),
                    "parent_phone": u.get("parent_phone", ""),
                    "student_email": u.get("email", ""),
                    "branch": u.get("branch", "CSE"),
                    "section": u.get("section", "A"),
                    "semester": u.get("semester", 4),
                    "mentor_id": u.get("mentor_id"),
                    "mentor_name": mentor_name
                })

        contacts.sort(key=lambda x: x["student_id"])
        return contacts
