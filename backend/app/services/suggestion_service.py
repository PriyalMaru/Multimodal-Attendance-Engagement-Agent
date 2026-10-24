from typing import List, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi import HTTPException, status

from app.models.db_models import TeachingSuggestion, EngagementWindow, AttendanceRecord, Session
from app.agents.teaching_agent import TeachingSuggestionAgent

class SuggestionService:
    def __init__(self):
        self.agent = TeachingSuggestionAgent()

    async def get_by_session(self, db: AsyncSession, session_id: int) -> List[TeachingSuggestion]:
        query = (
            select(TeachingSuggestion)
            .where(TeachingSuggestion.session_id == session_id)
            .order_by(TeachingSuggestion.id.desc())
        )
        res = await db.execute(query)
        return list(res.scalars().all())

    async def generate_and_save_for_session(self, db: AsyncSession, session_id: int) -> List[TeachingSuggestion]:
        # Fetch windows
        win_res = await db.execute(
            select(EngagementWindow)
            .where(EngagementWindow.session_id == session_id)
            .order_by(EngagementWindow.window_index.asc())
        )
        windows = [
            {
                "window_index": w.window_index,
                "interaction_activity_score": w.interaction_activity_score,
                "movement_intensity": w.movement_intensity,
                "speech_active_ratio": w.speech_active_ratio,
                "forward_facing_ratio": w.forward_facing_ratio,
                "is_audio_available": w.is_audio_available
            }
            for w in win_res.scalars().all()
        ]

        # Fetch attendance counts
        att_res = await db.execute(
            select(AttendanceRecord).where(AttendanceRecord.session_id == session_id)
        )
        records = att_res.scalars().all()
        unverified = sum(1 for r in records if r.status == "UNVERIFIED")
        att_stats = {
            "total_records": len(records),
            "unverified_count": unverified
        }

        # Run agent
        suggestions_data = await self.agent.get_suggestions(windows, att_stats)

        # Clear existing unacknowledged suggestions for this session to avoid clutter
        existing = await db.execute(
            select(TeachingSuggestion).where(
                TeachingSuggestion.session_id == session_id,
                TeachingSuggestion.acknowledged == False
            )
        )
        for s in existing.scalars().all():
            await db.delete(s)

        # Save new
        created = []
        for item in suggestions_data:
            s_obj = TeachingSuggestion(
                session_id=session_id,
                suggestion_type=item.get("suggestion_type", "GENERAL"),
                title=item.get("title", "Observation Note"),
                description=item.get("description", ""),
                evidence=item.get("evidence", ""),
                urgency=item.get("urgency", "MEDIUM"),
                generated_by=item.get("generated_by", "RULE_BASED")
            )
            db.add(s_obj)
            created.append(s_obj)

        await db.commit()
        for s_obj in created:
            await db.refresh(s_obj)
        return created

    async def acknowledge(self, db: AsyncSession, suggestion_id: int) -> TeachingSuggestion:
        res = await db.execute(select(TeachingSuggestion).where(TeachingSuggestion.id == suggestion_id))
        s_obj = res.scalars().first()
        if not s_obj:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Suggestion not found.")
        s_obj.acknowledged = True
        await db.commit()
        await db.refresh(s_obj)
        return s_obj
