import pytest
import asyncio
import json
import os
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select
from unittest.mock import patch, AsyncMock, MagicMock

from app.main import app
from app.core.database import Base, get_db
from app.core.config import settings
from app.models.user import User, Resume, UserMemory, ChatSession, ChatMessage, Company
from app.core.security import get_password_hash

TEST_DATABASE_URL = "sqlite+aiosqlite:///test_orchestration_temp_db.sqlite"

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
        email="agent_audit@ace.ai",
        hashed_password=get_password_hash("securepassword123"),
        is_active=True,
        is_superuser=False
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    
    # Pre-seed candidate resume data
    resume = Resume(
        user_id=user.id,
        file_name="resume.pdf",
        raw_text="Jane Doe. Backend Engineer. Skills: Python, Go, FastAPI, PostgreSQL, Distributed Systems.",
        parsed_data={"skills": ["Python", "Go", "FastAPI", "PostgreSQL", "Distributed Systems"]}
    )
    db_session.add(resume)
    
    # Pre-seed user memories
    memory_goal = UserMemory(
        user_id=user.id,
        category="goal",
        memory_text="Wants to work on high-availability cloud-native microservices at Stripe."
    )
    memory_weak = UserMemory(
        user_id=user.id,
        category="weak_area",
        memory_text="Needs to focus on NetworkX topological sort algorithms and database transaction isolation levels."
    )
    db_session.add(memory_goal)
    db_session.add(memory_weak)
    
    await db_session.commit()
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

# --- 1. MULTI-TOOL ORCHESTRATION ---
@pytest.mark.anyio
async def test_multi_tool_orchestration(client: AsyncClient, auth_headers: dict):
    # Verify that requesting career goal memory and computing topological skill gap chooses both tools
    query = "Check my career goal from my memory and compare it with Go, Kubernetes, and Terraform to find the skill gaps."
    res = await client.post("/api/v1/agent/query", headers=auth_headers, json={"message": query})
    assert res.status_code == 200
    res_data = res.json()
    assert "response" in res_data
    assert len(res_data["response"]) > 0

# --- 2. CROSS-FEATURE CONTEXT ---
@pytest.mark.anyio
async def test_cross_feature_context_aggregation(client: AsyncClient, auth_headers: dict):
    # Verify the agent uses combined context (resume skills + memories + jobs/companies)
    query = "Based on my resume skills (Python, Go, Distributed Systems), my weak areas in memory, and Stripe's microservices stack, what should I study?"
    res = await client.post("/api/v1/agent/query", headers=auth_headers, json={"message": query})
    assert res.status_code == 200
    assert len(res.json()["response"]) > 0

# --- 3. SESSION CONTINUITY ---
@pytest.mark.anyio
async def test_session_continuity_flow(client: AsyncClient, auth_headers: dict):
    # Request 1 -> Establish Context
    res1 = await client.post("/api/v1/agent/query", headers=auth_headers, json={
        "message": "I am preparing for a backend role at Stripe."
    })
    assert res1.status_code == 200
    session_id = res1.json()["session_id"]
    
    # Request 2 -> Refer to previous context
    res2 = await client.post("/api/v1/agent/query", headers=auth_headers, json={
        "message": "What is their stack?",
        "session_id": session_id
    })
    assert res2.status_code == 200
    assert len(res2.json()["response"]) > 0
    
    # Request 3 -> Extend context
    res3 = await client.post("/api/v1/agent/query", headers=auth_headers, json={
        "message": "Compare it to my resume skills.",
        "session_id": session_id
    })
    assert res3.status_code == 200

# --- 4. MID-CHAIN FAILURE RECOVERY ---
@pytest.mark.anyio
async def test_mid_chain_failure_recovery(client: AsyncClient, auth_headers: dict):
    # Mock one of the tools to fail (e.g. search_company_intelligence_tool raises Exception)
    mock_fail = AsyncMock(side_effect=Exception("Company API Timeout"))
    with patch("app.tools.company_tools.company_service.get_company_insights", mock_fail):
        query = "Search Google's stack and give me career advice."
        res = await client.post("/api/v1/agent/query", headers=auth_headers, json={"message": query})
        # The agent should fall back/recover gracefully and return a controlled response
        assert res.status_code == 200
        assert "response" in res.json()

