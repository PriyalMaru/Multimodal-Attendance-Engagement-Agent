import os
from fastapi import APIRouter
from app.core.config import settings

router = APIRouter()

@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "app_name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "device": "CPU",
        "cuda_enabled": False,
        "offline_mode": True,
        "models": {
            "yolo_detector": "deferred",
            "facenet": "deferred",
            "head_pose_pnp": "deferred",
            "audio_vad": "deferred"
        }
    }
