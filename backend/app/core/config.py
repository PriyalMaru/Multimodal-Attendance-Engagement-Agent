import os
from pathlib import Path

try:
    from pydantic_settings import BaseSettings
except ImportError:
    class BaseSettings:
        pass

# Base Paths
BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
UPLOAD_DIR = DATA_DIR / "uploads"
DATABASE_DIR = DATA_DIR / "db"
EMBEDDINGS_DIR = DATA_DIR / "embeddings"
MODELS_DIR = BASE_DIR.parent / "models"

# Ensure runtime directories exist
for folder in [DATA_DIR, UPLOAD_DIR, DATABASE_DIR, EMBEDDINGS_DIR, MODELS_DIR]:
    folder.mkdir(parents=True, exist_ok=True)

class Settings:
    PROJECT_NAME: str = "Multimodal Attendance & Engagement Agent"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    # Directories
    DATA_DIR = DATA_DIR
    UPLOAD_DIR = UPLOAD_DIR
    DATABASE_DIR = DATABASE_DIR
    EMBEDDINGS_DIR = EMBEDDINGS_DIR
    MODELS_DIR = MODELS_DIR
    
    # Database
    DATABASE_URL: str = f"sqlite+aiosqlite:///{DATABASE_DIR}/attendance.db"
    SYNC_DATABASE_URL: str = f"sqlite:///{DATABASE_DIR}/attendance.db"
    
    # Face & Detection Config
    FACE_SIMILARITY_THRESHOLD: float = 0.65  # Cosine similarity for face matching
    MIN_ATTENDANCE_OBSERVATIONS: int = 5    # Minimum valid frames/observations to mark confirmed
    MIN_PRESENCE_RATIO: float = 0.5         # Sustained presence ratio of session or active window
    LATE_ARRIVAL_MINUTES: int = 10          # Beyond 10 mins considered Late
    
    # Window aggregation
    ENGAGEMENT_WINDOW_SECONDS: int = 30     # 30-second windows for aggregate engagement metrics
    
    # Ollama integration
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "llama3.2")
    
    # Privacy & Local processing
    RAW_MEDIA_PERSISTENCE: bool = False     # Do not store raw video files permanently
    ALLOW_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

settings = Settings()