# --- 5. LOOP / EXECUTION LIMITS ---
@pytest.mark.anyio
async def test_loop_execution_limits(client: AsyncClient, auth_headers: dict):
    # Mock LLM to return an infinite sequence of tool calls or we check that recursion limit prevents infinite loop
    mock_llm = MagicMock()
    with patch("app.core.llm_router.RoutedChatModel._agenerate", side_effect=asyncio.TimeoutError("LLM response timeout")):
        query = "Tell me about my resume skills and compare them to Stripe."
        res = await client.post("/api/v1/agent/query", headers=auth_headers, json={"message": query})
        assert res.status_code == 200
        res_json = json.loads(res.json()["response"])
        assert res_json["status"] == "execution_limit_exceeded"
        assert "timeout" in res_json["error"]

# --- 6. TARGETED LIMIT & BOUNDARY TESTS ---
@pytest.mark.anyio
async def test_tool_call_limit_boundary(client: AsyncClient, auth_headers: dict):
    from langchain_core.messages import AIMessage
    from langchain_core.outputs import ChatResult, ChatGeneration
    
    original_tool_limit = settings.AGENT_MAX_TOOL_CALLS
    settings.AGENT_MAX_TOOL_CALLS = 2
    
    calls = 0
    async def mock_agenerate(self, messages, stop=None, run_manager=None, **kwargs):
        nonlocal calls
        calls += 1
        tool_call = {
            "name": "retrieve_user_memory_tool",
            "args": {"query_or_category": "test"},
            "id": f"call_{calls}"
        }
        return ChatResult(generations=[ChatGeneration(message=AIMessage(content="", tool_calls=[tool_call]))])

    with patch("app.core.llm_router.RoutedChatModel._agenerate", mock_agenerate):
        res = await client.post("/api/v1/agent/query", headers=auth_headers, json={"message": "Query to trigger loop"})
        assert res.status_code == 200
        res_json = json.loads(res.json()["response"])
        assert res_json["status"] == "execution_limit_exceeded"
        assert res_json["error"] == "Agent tool call limit exceeded"

    settings.AGENT_MAX_TOOL_CALLS = original_tool_limit

@pytest.mark.anyio
async def test_recursion_limit_boundary(client: AsyncClient, auth_headers: dict):
    from langchain_core.messages import AIMessage
    from langchain_core.outputs import ChatResult, ChatGeneration
    
    original_iterations = settings.AGENT_MAX_ITERATIONS
    original_tool_limit = settings.AGENT_MAX_TOOL_CALLS
    
    settings.AGENT_MAX_ITERATIONS = 4
    settings.AGENT_MAX_TOOL_CALLS = 10
    
    calls = 0
    async def mock_agenerate(self, messages, stop=None, run_manager=None, **kwargs):
        nonlocal calls
        calls += 1
        tool_call = {
            "name": "retrieve_user_memory_tool",
            "args": {"query_or_category": "test"},
            "id": f"call_{calls}"
        }
        return ChatResult(generations=[ChatGeneration(message=AIMessage(content="", tool_calls=[tool_call]))])

    with patch("app.core.llm_router.RoutedChatModel._agenerate", mock_agenerate):
        res = await client.post("/api/v1/agent/query", headers=auth_headers, json={"message": "Query to trigger recursion limit"})
        assert res.status_code == 200
        res_json = json.loads(res.json()["response"])
        assert res_json["status"] == "execution_limit_exceeded"
        assert res_json["error"] == "Agent iteration limit exceeded"

    settings.AGENT_MAX_ITERATIONS = original_iterations
    settings.AGENT_MAX_TOOL_CALLS = original_tool_limit

@pytest.mark.anyio
async def test_overall_execution_timeout(client: AsyncClient, auth_headers: dict):
    original_timeout = settings.AGENT_EXECUTION_TIMEOUT
    settings.AGENT_EXECUTION_TIMEOUT = 0.1
    
    async def mock_ainvoke(*args, **kwargs):
        await asyncio.sleep(0.5)
        return {"messages": []}

    with patch("app.agents.orchestrator.agent_executor.ainvoke", mock_ainvoke):
        res = await client.post("/api/v1/agent/query", headers=auth_headers, json={"message": "Query that hangs"})
        assert res.status_code == 200
        res_json = json.loads(res.json()["response"])
        assert res_json["status"] == "execution_limit_exceeded"
        assert res_json["error"] == "Agent execution timeout exceeded"

    settings.AGENT_EXECUTION_TIMEOUT = original_timeout
