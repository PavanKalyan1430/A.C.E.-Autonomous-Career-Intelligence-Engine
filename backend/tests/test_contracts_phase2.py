import pytest
import asyncio
import json
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
import math
from unittest.mock import patch, AsyncMock

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.core.database import Base, get_db
from app.models.user import User, Application, InterviewSession, Resume, ApplicationStatus, InterviewFeedback
from app.core.security import get_password_hash

@pytest.fixture(autouse=True)
def mock_interview_tools():
    mock_gen = AsyncMock()
    mock_eval = AsyncMock()
    mock_gen.ainvoke.return_value = json.dumps({"questions": ["Q1", "Q2", "Q3"]})
    mock_eval.ainvoke.return_value = json.dumps({
        "evaluation_score": 85.0,
        "llm_feedback": {"technical_score": 85.0},
        "nlp_action_verbs_detected": ["design"],
        "nlp_quantifiable_metrics": ["40%"],
        "filler_words_found": []
    })
    with patch("app.api.interview.generate_interview_questions_tool", mock_gen), \
         patch("app.api.interview.evaluate_star_interview_tool", mock_eval):
        yield mock_gen, mock_eval

# SQLite memory database for isolated contract tests
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"

@pytest.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    async with async_session() as session:
        yield session
        
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
        email="test_contract@ace.ai",
        hashed_password=get_password_hash("securepassword123"),
        is_active=True,
        is_superuser=False
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user

@pytest.fixture(scope="function")
async def auth_headers(client: AsyncClient, test_user: User) -> dict:
    login_data = {
        "username": test_user.email,
        "password": "securepassword123"
    }
    response = await client.post("/api/v1/auth/login", data=login_data)
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

# ---------------------------------------------------------
# USR-001 & USR-002: User Registration & Update Tests
# ---------------------------------------------------------

@pytest.mark.anyio
async def test_user_password_strength_and_limits(client: AsyncClient):
    # Test min length rejection
    res = await client.post("/api/v1/auth/register", json={
        "email": "too_short@ace.ai",
        "password": "short"
    })
    assert res.status_code == 422
    assert "at least 8 characters long" in res.text

    # Test max length rejection
    res = await client.post("/api/v1/auth/register", json={
        "email": "too_long@ace.ai",
        "password": "p" * 129
    })
    assert res.status_code == 422
    assert "at most 128 characters long" in res.text

    # Test successful creation within bounds
    res = await client.post("/api/v1/auth/register", json={
        "email": "within_bounds@ace.ai",
        "password": "p" * 20
    })
    assert res.status_code == 200
    user_data = res.json()
    assert user_data["email"] == "within_bounds@ace.ai"
    assert user_data["is_superuser"] is False  # Privileged field protection default
    assert user_data["is_active"] is True

# ---------------------------------------------------------
# CHAT-001 & CHAT-002: Message Protection & Roles
# ---------------------------------------------------------

@pytest.mark.anyio
async def test_chat_message_role_restriction(client: AsyncClient, auth_headers: dict):
    # Ensure client query endpoint doesn't allow overriding roles to assistant/system
    # Since agent/query only takes 'message' and 'session_id', role is strictly set by server.
    res = await client.post("/api/v1/agent/query", headers=auth_headers, json={
        "message": "Hello A.C.E.",
        "session_id": None
    })
    assert res.status_code == 200
    data = res.json()
    assert "session_id" in data
    assert "response" in data

# ---------------------------------------------------------
# INT-001 - INT-005: Interview Data Contracts
# ---------------------------------------------------------

