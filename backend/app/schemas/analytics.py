from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

class EngagementWindowResponse(BaseModel):
    id: int
    session_id: int
    window_index: int
    start_seconds: float
    end_seconds: float
    person_count_avg: float
    forward_facing_ratio: float
    movement_intensity: float
    prolonged_inactivity_ratio: float
    speech_active_ratio: float
    interaction_activity_score: float
    is_audio_available: bool
    is_video_available: bool
    notes: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class SessionAnalyticsSummary(BaseModel):
    session_id: int
    total_enrolled: int
    present_count: int
    late_count: int
    unverified_count: int
    attendance_rate: float
    avg_interaction_score: float
    avg_forward_facing_ratio: float
    avg_movement_intensity: float
    avg_speech_active_ratio: float
    windows_count: int
    timeline: List[EngagementWindowResponse]
    notable_changes: List[str]
