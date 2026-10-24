from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.attendance import AttendanceRecordResponse, AttendanceUpdate
from app.services.attendance_service import AttendanceService

router = APIRouter()

@router.get("/session/{session_id}", response_model=List[AttendanceRecordResponse])
async def get_session_attendance(session_id: int, db: AsyncSession = Depends(get_db)):
    records = await AttendanceService.get_by_session(db, session_id)
    return records

@router.put("/{record_id}/override")
async def override_attendance(record_id: int, data: AttendanceUpdate, db: AsyncSession = Depends(get_db)):
    record = await AttendanceService.manual_override(db, record_id, data)
    return {
        "status": "success",
        "message": f"Attendance overridden to {record.status}",
        "record_id": record.id,
        "is_manual_override": record.is_manual_override
    }
