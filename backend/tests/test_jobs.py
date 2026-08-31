import pytest
import httpx
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from typing import AsyncGenerator
from unittest.mock import patch

from app.main import app
from app.core.database import Base, get_db
from app.models.user import User, Resume
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

@pytest.fixture
async def auth_headers(client: AsyncClient, test_user: User) -> dict:
    res = await client.post("/api/v1/auth/login", data={"username": "recruiter_test@ace.ai", "password": "securepass123"})
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

# Store the original get method before patching
original_get = httpx.AsyncClient.get

async def mock_client_get(self_instance, url, *args, **kwargs):
    # Only intercept Adzuna API endpoint calls
    if "adzuna" in str(url):
        return MockResponse(mock_adzuna_response, 200)
    # Pass through other calls
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
        assert "LPA" in first_job["salary_range"] or "K" in first_job["salary_range"]
        assert first_job["match_score"] is not None

@pytest.mark.anyio
async def test_discover_jobs_with_keyword(client: AsyncClient, auth_headers: dict):
    with patch("httpx.AsyncClient.get", new=mock_client_get):
        res = await client.get("/api/v1/jobs/discover?keyword=FastAPI", headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        assert len(data["jobs"]) == 2

@pytest.mark.anyio
async def test_apply_to_job(client: AsyncClient, auth_headers: dict):
    payload = {
        "title": "Backend Architect",
        "company_name": "Cred",
        "description": "Designing cache pipelines and distributed ledger architecture.",
        "requirements": ["FastAPI", "Go"],
        "location": "Bangalore, India",
        "experience": "Lead",
        "job_type": "Full-time",
        "remote_onsite": "Remote"
    }
    res = await client.post("/api/v1/jobs/apply", json=payload, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["status"] == "success"

@pytest.mark.anyio
async def test_track_discovered_job(client: AsyncClient, auth_headers: dict):
    payload = {
        "title": "FastAPI Developer",
        "company_name": "Razorpay",
        "description": "Develop financial integration apps with high security standard.",
        "requirements": ["FastAPI", "PostgreSQL"],
        "location": "Bangalore, India",
        "experience": "Intermediate",
        "job_type": "Full-time",
        "remote_onsite": "Remote"
    }
    res = await client.post("/api/v1/jobs/track", json=payload, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["status"] == "success"
    assert "application_id" in res.json()
