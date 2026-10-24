from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.analytics import SessionAnalyticsSummary
from app.services.analytics_service import AnalyticsService

router = APIRouter()

@router.get("/session/{session_id}", response_model=SessionAnalyticsSummary)
async def get_session_analytics(session_id: int, db: AsyncSession = Depends(get_db)):
    summary = await AnalyticsService.get_session_analytics(db, session_id)
    return summary

@router.get("/session/{session_id}/export-csv")
async def export_attendance_csv(session_id: int, db: AsyncSession = Depends(get_db)):
    csv_content = await AnalyticsService.export_attendance_csv(db, session_id)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=session_{session_id}_attendance.csv"
        }
    )
