import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.core.config import settings

async def main():
    print(f"Connecting to DB: {settings.DATABASE_URL}")
    engine = create_async_engine(settings.DATABASE_URL)
    
    app_cols = [
        ("external_apply_url", "VARCHAR"),
        ("location", "VARCHAR"),
        ("applied_at", "TIMESTAMP WITHOUT TIME ZONE"),
        ("application_source", "VARCHAR"),
        ("external_application_opened_at", "TIMESTAMP WITHOUT TIME ZONE")
    ]
    
    for col, col_type in app_cols:
        try:
            async with engine.begin() as conn:
                await conn.execute(text(f"ALTER TABLE applications ADD COLUMN {col} {col_type}"))
                print(f"Added column {col} to applications table.")
        except Exception as e:
            print(f"Column {col} alter status: {e}")
            
    await engine.dispose()
    print("Migration finished!")

if __name__ == "__main__":
    asyncio.run(main())
