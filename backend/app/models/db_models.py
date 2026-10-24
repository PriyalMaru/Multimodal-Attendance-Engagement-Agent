import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, JSON, Enum
)
from sqlalchemy.orm import relationship
from app.core.database import Base

class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    student_id = Column(String(64), unique=True, index=True, nullable=False)
    full_name = Column(String(128), nullable=False)
    course_name = Column(String(128), nullable=False)
    email = Column(String(128), nullable=True)
    profile_image_path = Column(String(256), nullable=True)
    is_archived = Column(Boolean, default=False)
    has_consented = Column(Boolean, default=False)
    consent_date = Column(DateTime, nullable=True)
    embedding_path = Column(String(256), nullable=True)  # Secure local path to embedding vector
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    attendance_records = relationship("AttendanceRecord", back_populates="student", cascade="all, delete-orphan")
    consent_logs = relationship("ConsentLog", back_populates="student", cascade="all, delete-orphan")


class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    course_code = Column(String(32), unique=True, index=True, nullable=False)
    name = Column(String(128), nullable=False)
    instructor_name = Column(String(128), nullable=False)
    room_number = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    sessions = relationship("Session", back_populates="course")


class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    session_uid = Column(String(64), unique=True, index=True, nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=True)
    course_title = Column(String(128), nullable=False)
    instructor_name = Column(String(128), nullable=False)
    room_number = Column(String(64), nullable=True)
    target_class = Column(String(128), nullable=False)
    expected_duration_minutes = Column(Integer, default=60)
    status = Column(String(32), default="SCHEDULED")  # SCHEDULED, LIVE, PAUSED, COMPLETED, CANCELLED
    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)
    actual_duration_seconds = Column(Float, default=0.0)
    source_type = Column(String(32), default="LIVE")  # LIVE, VIDEO_UPLOAD, DEMO
    video_filename = Column(String(256), nullable=True)
    video_duration_seconds = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    course = relationship("Course", back_populates="sessions")
    attendance_records = relationship("AttendanceRecord", back_populates="session", cascade="all, delete-orphan")
    engagement_windows = relationship("EngagementWindow", back_populates="session", cascade="all, delete-orphan")
    teaching_suggestions = relationship("TeachingSuggestion", back_populates="session", cascade="all, delete-orphan")


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=True, index=True)
    tracking_track_id = Column(Integer, nullable=True)  # Associated person tracker track_id
    detected_name = Column(String(128), nullable=True)
    status = Column(String(32), default="PENDING")  # PRESENT, LATE, LEFT_EARLY, UNVERIFIED, ABSENT
    first_seen_seconds = Column(Float, nullable=True)
    last_seen_seconds = Column(Float, nullable=True)
    sustained_duration_seconds = Column(Float, default=0.0)
    observation_count = Column(Integer, default=0)
    avg_confidence = Column(Float, default=0.0)
    is_manual_override = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    session = relationship("Session", back_populates="attendance_records")
    student = relationship("Student", back_populates="attendance_records")


class EngagementWindow(Base):
    __tablename__ = "engagement_windows"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False, index=True)
    window_index = Column(Integer, nullable=False)
    start_seconds = Column(Float, nullable=False)
    end_seconds = Column(Float, nullable=False)
    
    # Observable signals
    person_count_avg = Column(Float, default=0.0)
    forward_facing_ratio = Column(Float, default=0.0)       # 0.0 to 1.0 detectable forward head pose
    movement_intensity = Column(Float, default=0.0)         # 0.0 to 1.0 optical flow / bounding box displacement
    prolonged_inactivity_ratio = Column(Float, default=0.0) # fraction of persons with near zero movement
    speech_active_ratio = Column(Float, default=0.0)        # 0.0 to 1.0 audio energy / VAD threshold
    interaction_activity_score = Column(Float, default=0.0) # aggregated composite behavioral score (0-100)
    
    is_audio_available = Column(Boolean, default=True)
    is_video_available = Column(Boolean, default=True)
    notes = Column(String(256), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    session = relationship("Session", back_populates="engagement_windows")


class TeachingSuggestion(Base):
    __tablename__ = "teaching_suggestions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False, index=True)
    suggestion_type = Column(String(64), nullable=False)  # ENGAGEMENT_DROP, LOW_AUDIO, INTERACTION_PEAK, ATTENDANCE_VERIFICATION
    title = Column(String(256), nullable=False)
    description = Column(Text, nullable=False)
    evidence = Column(Text, nullable=False)  # Observable evidence explanation
    urgency = Column(String(32), default="MEDIUM")  # LOW, MEDIUM, HIGH
    generated_by = Column(String(64), default="RULE_BASED")  # RULE_BASED, OLLAMA
    acknowledged = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    session = relationship("Session", back_populates="teaching_suggestions")


class ConsentLog(Base):
    __tablename__ = "consent_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False, index=True)
    consent_action = Column(String(32), nullable=False)  # GRANTED, REVOKED, UPDATED
    notes = Column(String(256), nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    student = relationship("Student", back_populates="consent_logs")
