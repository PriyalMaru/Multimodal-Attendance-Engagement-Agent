from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

class SessionBase(BaseModel):
    course_title: str
    instructor_name: str
    room_number: Optional[str] = None
    target_class: str
    expected_duration_minutes: int = 60

class SessionCreate(SessionBase):
    course_id: Optional[int] = None
    source_type: str = "LIVE"  # LIVE, VIDEO_UPLOAD, DEMO

class SessionUpdate(BaseModel):
    status: Optional[str] = None  # SCHEDULED, LIVE, PAUSED, COMPLETED, CANCELLED
    expected_duration_minutes: Optional[int] = None

class SessionResponse(SessionBase):
    id: int
    session_uid: str
    course_id: Optional[int] = None
    status: str
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    actual_duration_seconds: float
    source_type: str
    video_filename: Optional[str] = None
    video_duration_seconds: float
    created_at: datetime
    attendance_count: Optional[int] = 0
    present_count: Optional[int] = 0
    avg_engagement: Optional[float] = 0.0

    model_config = ConfigDict(from_attributes=True)
