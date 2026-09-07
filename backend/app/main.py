from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import engine, Base
from app.api.auth import router as auth_router
from app.api.resume import router as resume_router
from app.api.company import router as company_router
from app.api.agent import router as agent_router
from app.api.memory import router as memory_router
from app.api.interview import router as interview_router
from app.api.applications import router as application_router
from app.api.analytics import router as analytics_router
from app.api.career import router as career_router
from app.api.jobs import router as jobs_router

from sqlalchemy import text

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Verify database connection on startup with cold-start retries
    import asyncio
    connected = False
    for attempt in range(1, 4):
        try:
            async with engine.connect() as conn:
                await asyncio.wait_for(conn.execute(text("SELECT 1")), timeout=15.0)
                logger.info(f"Database connection verified successfully (attempt {attempt}).")
                connected = True
                break
        except Exception as e:
            logger.warning(f"Database connection check attempt {attempt}/3 failed: {e}")
            if attempt < 3:
                await asyncio.sleep(2.0)

    if not connected:
        logger.critical("Database connection could not be established after retries on startup.")
    else:
        try:
            async with engine.begin() as conn:
                # Ensure all tables exist
                await conn.run_sync(Base.metadata.create_all)
                # Self-healing column additions for existing production tables
                migration_sqls = [
                    "ALTER TABLE applications ADD COLUMN IF NOT EXISTS external_apply_url VARCHAR",
                    "ALTER TABLE applications ADD COLUMN IF NOT EXISTS location VARCHAR",
                    "ALTER TABLE applications ADD COLUMN IF NOT EXISTS applied_at TIMESTAMP WITHOUT TIME ZONE",
                    "ALTER TABLE applications ADD COLUMN IF NOT EXISTS application_source VARCHAR",
                    "ALTER TABLE applications ADD COLUMN IF NOT EXISTS external_application_opened_at TIMESTAMP WITHOUT TIME ZONE",
                    "ALTER TABLE resumes ADD COLUMN IF NOT EXISTS ats_analysis JSON DEFAULT '{}'::json"
                ]
                for sql_stmt in migration_sqls:
                    try:
                        await conn.execute(text(sql_stmt))
                    except Exception as col_err:
                        logger.warning(f"Schema migration statement warning: {col_err}")
                logger.info("Database schema migration completed successfully.")
        except Exception as mig_err:
            logger.error(f"Failed to execute startup schema migrations: {mig_err}")

    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(resume_router, prefix=settings.API_V1_STR)
app.include_router(company_router, prefix=settings.API_V1_STR)
app.include_router(agent_router, prefix=settings.API_V1_STR)
app.include_router(memory_router, prefix=settings.API_V1_STR)
app.include_router(interview_router, prefix=settings.API_V1_STR)
app.include_router(application_router, prefix=settings.API_V1_STR)
app.include_router(analytics_router, prefix=settings.API_V1_STR)
app.include_router(career_router, prefix=settings.API_V1_STR)
app.include_router(jobs_router, prefix=settings.API_V1_STR)

@app.get("/")
def read_root():
    return {"message": f"Welcome to {settings.PROJECT_NAME} API. Access documentation at /docs"}

from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import logging

logger = logging.getLogger(__name__)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    if isinstance(exc, (StarletteHTTPException, RequestValidationError)):
        raise exc
    logger.exception(f"Unhandled exception occurred on {request.url.path}: {exc}")
    import traceback
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal Server Error: {str(exc)}", "type": type(exc).__name__},
    )
