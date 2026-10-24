import datetime
import uuid
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func, case
from fastapi import HTTPException, status

from app.models.db_models import Session, AttendanceRecord, EngagementWindow, Student
from app.schemas.session import SessionCreate, SessionUpdate

class SessionService:
    @staticmethod
    async def get_all(db: AsyncSession) -> List[Session]:
        query = select(Session).order_by(Session.id.desc())
        result = await db.execute(query)
        sessions = list(result.scalars().all())
        
        # Populate counts for summary
        for sess in sessions:
            att_res = await db.execute(
                select(
                    func.count(AttendanceRecord.id),
                    func.sum(case((AttendanceRecord.status.in_(["PRESENT", "LATE"]), 1), else_=0))
                ).where(AttendanceRecord.session_id == sess.id)
            )
            total_att, present_att = att_res.first()
            sess.attendance_count = total_att or 0
            sess.present_count = present_att or 0

            # Avg engagement
            eng_res = await db.execute(
                select(func.avg(EngagementWindow.interaction_activity_score))
                .where(EngagementWindow.session_id == sess.id)
            )
            avg_eng = eng_res.scalar()
            sess.avg_engagement = round(avg_eng, 1) if avg_eng else 0.0

        return sessions

    @staticmethod
    async def get_by_id(db: AsyncSession, session_id: int) -> Optional[Session]:
        query = select(Session).where(Session.id == session_id)
        result = await db.execute(query)
        sess = result.scalars().first()
        if sess:
            att_res = await db.execute(
                select(
                    func.count(AttendanceRecord.id),
                    func.sum(case((AttendanceRecord.status.in_(["PRESENT", "LATE"]), 1), else_=0))
                ).where(AttendanceRecord.session_id == sess.id)
            )
            total_att, present_att = att_res.first()
            sess.attendance_count = total_att or 0
            sess.present_count = present_att or 0

            eng_res = await db.execute(
                select(func.avg(EngagementWindow.interaction_activity_score))
                .where(EngagementWindow.session_id == sess.id)
            )
            avg_eng = eng_res.scalar()
            sess.avg_engagement = round(avg_eng, 1) if avg_eng else 0.0

        return sess

    @staticmethod
    async def create(db: AsyncSession, data: SessionCreate) -> Session:
        session_uid = f"SESS-{uuid.uuid4().hex[:8].upper()}"
        session = Session(
            session_uid=session_uid,
            course_id=data.course_id,
            course_title=data.course_title,
            instructor_name=data.instructor_name,
            room_number=data.room_number,
            target_class=data.target_class,
            expected_duration_minutes=data.expected_duration_minutes,
            source_type=data.source_type,
            status="SCHEDULED"
        )
        db.add(session)
        await db.commit()
        await db.refresh(session)

        # Pre-populate enrolled students for this target class as PENDING attendance records
        enrolled_query = select(Student).where(
            Student.is_archived == False,
            Student.course_name == data.target_class
        )
        enrolled_res = await db.execute(enrolled_query)
        enrolled_students = enrolled_res.scalars().all()

        for student in enrolled_students:
            record = AttendanceRecord(
                session_id=session.id,
                student_id=student.id,
                detected_name=student.full_name,
                status="PENDING",
                sustained_duration_seconds=0.0,
                observation_count=0
            )
            db.add(record)

        await db.commit()
        await db.refresh(session)
        return session

    @staticmethod
    async def update_status(db: AsyncSession, session_id: int, new_status: str) -> Session:
        session = await SessionService.get_by_id(db, session_id)
        if not session:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")

        now = datetime.datetime.utcnow()
        if new_status == "LIVE" and session.status == "SCHEDULED":
            session.start_time = now
        elif new_status == "COMPLETED" and session.status in ["LIVE", "PAUSED"]:
            session.end_time = now
            if session.start_time:
                session.actual_duration_seconds = (now - session.start_time).total_seconds()
            
            # Finalize attendance: Any remaining PENDING enrolled students become ABSENT
            pending_records = await db.execute(
                select(AttendanceRecord).where(
                    AttendanceRecord.session_id == session.id,
                    AttendanceRecord.status == "PENDING"
                )
            )
            for rec in pending_records.scalars().all():
                rec.status = "ABSENT"
                rec.notes = "Enrolled student not observed during session"

        session.status = new_status
        await db.commit()
        await db.refresh(session)
        return session
