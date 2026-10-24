from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.suggestions import SuggestionResponse, SuggestionAcknowledge
from app.services.suggestion_service import SuggestionService

router = APIRouter()
suggestion_service = SuggestionService()

@router.get("/session/{session_id}", response_model=List[SuggestionResponse])
async def get_suggestions(session_id: int, db: AsyncSession = Depends(get_db)):
    suggestions = await suggestion_service.get_by_session(db, session_id)
    return [SuggestionResponse.model_validate(s) for s in suggestions]

@router.post("/session/{session_id}/generate", response_model=List[SuggestionResponse])
async def generate_suggestions(session_id: int, db: AsyncSession = Depends(get_db)):
    suggestions = await suggestion_service.generate_and_save_for_session(db, session_id)
    return [SuggestionResponse.model_validate(s) for s in suggestions]

@router.put("/{suggestion_id}/acknowledge", response_model=SuggestionResponse)
async def acknowledge_suggestion(suggestion_id: int, db: AsyncSession = Depends(get_db)):
    updated = await suggestion_service.acknowledge(db, suggestion_id)
    return SuggestionResponse.model_validate(updated)
