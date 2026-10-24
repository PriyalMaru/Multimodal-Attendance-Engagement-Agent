import pytest
import pytest_asyncio
import tempfile
import os
import numpy as np
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from fastapi import HTTPException

from app.core.database import Base
from app.models.db_models import Student, Session, AttendanceRecord
from app.schemas.student import StudentCreate, StudentUpdate, StudentConsentUpdate
from app.schemas.session import SessionCreate
from app.services.student_service import StudentService
from app.services.session_service import SessionService
from app.services.attendance_service import AttendanceService

@pytest_asyncio.fixture
async def test_db():
    # In-memory SQLite for isolated async unit testing
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    session_factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        yield session

    await engine.dispose()

@pytest.mark.asyncio
async def test_student_creation_and_duplicate_prevention(test_db):
    data1 = StudentCreate(
        student_id="CS-2024-001",
        full_name="Alice Johnson",
        course_name="Computer Science 101",
        email="alice@university.edu",
        has_consented=True
    )
    student1 = await StudentService.create(test_db, data1)
    assert student1.id is not None
    assert student1.student_id == "CS-2024-001"
    assert student1.has_consented is True
    assert student1.consent_date is not None

    # Test duplicate student ID throws HTTP 400
    with pytest.raises(HTTPException) as exc_info:
        await StudentService.create(test_db, data1)
    assert exc_info.value.status_code == 400
    assert "already registered" in exc_info.value.detail

@pytest.mark.asyncio
async def test_consent_enforcement_for_face_embedding(test_db):
    # Create student without consent
    no_consent_data = StudentCreate(
        student_id="CS-2024-002",
        full_name="Bob Smith",
        course_name="Computer Science 101",
        has_consented=False
    )
    student = await StudentService.create(test_db, no_consent_data)
    assert student.has_consented is False

    # Attempting to store face embedding without consent must raise 403 Forbidden
    fake_embedding = np.random.randn(128).astype(np.float32)
    with pytest.raises(HTTPException) as exc_info:
        await StudentService.store_face_embedding(test_db, student.id, fake_embedding)
    assert exc_info.value.status_code == 403
    assert "consent has not been granted" in exc_info.value.detail

    # Grant consent and then store embedding
    await StudentService.update_consent(test_db, student.id, StudentConsentUpdate(has_consented=True))
    updated_student = await StudentService.store_face_embedding(test_db, student.id, fake_embedding)
    assert updated_student.embedding_path is not None
    assert os.path.exists(updated_student.embedding_path)

@pytest.mark.asyncio
async def test_session_creation_and_isolation(test_db):
    # Create enrolled students
    await StudentService.create(test_db, StudentCreate(student_id="S1", full_name="User 1", course_name="Math A"))
    await StudentService.create(test_db, StudentCreate(student_id="S2", full_name="User 2", course_name="Physics B"))

    # Create session for Math A
    sess_math = await SessionService.create(
        test_db,
        SessionCreate(course_title="Calculus I", instructor_name="Prof. Euler", target_class="Math A")
    )
    assert sess_math.id is not None
    assert sess_math.target_class == "Math A"

    # Verify session isolation: only Math A students are pre-populated as pending
    records = await AttendanceService.get_by_session(test_db, sess_math.id)
    assert len(records) == 1
    assert records[0]["student_code"] == "S1"
    assert records[0]["status"] == "PENDING"
