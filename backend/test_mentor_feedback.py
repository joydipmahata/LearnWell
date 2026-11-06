import pytest
import datetime
from starlette.testclient import TestClient
from app.main import app
from app.store import db
from app.auth import hash_pin

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c

def test_mentor_feedback_end_to_end(client):
    """
    Test full end-to-end flow for mentor feedback:
    1. Create a mentor and two students (student 1 linked to mentor, student 2 unlinked).
    2. Mentor submits a feedback review for student 1.
    3. Assert student 1 can retrieve the feedback on both /results-feedback and /mentor.
    4. Assert student 2 cannot see student 1's feedback.
    5. Assert mentor cannot submit feedback for student 2 (403 Forbidden).
    6. Assert student cannot submit feedback (403 Forbidden).
    """
    pin_hash = hash_pin("123456")

    # 1. Setup isolated test users in store
    with db.lock:
        db.users["TEST-FAC-01"] = {
            "id": "TEST-FAC-01",
            "name": "Prof. Test Mentor",
            "email": "test.mentor@learnwell.edu",
            "role": "Faculty",
            "department": "Computer Science & Engineering",
            "pin_hash": pin_hash,
            "plain_pin": "123456",
            "is_active": True,
            "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }
        db.users["TEST-STU-01"] = {
            "id": "TEST-STU-01",
            "name": "Test Student One",
            "email": "test.stu1@learnwell.edu",
            "role": "Student",
            "branch": "CSE",
            "section": "A",
            "semester": 4,
            "mentor_id": "TEST-FAC-01",
            "pin_hash": pin_hash,
            "plain_pin": "123456",
            "is_active": True,
            "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }
        db.users["TEST-STU-02"] = {
            "id": "TEST-STU-02",
            "name": "Test Student Two",
            "email": "test.stu2@learnwell.edu",
            "role": "Student",
            "branch": "CSE",
            "section": "B",
            "semester": 4,
            "mentor_id": "OTHER-FAC-99",
            "pin_hash": pin_hash,
            "plain_pin": "123456",
            "is_active": True,
            "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }

    # 2. Login as Mentor
    res_login_fac = client.post("/api/auth/login", json={"user_id": "TEST-FAC-01", "pin": "123456"})
    assert res_login_fac.status_code == 200, f"Mentor login failed: {res_login_fac.text}"
    fac_token = res_login_fac.json()["access_token"]
    fac_headers = {"Authorization": f"Bearer {fac_token}"}

    # 3. Mentor posts feedback for assigned student 1
    review_text = "Detailed academic review: Strong algorithmic intuition, but please review dynamic programming DP table structures."
    res_post_fdbk = client.post(
        "/api/faculty/students/TEST-STU-01/feedback",
        headers=fac_headers,
        json={
            "feedback": review_text,
            "semester": 4,
            "subject_code": "CS401"
        }
    )
    assert res_post_fdbk.status_code == 200, f"Feedback post failed: {res_post_fdbk.text}"
    posted_data = res_post_fdbk.json()
    assert posted_data["success"] is True
    saved_entry = posted_data["feedback"]
    assert saved_entry["student_id"] == "TEST-STU-01"
    assert saved_entry["mentor_id"] == "TEST-FAC-01"
    assert saved_entry["mentor_name"] == "Prof. Test Mentor"
    assert saved_entry["feedback"] == review_text
    assert saved_entry["feedback_text"] == review_text
    assert saved_entry["subject_code"] == "CS401"
    assert saved_entry["semester"] == 4
    assert "created_at" in saved_entry

    # 4. Check notification was generated for student 1
    with db.lock:
        notif = next(
            (n for n in db.notifications if n.get("user_id") == "TEST-STU-01" and "Prof. Test Mentor" in n.get("title", "")),
            None
        )
        assert notif is not None, "Notification for student was not created."
        assert "CS401" in notif["message"]

    # 5. Login as Student 1 and verify both endpoints
    res_login_stu1 = client.post("/api/auth/login", json={"user_id": "TEST-STU-01", "pin": "123456"})
    assert res_login_stu1.status_code == 200
    stu1_token = res_login_stu1.json()["access_token"]
    stu1_headers = {"Authorization": f"Bearer {stu1_token}"}

    # Endpoint A: /api/student/results-feedback
    res_rf = client.get("/api/student/results-feedback?semester=4", headers=stu1_headers)
    assert res_rf.status_code == 200, f"Results-feedback failed: {res_rf.text}"
    rf_data = res_rf.json()
    stu1_fdbk_rf = next((f for f in rf_data["feedbacks"] if f["id"] == saved_entry["id"]), None)
    assert stu1_fdbk_rf is not None, "Feedback missing in student's /results-feedback endpoint"
    assert stu1_fdbk_rf["feedback"] == review_text
    assert stu1_fdbk_rf["feedback_text"] == review_text
    assert stu1_fdbk_rf["mentor_name"] == "Prof. Test Mentor"

    # Endpoint B: /api/student/mentor
    res_m = client.get("/api/student/mentor", headers=stu1_headers)
    assert res_m.status_code == 200, f"Mentor info failed: {res_m.text}"
    m_data = res_m.json()
    stu1_fdbk_m = next((f for f in m_data["feedbacks"] if f["id"] == saved_entry["id"]), None)
    assert stu1_fdbk_m is not None, "Feedback missing in student's /mentor endpoint"
    assert stu1_fdbk_m["feedback"] == review_text
    assert stu1_fdbk_m["feedback_text"] == review_text

    # 6. Login as Student 2 and verify isolation
    res_login_stu2 = client.post("/api/auth/login", json={"user_id": "TEST-STU-02", "pin": "123456"})
    assert res_login_stu2.status_code == 200
    stu2_token = res_login_stu2.json()["access_token"]
    stu2_headers = {"Authorization": f"Bearer {stu2_token}"}

    res_rf2 = client.get("/api/student/results-feedback?semester=4", headers=stu2_headers)
    assert res_rf2.status_code == 200
    stu2_rf_data = res_rf2.json()
    leaked_rf = next((f for f in stu2_rf_data["feedbacks"] if f["id"] == saved_entry["id"]), None)
    assert leaked_rf is None, "SECURITY VIOLATION: Student 2 received Student 1's feedback on /results-feedback"

    res_m2 = client.get("/api/student/mentor", headers=stu2_headers)
    assert res_m2.status_code == 200
    stu2_m_data = res_m2.json()
    leaked_m = next((f for f in stu2_m_data["feedbacks"] if f["id"] == saved_entry["id"]), None)
    assert leaked_m is None, "SECURITY VIOLATION: Student 2 received Student 1's feedback on /mentor"

    # 7. Mentor tries to post feedback for student 2 (unassigned) -> Expect 403 Forbidden
    res_unauth = client.post(
        "/api/faculty/students/TEST-STU-02/feedback",
        headers=fac_headers,
        json={"feedback": "Should fail", "semester": 4}
    )
    assert res_unauth.status_code == 403, f"Expected 403 Forbidden but got {res_unauth.status_code}"

    # 8. Student tries to post feedback -> Expect 403 Forbidden
    res_stu_post = client.post(
        "/api/faculty/students/TEST-STU-01/feedback",
        headers=stu1_headers,
        json={"feedback": "Student posting should fail", "semester": 4}
    )
    assert res_stu_post.status_code == 403
