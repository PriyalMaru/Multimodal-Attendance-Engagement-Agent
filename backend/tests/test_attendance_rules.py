import pytest
from app.services.attendance_service import AttendanceService

def test_single_frame_never_marks_present():
    """Verify Rule: Never mark a student present from a single frame."""
    status = AttendanceService.evaluate_attendance_status(
        first_seen_sec=10.0,
        last_seen_sec=10.0,
        sustained_duration_sec=0.5,
        observation_count=1,
        session_elapsed_sec=15.0,
        min_observations=5
    )
    assert status == "UNVERIFIED", f"Expected UNVERIFIED for single observation, got {status}"

def test_sustained_presence_marks_present():
    """Verify student with >= min_observations on time is marked PRESENT."""
    status = AttendanceService.evaluate_attendance_status(
        first_seen_sec=60.0,
        last_seen_sec=600.0,
        sustained_duration_sec=500.0,
        observation_count=20,
        session_elapsed_sec=650.0,
        min_observations=5,
        late_threshold_sec=600.0
    )
    assert status == "PRESENT", f"Expected PRESENT, got {status}"

def test_late_arrival_detection():
    """Verify student arriving after threshold is marked LATE."""
    status = AttendanceService.evaluate_attendance_status(
        first_seen_sec=700.0,  # Arrived at ~11.6 mins (late threshold is 10 mins = 600s)
        last_seen_sec=1200.0,
        sustained_duration_sec=400.0,
        observation_count=15,
        session_elapsed_sec=1250.0,
        min_observations=5,
        late_threshold_sec=600.0
    )
    assert status == "LATE", f"Expected LATE, got {status}"

def test_left_early_detection():
    """Verify student leaving substantially early from a long session."""
    status = AttendanceService.evaluate_attendance_status(
        first_seen_sec=60.0,
        last_seen_sec=500.0,  # Last seen at 8 mins into a 30 min session (1800s)
        sustained_duration_sec=300.0,
        observation_count=10,
        session_elapsed_sec=1800.0,
        min_observations=5
    )
    assert status == "LEFT_EARLY", f"Expected LEFT_EARLY, got {status}"
