import asyncio
from sqlalchemy import text
from app.core.database import engine, Base
# Import all models to register them on Base
from app.models.user import User, Profile, Resume, Skill, Application, InterviewSession, InterviewFeedback, UserMemory, Recommendation, AgentExecution, ChatSession

async def fix_schema():
    print("Initializing database tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        print("Running column migrations...")
        for col, col_type in [("full_name", "VARCHAR"), ("preferences", "JSON"), ("skills_json", "JSON")]:
            try:
                await conn.execute(text(f"ALTER TABLE profiles ADD COLUMN {col} {col_type}"))
                print(f"Added column {col} to profiles")
            except Exception as e:
                print(f"Could not add column {col} (already exists or other error): {e}")
    print("Database initialization complete.")

if __name__ == "__main__":
    asyncio.run(fix_schema())
