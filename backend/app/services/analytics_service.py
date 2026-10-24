import csv
import io
import numpy as np
from typing import Dict, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from fastapi import HTTPException, status

from app.models.db_models import Session, AttendanceRecord, EngagementWindow, Student
from app.schemas.analytics import SessionAnalyticsSummary, EngagementWindowResponse

class AnalyticsService:
    @staticmethod
    async def get_session_analytics(db: AsyncSession, session_id: int) -> SessionAnalyticsSummary:
        session = await db.get(Session, session_id)
        if not session:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")

        # Attendance counts
        att_res = await db.execute(
            select(AttendanceRecord).where(AttendanceRecord.session_id == session_id)
        )
        records = att_res.scalars().all()
        total_enrolled = len(records)
        present_count = sum(1 for r in records if r.status == "PRESENT")
        late_count = sum(1 for r in records if r.status == "LATE")
        unverified_count = sum(1 for r in records if r.status == "UNVERIFIED")

        attendance_rate = (
            round(((present_count + late_count) / float(total_enrolled)) * 100.0, 1)
            if total_enrolled > 0 else 0.0
        )

        # Engagement windows
        win_res = await db.execute(
            select(EngagementWindow)
            .where(EngagementWindow.session_id == session_id)
            .order_by(EngagementWindow.window_index.asc())
        )
        windows = list(win_res.scalars().all())

        if windows:
            avg_interaction = float(np.mean([w.interaction_activity_score for w in windows]))
            avg_fwd = float(np.mean([w.forward_facing_ratio for w in windows]))
            avg_motion = float(np.mean([w.movement_intensity for w in windows]))
            avg_speech = float(np.mean([w.speech_active_ratio for w in windows if w.is_audio_available])) if any(w.is_audio_available for w in windows) else 0.0
        else:
            avg_interaction = 0.0
            avg_fwd = 0.0
            avg_motion = 0.0
            avg_speech = 0.0

        # Identify notable changes
        notable_changes: List[str] = []
        if len(windows) >= 2:
            for i in range(1, len(windows)):
                diff = windows[i].interaction_activity_score - windows[i - 1].interaction_activity_score
                if diff <= -15.0:
                    notable_changes.append(
                        f"Window {i+1} ({windows[i].start_seconds:.0f}s - {windows[i].end_seconds:.0f}s): "
                        f"Significant drop in observable movement/orientation (-{abs(diff):.1f} pts)."
                    )
                elif diff >= 15.0:
                    notable_changes.append(
                        f"Window {i+1} ({windows[i].start_seconds:.0f}s - {windows[i].end_seconds:.0f}s): "
                        f"Spike in observable classroom interaction (+{diff:.1f} pts)."
                    )

        if not notable_changes and len(windows) > 0:
            notable_changes.append("Observable activity remained steady across observed session intervals.")

        timeline_data = [
            EngagementWindowResponse.model_validate(w) for w in windows
        ]

        return SessionAnalyticsSummary(
            session_id=session_id,
            total_enrolled=total_enrolled,
            present_count=present_count,
            late_count=late_count,
            unverified_count=unverified_count,
            attendance_rate=attendance_rate,
            avg_interaction_score=round(avg_interaction, 1),
            avg_forward_facing_ratio=round(avg_fwd, 2),
            avg_movement_intensity=round(avg_motion, 2),
            avg_speech_active_ratio=round(avg_speech, 2),
            windows_count=len(windows),
            timeline=timeline_data,
            notable_changes=notable_changes
        )

    @staticmethod
    async def export_attendance_csv(db: AsyncSession, session_id: int) -> str:
        session = await db.get(Session, session_id)
        if not session:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")

        query = (
            select(AttendanceRecord, Student)
            .outerjoin(Student, AttendanceRecord.student_id == Student.id)
            .where(AttendanceRecord.session_id == session_id)
            .order_by(AttendanceRecord.id.asc())
        )
        res = await db.execute(query)
        rows = res.all()

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "Session UID", "Course", "Instructor", "Student ID", "Student Name",
            "Attendance Status", "First Seen (s)", "Last Seen (s)",
            "Sustained Duration (s)", "Observation Count", "Avg Confidence", "Manual Override", "Notes"
        ])

        for att, stu in rows:
            writer.writerow([
                session.session_uid,
                session.course_title,
                session.instructor_name,
                stu.student_id if stu else "N/A",
                stu.full_name if stu else (att.detected_name or "Unknown Person"),
                att.status,
                f"{att.first_seen_seconds:.1f}" if att.first_seen_seconds is not None else "",
                f"{att.last_seen_seconds:.1f}" if att.last_seen_seconds is not None else "",
                f"{att.sustained_duration_seconds:.1f}",
                att.observation_count,
                f"{att.avg_confidence:.2f}",
                "Yes" if att.is_manual_override else "No",
                att.notes or ""
            ])

        return output.getvalue()
