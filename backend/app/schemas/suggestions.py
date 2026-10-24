from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class SuggestionResponse(BaseModel):
    id: int
    session_id: int
    suggestion_type: str
    title: str
    description: str
    evidence: str
    urgency: str
    generated_by: str
    acknowledged: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class SuggestionAcknowledge(BaseModel):
    acknowledged: bool = True
