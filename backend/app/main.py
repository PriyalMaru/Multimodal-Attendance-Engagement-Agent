import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.init_db import init_database
from app.api.api_router import api_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure SQLite database tables are created
    await init_database()
    yield
    # Shutdown logic if any

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Offline-first Multimodal Classroom Attendance & Observable Engagement Signal Intelligence Application",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOW_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include master API router
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "message": f"{settings.PROJECT_NAME} Backend API is running.",
        "documentation": "/docs",
        "api_v1": settings.API_V1_STR
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