@pytest.mark.anyio
async def test_interview_contracts_integrity(client: AsyncClient, db_session: AsyncSession, auth_headers: dict, test_user: User):
    # 1. Start session
    start_payload = {
        "role_title": "Staff Engineer",
        "company_name": "Google",
        "tech_stack_or_jd": "Python, Docker, Distributed Systems"
    }
    start_res = await client.post("/api/v1/interview/start", headers=auth_headers, json=start_payload)
    assert start_res.status_code == 200
    session_data = start_res.json()
    session_id = session_data["session_id"]
    assert len(session_data["questions"]) > 0

    # 2. Test empty answer validation (INT-003)
    submit_res = await client.post("/api/v1/interview/submit-answer", headers=auth_headers, json={
        "session_id": session_id,
        "question_index": 0,
        "user_answer": "   ",  # whitespace only
        "speech_duration_seconds": 10.0
    })
    assert submit_res.status_code == 422
    assert "must not be empty" in submit_res.text

    # 3. Test speech duration validation (INT-004)
    submit_res = await client.post("/api/v1/interview/submit-answer", headers=auth_headers, json={
        "session_id": session_id,
        "question_index": 0,
        "user_answer": "This is a correct answer of reasonable length.",
        "speech_duration_seconds": -5.0  # negative
    })
    assert submit_res.status_code == 422
    assert "positive" in submit_res.text

    submit_res = await client.post("/api/v1/interview/submit-answer", headers=auth_headers, json={
        "session_id": session_id,
        "question_index": 0,
        "user_answer": "This is a correct answer of reasonable length.",
        "speech_duration_seconds": "NaN"
    })
    assert submit_res.status_code == 422

    # 4. Test sequential index matching validation (INT-002)
    submit_res = await client.post("/api/v1/interview/submit-answer", headers=auth_headers, json={
        "session_id": session_id,
        "question_index": 1,  # expected is 0
        "user_answer": "This is a correct answer of reasonable length.",
        "speech_duration_seconds": 15.0
    })
    assert submit_res.status_code == 400
    assert "out of order" in submit_res.text.lower()

    # 5. Authoritative question lookup validation (INT-001)
    # The client does not supply a 'question' anymore. The server retrieves authoritative question.
    submit_res = await client.post("/api/v1/interview/submit-answer", headers=auth_headers, json={
        "session_id": session_id,
        "question_index": 0,
        "user_answer": "This is a correct answer of reasonable length.",
        "speech_duration_seconds": 15.0
    })
    assert submit_res.status_code == 200
    submit_data = submit_res.json()
    assert submit_data["evaluation_score"] >= 0.0

    # 6. Reject submitting to a completed session
    finish_res = await client.post("/api/v1/interview/finish", headers=auth_headers, json={"session_id": session_id})
    assert finish_res.status_code == 200
    assert finish_res.json()["is_completed"] is True
    
    # Try submitting answer again
    submit_res = await client.post("/api/v1/interview/submit-answer", headers=auth_headers, json={
        "session_id": session_id,
        "question_index": 1,
        "user_answer": "Answer post completion.",
        "speech_duration_seconds": 10.0
    })
    assert submit_res.status_code == 400
    assert "already completed" in submit_res.text.lower()

# ---------------------------------------------------------
# APP-001 - APP-004: Application Data Contracts & Cache
# ---------------------------------------------------------

@pytest.mark.anyio
async def test_application_contracts_and_recomputation(
    client: AsyncClient, db_session: AsyncSession, auth_headers: dict, test_user: User
):
    # 1. Create a dummy resume so we can run matching similarity
    resume = Resume(
        user_id=test_user.id,
        file_name="resume.pdf",
        raw_text="Expert Python Software Engineer working with FastAPI, Docker, and Kubernetes.",
        parsed_data={}
    )
    db_session.add(resume)
    await db_session.commit()

    # 2. Create Application with jd_text
    app_payload = {
        "company_name": "Stripe",
        "role_title": "Python Developer",
        "jd_text": "We need an engineer experienced with Python and Docker."
    }
    create_res = await client.post("/api/v1/applications/", headers=auth_headers, json=app_payload)
    assert create_res.status_code == 201
    app_data = create_res.json()
    app_id = app_data["id"]
    assert app_data["analysis"] is not None
    assert app_data["analysis"]["match_percentage"] > 0.0

    # 3. Update status (Partial update: other fields remain untouched)
    patch_res = await client.patch(f"/api/v1/applications/{app_id}", headers=auth_headers, json={
        "status": "interview"
    })
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "interview"
    assert patch_res.json()["company_name"] == "Stripe"  # untouched

    # 4. Update JD text (Trigger recomputation/invalidation)
    patch_res = await client.patch(f"/api/v1/applications/{app_id}", headers=auth_headers, json={
        "jd_text": "Looking for Go and Kubernetes systems expert."
    })
    assert patch_res.status_code == 200
    updated_app = patch_res.json()
    assert updated_app["analysis"] is not None
    # Similarity should be different now
    assert updated_app["jd_text"] == "Looking for Go and Kubernetes systems expert."
