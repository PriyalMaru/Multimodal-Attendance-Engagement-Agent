from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.session import SessionCreate, SessionUpdate, SessionResponse
from app.services.session_service import SessionService

router = APIRouter()

@router.get("", response_model=List[SessionResponse])
async def list_sessions(db: AsyncSession = Depends(get_db)):
    sessions = await SessionService.get_all(db)
    return [SessionResponse.model_validate(s) for s in sessions]

@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(session_id: int, db: AsyncSession = Depends(get_db)):
    session = await SessionService.get_by_id(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    return SessionResponse.model_validate(session)

@router.post("", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(data: SessionCreate, db: AsyncSession = Depends(get_db)):
    session = await SessionService.create(db, data)
    return SessionResponse.model_validate(session)

@router.put("/{session_id}/status", response_model=SessionResponse)
async def update_session_status(session_id: int, data: SessionUpdate, db: AsyncSession = Depends(get_db)):
    if not data.status:
        raise HTTPException(status_code=400, detail="Status must be provided.")
    session = await SessionService.update_status(db, session_id, data.status)
    return SessionResponse.model_validate(session)
