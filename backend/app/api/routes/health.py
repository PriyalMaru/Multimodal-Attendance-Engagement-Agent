import os
import torch
from fastapi import APIRouter
from app.core.config import settings

router = APIRouter()

@router.get("/health")
async def health_check():
    cuda_avail = torch.cuda.is_available()
    device_name = torch.cuda.get_device_name(0) if cuda_avail else "CPU"
    return {
        "status": "healthy",
        "app_name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "device": device_name,
        "cuda_enabled": cuda_avail,
        "offline_mode": True,
        "models": {
            "yolo_detector": "active",
            "facenet": "active",
            "head_pose_pnp": "active",
            "audio_vad": "active"
        }
    }
