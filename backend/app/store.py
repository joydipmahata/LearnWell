import threading
import datetime
import json
import os
import logging
from typing import Dict, List, Optional, Any

logger = logging.getLogger(__name__)

class InMemoryStore:
    def __init__(self):
        self.lock = threading.RLock()
        self.users: Dict[str, dict] = {}
        self.subjects: Dict[str, dict] = {}
        self.attendance_records: Dict[str, dict] = {}  # key: student_id:subject_code
        self.attendance_history: List[dict] = []       # detailed log
        self.attendance_sessions: Dict[str, dict] = {}      # session_id -> detailed session
        self.qr_sessions: Dict[str, dict] = {}         # key: token
        self.assignments: Dict[str, dict] = {}
        self.assignment_submissions: List[dict] = []
        self.exam_results: List[dict] = []             # internal & semester marks
        self.semester_summaries: Dict[str, List[dict]] = {} # student_id -> list of semester results (SGPA, backlogs)
        self.interventions: List[dict] = []
        self.notes: List[dict] = []
        self.band_overrides: List[dict] = []
        self.audit_logs: List[dict] = []
        self.chat_messages: List[dict] = []
        self.academic_feedback: List[dict] = []
        self.improvement_timeline: List[dict] = []
        self.notices: List[dict] = []
        self.exam_seating: List[dict] = []
        self.risk_cache: Dict[str, dict] = {}
        self.notifications: List[dict] = []
        self.timetable_slots: List[dict] = []
        self.extra_assignments: Dict[str, dict] = {}
        self.assignment_verifications: List[dict] = []
        self.question_bank: List[dict] = []
        self.live_quizzes: Dict[str, dict] = {}
        self.intervention_snapshots: List[dict] = []

        self.storage_file = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "data", "persisted_state.json")
        )

    def save(self):
        """Persist dynamic store data to disk so uvicorn --reload does not wipe mentor feedback/interventions."""
        with self.lock:
            try:
                os.makedirs(os.path.dirname(self.storage_file), exist_ok=True)
                payload = {
                    "users": self.users,
                    "academic_feedback": self.academic_feedback,
                    "interventions": self.interventions,
                    "notes": self.notes,
                    "chat_messages": self.chat_messages,
                    "improvement_timeline": self.improvement_timeline,
                    "notifications": self.notifications,
                    "band_overrides": self.band_overrides,
                    "audit_logs": self.audit_logs,
                    "attendance_sessions": self.attendance_sessions,
                    "attendance_records": self.attendance_records,
                    "attendance_history": self.attendance_history[-500:],  # keep recent
                    "extra_assignments": self.extra_assignments,
                    "assignment_submissions": self.assignment_submissions,
                    "assignment_verifications": self.assignment_verifications
                }
                tmp_file = f"{self.storage_file}.tmp"
                with open(tmp_file, "w", encoding="utf-8") as f:
                    json.dump(payload, f, indent=2, default=str)
                os.replace(tmp_file, self.storage_file)
                logger.info(f"Persisted store state successfully to {self.storage_file}")
            except Exception as e:
                logger.error(f"Failed to persist store state: {e}", exc_info=True)

    def load_persisted(self):
        """Restore persisted dynamic items on top of seed data."""
        if not os.path.exists(self.storage_file):
            return

        with self.lock:
            try:
                with open(self.storage_file, "r", encoding="utf-8") as f:
                    data = json.load(f)

                # 1. Merge users
                saved_users = data.get("users", {})
                for u_id, u_info in saved_users.items():
                    if u_id in self.users:
                        # Update mutable fields (e.g. mentor assignment, status, phone, pin)
                        for k, v in u_info.items():
                            if k not in ("pin_hash",) or v:
                                self.users[u_id][k] = v
                    else:
                        self.users[u_id] = u_info

                # 2. Merge list collections by 'id'
                list_keys = [
                    "academic_feedback",
                    "interventions",
                    "notes",
                    "chat_messages",
                    "improvement_timeline",
                    "notifications",
                    "band_overrides",
                    "audit_logs",
                    "assignment_submissions",
                    "assignment_verifications"
                ]

                for key in list_keys:
                    saved_list = data.get(key, [])
                    curr_list = getattr(self, key, [])
                    curr_map = {item["id"]: idx for idx, item in enumerate(curr_list) if isinstance(item, dict) and "id" in item}

                    for s_item in saved_list:
                        if not isinstance(s_item, dict) or "id" not in s_item:
                            continue
                        s_id = s_item["id"]
                        if s_id in curr_map:
                            curr_list[curr_map[s_id]] = s_item
                        else:
                            curr_list.append(s_item)

                # 3. Merge dict collections
                dict_keys = ["attendance_sessions", "attendance_records", "extra_assignments"]
                for key in dict_keys:
                    saved_dict = data.get(key, {})
                    curr_dict = getattr(self, key, {})
                    curr_dict.update(saved_dict)

                # Attendance history (extend new items)
                saved_att_hist = data.get("attendance_history", [])
                existing_dates = {f"{h.get('student_id')}:{h.get('date')}:{h.get('subject_code')}" for h in self.attendance_history if isinstance(h, dict)}
                for h in saved_att_hist:
                    key = f"{h.get('student_id')}:{h.get('date')}:{h.get('subject_code')}"
                    if key not in existing_dates:
                        self.attendance_history.append(h)
                        existing_dates.add(key)

                logger.info("Persisted store state successfully restored.")
            except Exception as e:
                logger.error(f"Failed to load persisted store state: {e}", exc_info=True)

    def log_audit(self, action: str, performed_by: str, student_id: Optional[str] = None, details: str = ""):
        with self.lock:
            entry = {
                "id": f"AUD-{len(self.audit_logs) + 1:04d}",
                "action": action,
                "performed_by": performed_by,
                "student_id": student_id,
                "details": details,
                "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
            }
            self.audit_logs.append(entry)
            return entry

    def add_milestone(self, student_id: str, title: str, details: str, recorded_by: str = "System", date_str: Optional[str] = None):
        with self.lock:
            d_str = date_str or datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d")
            # Deduplicate by title & date for the same student
            exists = any(
                t.get("student_id") == student_id and t.get("title") == title and t.get("date") == d_str
                for t in self.improvement_timeline
            )
            if exists:
                return None
            
            count = sum(1 for t in self.improvement_timeline if t.get("student_id") == student_id)
            entry = {
                "id": f"IMP-{student_id}-{count + 1:02d}",
                "student_id": student_id,
                "recorded_by": recorded_by,
                "title": title,
                "details": details,
                "date": d_str,
                "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
            }
            self.improvement_timeline.insert(0, entry)
            return entry

db = InMemoryStore()
