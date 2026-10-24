import pytest
import pytest_asyncio
import numpy as np
import cv2
import tempfile
import os
import uuid
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.database import Base, AsyncSessionLocal, engine
from app.vision.detector import PersonDetector
from app.vision.tracker import MultiPersonTracker
from app.vision.head_pose import HeadPoseEstimator
from app.audio.audio_analyzer import AggregateAudioAnalyzer
from app.agents.teaching_agent import TeachingSuggestionAgent

@pytest_asyncio.fixture
async def client():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

@pytest.mark.asyncio
async def test_health_endpoint(client):
    res = await client.get("/api/v1/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "models" in data

@pytest.mark.asyncio
async def test_dashboard_metrics_empty_state(client):
    res = await client.get("/api/v1/dashboard/metrics")
    assert res.status_code == 200
    data = res.json()
    assert "total_students" in data
    assert "total_sessions" in data
    assert "overall_attendance_pct" in data
    assert isinstance(data["recent_sessions"], list)

@pytest.mark.asyncio
async def test_student_and_session_api_flow(client):
    # 1. Create Student
    uid = uuid.uuid4().hex[:6]
    test_stu_code = f"STU-{uid}"
    test_class = f"Class-{uid}"
    student_payload = {
        "student_id": test_stu_code,
        "full_name": f"Student {uid}",
        "course_name": test_class,
        "email": f"student_{uid}@university.edu",
        "has_consented": True
    }
    create_res = await client.post("/api/v1/students", json=student_payload)
    assert create_res.status_code == 201
    student_data = create_res.json()
    student_id = student_data["id"]
    assert student_data["has_consented"] is True

    # 2. Create Session
    session_payload = {
        "course_title": f"Course {uid}",
        "instructor_name": "Dr. Turing",
        "room_number": "Lab 4B",
        "target_class": test_class,
        "expected_duration_minutes": 45
    }
    sess_res = await client.post("/api/v1/sessions", json=session_payload)
    assert sess_res.status_code == 201
    sess_data = sess_res.json()
    session_id = sess_data["id"]

    # 3. Check Pre-populated Attendance
    att_res = await client.get(f"/api/v1/attendance/session/{session_id}")
    assert att_res.status_code == 200
    att_list = att_res.json()
    assert len(att_list) >= 1
    assert any(a["student_code"] == test_stu_code for a in att_list)
    record_id = [a["id"] for a in att_list if a["student_code"] == test_stu_code][0]

    # 4. Manual Override Attendance
    override_res = await client.put(
        f"/api/v1/attendance/{record_id}/override",
        json={"status": "PRESENT", "notes": "Verified by instructor in person"}
    )
    assert override_res.status_code == 200

    # 5. Export Attendance CSV
    csv_res = await client.get(f"/api/v1/analytics/session/{session_id}/export-csv")
    assert csv_res.status_code == 200
    assert "Session UID" in csv_res.text
    assert f"Student {uid}" in csv_res.text

@pytest.mark.asyncio
async def test_teaching_suggestions_generation(client):
    # Create test session
    sess_res = await client.post("/api/v1/sessions", json={
        "course_title": "AI Ethics",
        "instructor_name": "Prof. Russell",
        "target_class": "Ethics 101"
    })
    session_id = sess_res.json()["id"]

    # Trigger generation (uses deterministic rule engine fallback)
    sug_res = await client.post(f"/api/v1/suggestions/session/{session_id}/generate")
    assert sug_res.status_code == 200
    suggestions = sug_res.json()
    assert len(suggestions) > 0
    assert "suggestion_type" in suggestions[0]
    assert "evidence" in suggestions[0]

def test_head_pose_estimator():
    estimator = HeadPoseEstimator()
    # Create synthetic face image
    face = np.full((120, 120, 3), 180, dtype=np.uint8)
    # Draw simple eye/nose/mouth circles
    cv2.circle(face, (35, 45), 6, (40, 40, 40), -1)
    cv2.circle(face, (85, 45), 6, (40, 40, 40), -1)
    cv2.circle(face, (60, 65), 5, (60, 60, 60), -1)
    cv2.line(face, (40, 90), (80, 90), (30, 30, 30), 2)

    is_fwd, yaw, pitch, roll = estimator.estimate_orientation(face)
    assert isinstance(is_fwd, (bool, np.bool_))
    assert isinstance(yaw, float)

def test_audio_analyzer_energy():
    analyzer = AggregateAudioAnalyzer()
    # Silent audio slice
    silent = np.zeros(16000, dtype=np.int16)
    avail, ratio, energy = analyzer.analyze_audio_segment(silent, sample_rate=16000)
    assert avail is True
    assert ratio == 0.0
    assert energy == 0.0

    # Active synthetic tone audio slice
    t = np.linspace(0, 1, 16000)
    signal = (np.sin(2 * np.pi * 440 * t) * 15000).astype(np.int16)
    avail2, ratio2, energy2 = analyzer.analyze_audio_segment(signal, sample_rate=16000)
    assert avail2 is True
    assert ratio2 > 0.8
    assert energy2 > 0.1
