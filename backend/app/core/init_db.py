import asyncio
from app.core.database import engine, Base
import app.models.db_models  # Ensure all models are registered

async def init_database():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Database tables initialized successfully.")

if __name__ == "__main__":
    asyncio.run(init_database())
