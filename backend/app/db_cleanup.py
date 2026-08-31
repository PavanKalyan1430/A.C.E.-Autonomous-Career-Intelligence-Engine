import asyncio
import logging
from sqlalchemy import text
from app.core.database import SessionLocal

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def cleanup_database():
    logger.info("Starting database cleanup of mock/dummy records...")
    async with SessionLocal() as session:
        try:
            # Delete Applications that were created for one-shot JD comparisons
            result = await session.execute(
                text("DELETE FROM applications WHERE company_name = 'Target JD Match' OR role_title = 'Target Role'")
            )
            await session.commit()
            logger.info(f"Purged {result.rowcount} dummy application matching records successfully.")
        except Exception as e:
            await session.rollback()
            logger.error(f"Failed to cleanup database: {e}")

if __name__ == "__main__":
    asyncio.run(cleanup_database())
