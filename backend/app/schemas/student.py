from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class StudentBase(BaseModel):
    student_id: str
    full_name: str
    course_name: str
    email: Optional[str] = None

class StudentCreate(StudentBase):
    has_consented: bool = False

class StudentUpdate(BaseModel):
    full_name: Optional[str] = None
    course_name: Optional[str] = None
    email: Optional[str] = None
    is_archived: Optional[bool] = None
    has_consented: Optional[bool] = None

class StudentConsentUpdate(BaseModel):
    has_consented: bool
    notes: Optional[str] = None

class StudentResponse(StudentBase):
    id: int
    is_archived: bool
    has_consented: bool
    consent_date: Optional[datetime] = None
    has_embedding: bool = False
    profile_image_path: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
