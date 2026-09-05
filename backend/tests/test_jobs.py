import pytest
import httpx
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select
from typing import AsyncGenerator
from unittest.mock import patch

from app.main import app
from app.core.database import Base, get_db
from app.models.user import User, Resume, Application, ApplicationStatus
from app.core.security import get_password_hash

TEST_DATABASE_URL = "sqlite+aiosqlite:///test_jobs_db.sqlite"

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
async def test_user(db_session: AsyncSession) -> User:
    user = User(
        email="recruiter_test@ace.ai",
        hashed_password=get_password_hash("securepass123"),
        is_active=True
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    resume = Resume(
        user_id=user.id,
        file_name="res.pdf",
        raw_text="Experienced Software Developer. Skills: FastAPI, PostgreSQL, Go.",
        parsed_data={"skills": ["FastAPI", "PostgreSQL", "Go"]}
    )
    db_session.add(resume)
    await db_session.commit()
    return user

@pytest.fixture(scope="function")
async def test_user_b(db_session: AsyncSession) -> User:
    user = User(
        email="other_candidate@ace.ai",
        hashed_password=get_password_hash("securepass123"),
        is_active=True
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user

@pytest.fixture
async def auth_headers(client: AsyncClient, test_user: User) -> dict:
    res = await client.post("/api/v1/auth/login", data={"username": "recruiter_test@ace.ai", "password": "securepass123"})
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
async def auth_headers_b(client: AsyncClient, test_user_b: User) -> dict:
    res = await client.post("/api/v1/auth/login", data={"username": "other_candidate@ace.ai", "password": "securepass123"})
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

# Mock Adzuna JSON response
mock_adzuna_response = {
    "count": 2,
    "results": [
        {
            "id": "12345",
            "title": "Backend AI Engineer",
            "description": "We are seeking a developer with FastAPI and PostgreSQL expertise to build Agentic models.",
            "company": {"display_name": "Capco"},
            "location": {"display_name": "India"},
            "contract_time": "full_time",
            "contract_type": "permanent",
            "created": "2026-08-12T01:59:40Z",
            "redirect_url": "https://example.com/apply/12345",
            "salary_min": 90000,
            "salary_max": 120000
        },
        {
            "id": "67890",
            "title": "FastAPI Architect",
            "description": "Design core transaction pipelines with Python, PostgreSQL, and Go.",
            "company": {"display_name": "Cred"},
            "location": {"display_name": "Bangalore, India"},
            "contract_time": "full_time",
            "contract_type": "contract",
            "created": "2026-08-25T10:00:00Z",
            "redirect_url": "https://example.com/apply/67890"
        }
    ]
}

class MockResponse:
    def __init__(self, json_data, status_code):
        self.json_data = json_data
        self.status_code = status_code
        self.text = "Mock Text"

    def json(self):
        return self.json_data

original_get = httpx.AsyncClient.get

async def mock_client_get(self_instance, url, *args, **kwargs):
    if "adzuna" in str(url):
        return MockResponse(mock_adzuna_response, 200)
    return await original_get(self_instance, url, *args, **kwargs)

@pytest.mark.anyio
async def test_discover_jobs_without_filters(client: AsyncClient, auth_headers: dict):
    with patch("httpx.AsyncClient.get", new=mock_client_get):
        res = await client.get("/api/v1/jobs/discover", headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        assert "jobs" in data
        assert len(data["jobs"]) == 2
        assert data["total_count"] == 2
        
        first_job = data["jobs"][0]
        assert first_job["title"] == "Backend AI Engineer"
        assert first_job["company_name"] == "Capco"
        assert first_job["match_score"] is not None

@pytest.mark.anyio
async def test_apply_handoff_with_valid_url(client: AsyncClient, auth_headers: dict, db_session: AsyncSession, test_user: User):
    payload = {
        "title": "Backend Architect",
        "company_name": "Cred",
        "description": "Designing cache pipelines.",
        "external_apply_url": "https://careers.cred.club/apply/101"
    }
    res = await client.post("/api/v1/jobs/apply", json=payload, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["action"] == "external_application_handoff"
    assert data["external_apply_url"] == "https://careers.cred.club/apply/101"
    assert data["requires_user_confirmation"] is True

    # Ensure no applied record was created by handoff call alone
    stmt = select(Application).filter(Application.user_id == test_user.id)
    db_res = await db_session.execute(stmt)
    apps = db_res.scalars().all()
    assert len(apps) == 0

@pytest.mark.anyio
async def test_apply_handoff_with_missing_or_invalid_url(client: AsyncClient, auth_headers: dict):
    # Test empty URL
    payload_empty = {
        "title": "Backend Architect",
        "company_name": "Cred",
        "external_apply_url": ""
    }
    res_empty = await client.post("/api/v1/jobs/apply", json=payload_empty, headers=auth_headers)
    assert res_empty.status_code == 400
    assert "Application link unavailable" in res_empty.json()["detail"]

    # Test invalid URL format
    payload_invalid = {
        "title": "Backend Architect",
        "company_name": "Cred",
        "external_apply_url": "invalid-url-string"
    }
    res_invalid = await client.post("/api/v1/jobs/apply", json=payload_invalid, headers=auth_headers)
    assert res_invalid.status_code == 400
    assert "Application link unavailable" in res_invalid.json()["detail"]

@pytest.mark.anyio
async def test_confirm_applied_to_job(client: AsyncClient, auth_headers: dict, db_session: AsyncSession, test_user: User):
    payload = {
        "title": "Senior AI Developer",
        "company_name": "Anthropic",
        "description": "Building LLM pipelines.",
        "location": "Remote",
        "external_apply_url": "https://anthropic.com/jobs/1"
    }
    res = await client.post("/api/v1/jobs/confirm-apply", json=payload, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert "application_id" in data
    assert data["applied_at"] is not None

    # Verify database persistence
    stmt = select(Application).filter(Application.id == data["application_id"])
    db_res = await db_session.execute(stmt)
    app_record = db_res.scalars().first()
    assert app_record is not None
    assert app_record.status == ApplicationStatus.APPLIED.value
    assert app_record.application_source == "EXTERNAL_USER_CONFIRMED"
    assert app_record.applied_at is not None

@pytest.mark.anyio
async def test_confirm_applied_idempotent_duplicate(client: AsyncClient, auth_headers: dict, db_session: AsyncSession, test_user: User):
    payload = {
        "title": "Staff Backend Engineer",
        "company_name": "Stripe",
        "description": "Payment infrastructure.",
        "external_apply_url": "https://stripe.com/jobs/99"
    }
    # First confirmation
    res1 = await client.post("/api/v1/jobs/confirm-apply", json=payload, headers=auth_headers)
    assert res1.status_code == 200
    app_id_1 = res1.json()["application_id"]

    # Duplicate confirmation
    res2 = await client.post("/api/v1/jobs/confirm-apply", json=payload, headers=auth_headers)
    assert res2.status_code == 200
    app_id_2 = res2.json()["application_id"]

    assert app_id_1 == app_id_2

    # Verify only 1 application record exists in DB
    stmt = select(Application).filter(
        Application.user_id == test_user.id,
        Application.company_name == "Stripe",
        Application.role_title == "Staff Backend Engineer"
    )
    db_res = await db_session.execute(stmt)
    records = db_res.scalars().all()
    assert len(records) == 1

@pytest.mark.anyio
async def test_track_discovered_job_creates_tracked_status(client: AsyncClient, auth_headers: dict, db_session: AsyncSession, test_user: User):
    payload = {
        "title": "FastAPI Developer",
        "company_name": "Razorpay",
        "description": "Develop financial integration apps.",
        "location": "Bangalore, India",
        "external_apply_url": "https://razorpay.com/careers/12"
    }
    res = await client.post("/api/v1/jobs/track", json=payload, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    app_id = data["application_id"]

    stmt = select(Application).filter(Application.id == app_id)
    db_res = await db_session.execute(stmt)
    app_record = db_res.scalars().first()
    assert app_record.status == ApplicationStatus.TRACKED.value

@pytest.mark.anyio
async def test_track_then_confirm_applied_updates_same_record(client: AsyncClient, auth_headers: dict, db_session: AsyncSession, test_user: User):
    payload = {
        "title": "Platform Engineer",
        "company_name": "Databricks",
        "description": "Distributed data engines.",
        "external_apply_url": "https://databricks.com/careers/55"
    }
    # 1. Track job first
    track_res = await client.post("/api/v1/jobs/track", json=payload, headers=auth_headers)
    app_id = track_res.json()["application_id"]

    # Verify initial status is tracked
    stmt = select(Application).filter(Application.id == app_id)
    db_res = await db_session.execute(stmt)
    app_record = db_res.scalars().first()
    assert app_record.status == ApplicationStatus.TRACKED.value
    assert app_record.applied_at is None

    # 2. Later user confirms "I Applied"
    confirm_res = await client.post("/api/v1/jobs/confirm-apply", json=payload, headers=auth_headers)
    assert confirm_res.status_code == 200
    assert confirm_res.json()["application_id"] == app_id

    # Verify record was updated to APPLIED
    await db_session.refresh(app_record)
    assert app_record.status == ApplicationStatus.APPLIED.value
    assert app_record.applied_at is not None
    assert app_record.application_source == "EXTERNAL_USER_CONFIRMED"

@pytest.mark.anyio
async def test_user_data_isolation(client: AsyncClient, auth_headers: dict, auth_headers_b: dict, db_session: AsyncSession, test_user: User, test_user_b: User):
    # User A creates an application
    payload_a = {
        "title": "Security Lead",
        "company_name": "Cloudflare",
        "external_apply_url": "https://cloudflare.com/jobs/1"
    }
    res_a = await client.post("/api/v1/jobs/confirm-apply", json=payload_a, headers=auth_headers)
    app_id_a = res_a.json()["application_id"]

    # User B lists applications -> must NOT see User A's application
    res_b_list = await client.get("/api/v1/applications/", headers=auth_headers_b)
    assert res_b_list.status_code == 200
    user_b_apps = res_b_list.json()
    assert len(user_b_apps) == 0

    # User B attempts to access User A's application detail directly -> 404 Not Found
    res_b_detail = await client.get(f"/api/v1/applications/{app_id_a}", headers=auth_headers_b)
    assert res_b_detail.status_code == 404

@pytest.mark.anyio
async def test_analytics_counts_only_confirmed_applied(client: AsyncClient, auth_headers: dict):
    # Track 1 job (status: tracked)
    track_payload = {
        "title": "Frontend Engineer",
        "company_name": "Vercel",
        "external_apply_url": "https://vercel.com/jobs/1"
    }
    await client.post("/api/v1/jobs/track", json=track_payload, headers=auth_headers)

    # Confirm 1 job (status: applied)
    apply_payload = {
        "title": "Backend Engineer",
        "company_name": "Supabase",
        "external_apply_url": "https://supabase.com/jobs/2"
    }
    await client.post("/api/v1/jobs/confirm-apply", json=apply_payload, headers=auth_headers)

    # Check dashboard metrics
    res_dash = await client.get("/api/v1/analytics/dashboard", headers=auth_headers)
    assert res_dash.status_code == 200
    data = res_dash.json()

    # Active applications KPI count must equal 1 (only the confirmed APPLIED application)
    assert data["overview"]["active_applications"] == 1
    assert data["funnel"]["applied"] == 1
    assert data["funnel"]["tracked"] == 1
