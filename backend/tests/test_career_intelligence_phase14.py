import pytest
import asyncio
import os
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.core.database import Base, get_db
from app.models.user import User, Resume, UserMemory, InterviewSession, Application
from app.core.security import get_password_hash
from app.services.career_intelligence import normalize_skill, normalize_skill_list

TEST_DATABASE_URL = "sqlite+aiosqlite:///test_career_phase14_db.sqlite"

@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"

@pytest.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
        
    async with async_session() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()

@pytest.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield db_session
            
    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()

@pytest.fixture(scope="function")
async def user_a(db_session: AsyncSession) -> User:
    user = User(
        email="candidate_a@ace.ai",
        hashed_password=get_password_hash("password123"),
        is_active=True
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    resume = Resume(
        user_id=user.id,
        file_name="candidate_a_resume.pdf",
        raw_text="Backend Developer. Skills: Python, PostgreSQL, FastAPI.",
        parsed_data={"skills": ["Python", "PostgreSQL", "FastAPI"]}
    )
    db_session.add(resume)

    app_1 = Application(
        user_id=user.id,
        company_name="Stripe",
        role_title="Senior Backend Engineer",
        status="applied"
    )
    db_session.add(app_1)

    session_1 = InterviewSession(
        user_id=user.id,
        role_title="Backend Engineer",
        company_name="Stripe",
        is_completed=True,
        feedback={"overall_score": 65},
        transcript=[{
            "question": "How do you design a distributed cache in System Design?",
            "evaluation": {"score": 55, "category": "System Design"},
            "communication": {"wpm": 120, "filler_word_count": 3, "filler_word_ratio": 0.03}
        }]
    )
    db_session.add(session_1)

    await db_session.commit()
    return user

@pytest.fixture(scope="function")
async def user_b(db_session: AsyncSession) -> User:
    user = User(
        email="candidate_b@ace.ai",
        hashed_password=get_password_hash("password123"),
        is_active=True
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    resume = Resume(
        user_id=user.id,
        file_name="candidate_b_resume.pdf",
        raw_text="DevOps Specialist. Skills: Kubernetes, Docker, AWS.",
        parsed_data={"skills": ["Kubernetes", "Docker", "AWS"]}
    )
    db_session.add(resume)

    app_1 = Application(
        user_id=user.id,
        company_name="Google",
        role_title="Site Reliability Engineer",
        status="interview"
    )
    db_session.add(app_1)

    await db_session.commit()
    return user

@pytest.fixture
async def auth_headers_user_a(client: AsyncClient, user_a: User) -> dict:
    res = await client.post("/api/v1/auth/login", data={"username": "candidate_a@ace.ai", "password": "password123"})
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
async def auth_headers_user_b(client: AsyncClient, user_b: User) -> dict:
    res = await client.post("/api/v1/auth/login", data={"username": "candidate_b@ace.ai", "password": "password123"})
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

# --- 1. SKILL NORMALIZATION TESTS ---
def test_skill_normalization_layer():
    assert normalize_skill("AWS") == "AWS"
    assert normalize_skill("python") == "Python"
    assert normalize_skill("fastapi") == "Fastapi"
    
    normalized = normalize_skill_list(["python", "fastapi", "postgresql", "PYTHON"])
    assert "Python" in normalized
    assert "Fastapi" in normalized
    assert len(normalized) == 3  # Duplicate python eliminated case-insensitively

# --- 2. CANONICAL CANDIDATE PROFILE API ---
@pytest.mark.anyio
async def test_get_candidate_profile(client: AsyncClient, auth_headers_user_a: dict):
    res = await client.get("/api/v1/career/profile", headers=auth_headers_user_a)
    assert res.status_code == 200
    data = res.json()

    assert data["email"] == "candidate_a@ace.ai"
    assert "Python" in data["verified_skills"]
    assert "Postgresql" in data["verified_skills"] or "PostgreSQL" in data["verified_skills"]
    assert data["target_company"] == "Stripe"
    assert data["interview_history_count"] == 1
    assert data["average_interview_score"] == 65.0

# --- 3. CAREER INTELLIGENCE ALIGNMENT & PROVENANCE ---
@pytest.mark.anyio
async def test_get_career_intelligence_flow(client: AsyncClient, auth_headers_user_a: dict):
    res = await client.get("/api/v1/career/intelligence", headers=auth_headers_user_a)
    assert res.status_code == 200
    data = res.json()

    assert "profile" in data
    assert "skill_alignment" in data
    assert "prioritized_gaps" in data
    assert "learning_roadmap" in data
    assert "recommendations" in data

    # Verify interview weakness (System Design) influenced priority
    gaps = data["prioritized_gaps"]
    sys_design_gap = next((g for g in gaps if g["skill"] == "System Design"), None)
    if sys_design_gap:
        assert sys_design_gap["priority"] == "high"
        assert "interview_weakness" in sys_design_gap["evidence_sources"]

    # Verify recommendation provenance
    recs = data["recommendations"]
    assert len(recs) > 0
    for r in recs:
        assert "source_metrics" in r
        assert "recommended_action" in r

# --- 4. MULTI-USER DATA ISOLATION (IDOR) ---
@pytest.mark.anyio
async def test_multi_user_isolation(client: AsyncClient, auth_headers_user_a: dict, auth_headers_user_b: dict):
    res_a = await client.get("/api/v1/career/intelligence", headers=auth_headers_user_a)
    data_a = res_a.json()

    res_b = await client.get("/api/v1/career/intelligence", headers=auth_headers_user_b)
    data_b = res_b.json()

    # User A verified skills: Python, PostgreSQL, FastAPI | Target: Stripe
    assert "Python" in data_a["profile"]["verified_skills"]
    assert data_a["profile"]["target_company"] == "Stripe"

    # User B verified skills: Kubernetes, Docker, AWS | Target: Google
    assert "Kubernetes" in data_b["profile"]["verified_skills"]
    assert data_b["profile"]["target_company"] == "Google"

    # 0 Cross-user data leakage
    assert "Kubernetes" not in data_a["profile"]["verified_skills"]
    assert "Python" not in data_b["profile"]["verified_skills"]

# --- 5. REFRESH CAREER INTELLIGENCE ENDPOINT ---
@pytest.mark.anyio
async def test_refresh_career_intelligence(client: AsyncClient, auth_headers_user_a: dict):
    res = await client.post("/api/v1/career/refresh", headers=auth_headers_user_a)
    assert res.status_code == 200
    data = res.json()
    assert "skill_alignment" in data

# --- 6. UNAUTHENTICATED REQUEST REJECTION ---
@pytest.mark.anyio
async def test_unauthenticated_career_request(client: AsyncClient):
    res = await client.get("/api/v1/career/intelligence")
    assert res.status_code == 401

# --- 7. ZERO-MOCK ROLE SUGGESTIONS ERRORS ---
@pytest.mark.anyio
async def test_search_roles_unconfigured_error(client: AsyncClient, auth_headers_user_a: dict):
    from app.services.occupation_provider import occupation_service
    # Mocking unconfigured/missing provider state
    original_provider = occupation_service.provider
    occupation_service.provider = None
    try:
        res = await client.get("/api/v1/career/roles/search?q=DevOps", headers=auth_headers_user_a)
        assert res.status_code == 503
        detail = res.json()["detail"]
        assert detail["status"] == "unconfigured"
        assert "unconfigured" in detail["message"]
    finally:
        occupation_service.provider = original_provider

@pytest.mark.anyio
async def test_search_roles_provider_failure_error(client: AsyncClient, auth_headers_user_a: dict):
    from unittest.mock import patch
    from app.services.occupation_provider import OccupationProviderUnavailableError
    
    with patch("app.services.occupation_provider.occupation_service.search_roles", side_effect=OccupationProviderUnavailableError("Adzuna API connection timeout")):
        res = await client.get("/api/v1/career/roles/search?q=DevOps", headers=auth_headers_user_a)
        assert res.status_code == 503
        detail = res.json()["detail"]
        assert detail["status"] == "unavailable"
        assert "temporarily unavailable" in detail["message"]
