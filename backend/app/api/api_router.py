from fastapi import APIRouter
from app.api.routes import (
    health,
    students,
    sessions,
    attendance,
    analytics,
    suggestions,
    video_processing,
    dashboard
)

api_router = APIRouter()

api_router.include_router(health.router, tags=["Health"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(students.router, prefix="/students", tags=["Students"])
api_router.include_router(sessions.router, prefix="/sessions", tags=["Sessions"])
api_router.include_router(attendance.router, prefix="/attendance", tags=["Attendance"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
api_router.include_router(suggestions.router, prefix="/suggestions", tags=["Teaching Suggestions"])
api_router.include_router(video_processing.router, prefix="/video", tags=["Video Processing"])
