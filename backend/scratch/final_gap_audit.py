import os
import sys
import asyncio
import json
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select
from unittest.mock import patch, AsyncMock, MagicMock
from langchain_core.messages import AIMessage, ToolMessage

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.core.database import Base, get_db
from app.core.config import settings
from app.models.user import User, Resume, UserMemory, ChatSession, ChatMessage
from app.core.security import get_password_hash

DATABASE_URL = settings.DATABASE_URL
engine = create_async_engine(DATABASE_URL, echo=False)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def setup_db_data(db: AsyncSession) -> int:
    # Clear previous audit users
    res = await db.execute(select(User).filter(User.email == "gap_audit@ace.ai"))
    existing = res.scalars().first()
    if existing:
        await db.delete(existing)
        await db.commit()

    user = User(
        email="gap_audit@ace.ai",
        hashed_password=get_password_hash("password123"),
        is_active=True
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Add memories for retrieval
    m1 = UserMemory(
        user_id=user.id,
        category="weak_area",
        memory_text="Advanced graph theory, topological sort, and Distributed consensus algorithms like Raft."
    )
    db.add(m1)
    await db.commit()
    return user.id

async def run_gaps_audit():
    async with async_session() as db:
        user_id = await setup_db_data(db)

    async def override_get_db():
        async with async_session() as session:
            yield session
    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Login
        login_res = await client.post("/api/v1/auth/login", data={"username": "gap_audit@ace.ai", "password": "password123"})
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        print("==================================================")
        print("TEST 1: REAL MULTI-TOOL CHAIN (NO USER BLOCKS)")
        print("==================================================")
        
        # We query the agent asking it to explicitly call:
        # 1. retrieve_user_memory_tool
        # 2. search_company_intelligence_tool
        # 3. nlp_semantic_similarity_tool
        # Using a query containing all facts so it has all data.
        query_payload = {
            "message": (
                "Retrieve my weak areas using the retrieve_user_memory_tool. "
                "Next, search Stripe's engineering tech stack using search_company_intelligence_tool. "
                "Finally, compare my weak areas text directly against Stripe's tech stack description "
                "using the nlp_semantic_similarity_tool. Output the similarity results."
            )
        }
        
        print("Payload:", query_payload)
        res1 = await client.post("/api/v1/agent/query", headers=headers, json=query_payload)
        print("HTTP STATUS:", res1.status_code)
        print("RESPONSE:\n", json.dumps(res1.json(), indent=2))

        print("\n==================================================")
        print("TEST 2: REAL AGENT LOOP / ITERATION PROTECTION")
        print("==================================================")

        # To test loop protection, we patch RoutedChatModel to always generate a tool call to retrieve_user_memory_tool,
        # creating an infinite loop. We verify that the execution terminates at the recursion limit of LangGraph (25).
        # We trace the number of calls.
        loop_calls = 0
        
        # We capture the trace of LangGraph steps to verify loop termination.
        # Instead of mocking the entire model which might be complex, let's mock RoutedChatModel._agenerate to return a tool call every time.
        # Let's count how many times it gets called before raising GraphRecursionError.
        from app.core.llm_router import RoutedChatModel
        
        original_agenerate_method = RoutedChatModel._agenerate
        
        async def mock_agenerate(self, messages, stop=None, run_manager=None, **kwargs):
            nonlocal loop_calls
            loop_calls += 1
            print(f"  [LLM CALL {loop_calls}] LLM was invoked with messages length: {len(messages)}")
            
            # Return a tool call to retrieve_user_memory_tool on every step to trigger recursion
            tool_call = {
                "name": "retrieve_user_memory_tool",
                "args": {"query_or_category": "loop_test"},
                "id": f"call_{loop_calls}"
            }
            ai_msg = AIMessage(content="", tool_calls=[tool_call])
            from langchain_core.outputs import ChatResult, ChatGeneration
            return ChatResult(generations=[ChatGeneration(message=ai_msg)])

        with patch.object(RoutedChatModel, "_agenerate", mock_agenerate):
            try:
                print("Sending request to trigger loop protection...")
                loop_payload = {"message": "Find my target salary."}
                res2 = await client.post("/api/v1/agent/query", headers=headers, json=loop_payload)
                print("Loop query HTTP Status:", res2.status_code)
                print("Loop query Response:", json.dumps(res2.json(), indent=2))
            except Exception as e:
                print("Execution caught exception:", type(e), e)

            print(f"Total LLM loop iterations executed: {loop_calls}")

    # Cleanup
    async with async_session() as db:
        res = await db.execute(select(User).filter(User.id == user_id))
        user = res.scalars().first()
        if user:
            await db.delete(user)
            await db.commit()

if __name__ == "__main__":
    asyncio.run(run_gaps_audit())
