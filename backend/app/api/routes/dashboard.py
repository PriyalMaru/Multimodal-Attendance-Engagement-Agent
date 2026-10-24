import numpy as np
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, case

from app.core.database import get_db
from app.models.db_models import Student, Session, AttendanceRecord, EngagementWindow

router = APIRouter()

@router.get("/metrics")
async def get_dashboard_metrics(db: AsyncSession = Depends(get_db)):
    # 1. Total Enrolled Students
    student_count_res = await db.execute(
        select(func.count(Student.id)).where(Student.is_archived == False)
    )
    total_students = student_count_res.scalar() or 0

    # 2. Total Sessions Conducted
    session_count_res = await db.execute(select(func.count(Session.id)))
    total_sessions = session_count_res.scalar() or 0

    # 3. Overall Attendance Percentage
    att_res = await db.execute(
        select(
            func.count(AttendanceRecord.id),
            func.sum(case((AttendanceRecord.status.in_(["PRESENT", "LATE"]), 1), else_=0))
        )
    )
    total_att_records, confirmed_present = att_res.first()
    overall_attendance_pct = (
        round((confirmed_present / float(total_att_records)) * 100.0, 1)
        if total_att_records and total_att_records > 0 else 0.0
    )

    # 4. Average Session Engagement Indicator
    eng_res = await db.execute(select(func.avg(EngagementWindow.interaction_activity_score)))
    avg_eng = eng_res.scalar()
    avg_engagement_score = round(avg_eng, 1) if avg_eng is not None else 0.0

    # 5. Recent Sessions (last 5)
    recent_sess_res = await db.execute(
        select(Session).order_by(Session.id.desc()).limit(5)
    )
    recent_sessions_raw = recent_sess_res.scalars().all()
    recent_sessions = []
    for s in recent_sessions_raw:
        # Get count for this session
        s_att_res = await db.execute(
            select(
                func.count(AttendanceRecord.id),
                func.sum(case((AttendanceRecord.status.in_(["PRESENT", "LATE"]), 1), else_=0))
            ).where(AttendanceRecord.session_id == s.id)
        )
        s_tot, s_pres = s_att_res.first()
        rate = round((s_pres / float(s_tot)) * 100.0, 1) if s_tot and s_tot > 0 else 0.0

        # Avg score
        s_eng_res = await db.execute(
            select(func.avg(EngagementWindow.interaction_activity_score))
            .where(EngagementWindow.session_id == s.id)
        )
        s_avg_eng = s_eng_res.scalar()

        recent_sessions.append({
            "id": s.id,
            "session_uid": s.session_uid,
            "course_title": s.course_title,
            "instructor_name": s.instructor_name,
            "target_class": s.target_class,
            "status": s.status,
            "source_type": s.source_type,
            "created_at": s.created_at,
            "attendance_rate": rate,
            "avg_engagement": round(s_avg_eng, 1) if s_avg_eng else 0.0
        })

    # 6. Attendance Trends over recent sessions
    trends = []
    trend_sessions = list(reversed(recent_sessions))
    for ts in trend_sessions:
        trends.append({
            "session_name": ts["course_title"][:15],
            "attendance_rate": ts["attendance_rate"],
            "engagement_score": ts["avg_engagement"]
        })

    return {
        "total_students": total_students,
        "total_sessions": total_sessions,
        "overall_attendance_pct": overall_attendance_pct,
        "avg_engagement_score": avg_engagement_score,
        "recent_sessions": recent_sessions,
        "trends": trends
    }
