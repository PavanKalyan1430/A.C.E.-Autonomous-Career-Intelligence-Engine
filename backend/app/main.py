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

from sqlalchemy import text

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables on startup only for SQLite (development/tests)
    if settings.DATABASE_URL.startswith("sqlite"):
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            for col, col_type in [("full_name", "VARCHAR"), ("preferences", "JSON")]:
                try:
                    await conn.execute(text(f"ALTER TABLE profiles ADD COLUMN {col} {col_type}"))
                except Exception:
                    pass
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
    logger.exception(f"Unhandled exception occurred: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred. Please contact support."},
    )
