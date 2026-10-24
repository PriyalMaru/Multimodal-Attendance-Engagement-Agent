from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class AttendanceRecordBase(BaseModel):
    session_id: int
    student_id: Optional[int] = None
    detected_name: Optional[str] = None
    status: str = "PENDING"  # PRESENT, LATE, LEFT_EARLY, UNVERIFIED, ABSENT
    notes: Optional[str] = None

class AttendanceUpdate(BaseModel):
    status: str
    notes: Optional[str] = None
    is_manual_override: bool = True

class AttendanceRecordResponse(AttendanceRecordBase):
    id: int
    tracking_track_id: Optional[int] = None
    student_name: Optional[str] = None
    student_code: Optional[str] = None
    first_seen_seconds: Optional[float] = None
    last_seen_seconds: Optional[float] = None
    sustained_duration_seconds: float = 0.0
    observation_count: int = 0
    avg_confidence: float = 0.0
    is_manual_override: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
