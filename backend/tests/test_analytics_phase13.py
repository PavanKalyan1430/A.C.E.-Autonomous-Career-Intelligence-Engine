import pytest
import asyncio
import json
import os
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select

from app.main import app
from app.core.database import Base, get_db
from app.core.config import settings
from app.models.user import User, Resume, UserMemory, InterviewSession, InterviewFeedback, Application
from app.core.security import get_password_hash

TEST_DATABASE_URL = "sqlite+aiosqlite:///test_analytics_phase13_db.sqlite"

@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"

@pytest.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    if os.path.exists("test_analytics_phase13_db.sqlite"):
        try:
            os.remove("test_analytics_phase13_db.sqlite")
        except Exception:
            pass
            
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    async with async_session() as session:
        yield session
        
    await engine.dispose()
    if os.path.exists("test_analytics_phase13_db.sqlite"):
        try:
            os.remove("test_analytics_phase13_db.sqlite")
        except Exception:
            pass

@pytest.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        async with async_session() as session:
            yield session
            
    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
    await engine.dispose()

@pytest.fixture(scope="function")
async def user_a(db_session: AsyncSession) -> User:
    user = User(
        email="user_a_analytics@ace.ai",
        hashed_password=get_password_hash("password123"),
        is_active=True
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    resume = Resume(
        user_id=user.id,
        file_name="user_a_resume.pdf",
        raw_text="Backend Engineer. Skills: Python, FastAPI, PostgreSQL.",
        parsed_data={"skills": ["Python", "FastAPI", "PostgreSQL"]}
    )
    db_session.add(resume)

    session_1 = InterviewSession(
        user_id=user.id,
        role_title="Backend Engineer",
        company_name="Stripe",
        is_completed=True,
        feedback={"overall_score": 82},
        transcript=[{
            "question": "Explain topological sort.",
            "evaluation": {"score": 85, "category": "System Design"},
            "communication": {"wpm": 125, "filler_word_count": 2, "filler_word_ratio": 0.02}
        }]
    )
    db_session.add(session_1)

    app_1 = Application(
        user_id=user.id,
        company_name="Stripe",
        role_title="Senior Backend Engineer",
        status="interview"
    )
    db_session.add(app_1)

    await db_session.commit()
    return user

@pytest.fixture(scope="function")
async def user_b(db_session: AsyncSession) -> User:
    user = User(
        email="user_b_analytics@ace.ai",
        hashed_password=get_password_hash("password123"),
        is_active=True
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user

@pytest.fixture
async def auth_headers_user_a(client: AsyncClient, user_a: User) -> dict:
    res = await client.post("/api/v1/auth/login", data={"username": "user_a_analytics@ace.ai", "password": "password123"})
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
async def auth_headers_user_b(client: AsyncClient, user_b: User) -> dict:
    res = await client.post("/api/v1/auth/login", data={"username": "user_b_analytics@ace.ai", "password": "password123"})
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

# --- 1. DASHBOARD API CONTRACT & DATA INTEGRITY ---
@pytest.mark.anyio
async def test_dashboard_api_contract_populated_user(client: AsyncClient, auth_headers_user_a: dict):
    res = await client.get("/api/v1/analytics/dashboard", headers=auth_headers_user_a)
    assert res.status_code == 200
    data = res.json()

    assert "overview" in data
    assert "interview_analytics" in data
    assert "communication_analytics" in data
    assert "skill_analytics" in data
    assert "company_analytics" in data
    assert "insights" in data
    assert "recommendations" in data
    assert "recent_activity" in data

    overview = data["overview"]
    assert overview["total_interviews"] == 1
    assert overview["completed_interviews"] == 1
    assert overview["interview_score"] == 82.0
    assert overview["active_applications"] == 1

    skills = data["skill_analytics"]["verified_skills"]
    assert "Python" in skills or "Fastapi" in skills

# --- 2. USER ISOLATION & IDOR PROTECTION ---
@pytest.mark.anyio
async def test_dashboard_user_data_isolation(client: AsyncClient, auth_headers_user_a: dict, auth_headers_user_b: dict):
    res_a = await client.get("/api/v1/analytics/dashboard", headers=auth_headers_user_a)
    assert res_a.status_code == 200
    data_a = res_a.json()

    res_b = await client.get("/api/v1/analytics/dashboard", headers=auth_headers_user_b)
    assert res_b.status_code == 200
    data_b = res_b.json()

    # User A has 1 interview & 1 application
    assert data_a["overview"]["total_interviews"] == 1
    assert data_a["overview"]["active_applications"] == 1

    # User B is brand new -> 0 interviews & 0 applications
    assert data_b["overview"]["total_interviews"] == 0
    assert data_b["overview"]["completed_interviews"] == 0
    assert data_b["overview"]["active_applications"] == 0
    assert data_b["overview"]["interview_score"] == 0.0

# --- 3. EMPTY STATE NEW USER HANDLING ---
@pytest.mark.anyio
async def test_dashboard_empty_state_new_user(client: AsyncClient, auth_headers_user_b: dict):
    res = await client.get("/api/v1/analytics/dashboard", headers=auth_headers_user_b)
    assert res.status_code == 200
    data = res.json()

    recs = data["recommendations"]
    assert len(recs) > 0
    rec_titles = [r["title"] for r in recs]
    assert "Complete First Mock Interview" in rec_titles or "Upload Resume" in rec_titles

# --- 4. AI INSIGHTS ENDPOINT & GROUNDING ---
@pytest.mark.anyio
async def test_ai_insights_endpoint_grounding(client: AsyncClient, auth_headers_user_a: dict):
    res = await client.post("/api/v1/analytics/ai-insights", headers=auth_headers_user_a, json={"force_refresh": True})
    assert res.status_code == 200
    data = res.json()

    assert "insights" in data
    assert "recommendations" in data
    assert len(data["insights"]) > 0

# --- 5. UNAUTHENTICATED REQUEST REJECTION ---
@pytest.mark.anyio
async def test_dashboard_unauthenticated_request(client: AsyncClient):
    res = await client.get("/api/v1/analytics/dashboard")
    assert res.status_code == 401
