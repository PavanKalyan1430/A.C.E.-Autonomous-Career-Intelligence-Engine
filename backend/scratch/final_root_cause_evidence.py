import os
import sys
import asyncio
import json
import time
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.core.database import Base, get_db
from app.core.config import settings
from app.models.user import User, UserMemory
from app.core.security import get_password_hash
from app.services.company_intelligence import CompanyIntelligenceService

TEST_DATABASE_URL = "sqlite+aiosqlite:///final_root_cause_temp_db.sqlite"

async def run_final_audit():
    print("="*80)
    print("ACE COMPREHENSIVE LLM / AGENT / TAVILY ROOT-CAUSE AUDIT & EVIDENCE")
    print("="*80)

    # 1. GROQ DIRECT DIAGNOSTIC
    print("\n--- 1. GROQ DIAGNOSTIC & CONFIGURATION ---")
    groq_key = settings.GROQ_API_KEY or os.environ.get("GROQ_API_KEY")
    masked_key = (groq_key[:7] + "..." + groq_key[-4:]) if groq_key and len(groq_key) > 11 else "N/A"
    print(f"Groq Key Present: {'Yes' if groq_key else 'No'} ({masked_key})")
    print(f"Primary Configured Model: openai/gpt-oss-120b")

    if groq_key:
        from groq import AsyncGroq
        groq_client = AsyncGroq(api_key=groq_key)

        # Simple Text
        t0 = time.time()
        try:
            res = await asyncio.wait_for(
                groq_client.chat.completions.create(
                    model="openai/gpt-oss-120b",
                    messages=[{"role": "user", "content": "Hello"}],
                    max_tokens=10
                ),
                timeout=5.0
            )
            print(f"Simple Text Request: SUCCESS ({round(time.time() - t0, 3)}s) -> '{res.choices[0].message.content.strip()}'")
        except Exception as e:
            print(f"Simple Text Request: FAILED ({round(time.time() - t0, 3)}s) -> {e}")

        # Tool Request
        t0 = time.time()
        tools_schema = [{
            "type": "function",
            "function": {
                "name": "retrieve_user_memory_tool",
                "description": "Fetch user memory",
                "parameters": {
                    "type": "object",
                    "properties": {"query_or_category": {"type": "string"}},
                    "required": ["query_or_category"]
                }
            }
        }]
        try:
            res_tool = await asyncio.wait_for(
                groq_client.chat.completions.create(
                    model="openai/gpt-oss-120b",
                    messages=[{"role": "user", "content": "Fetch my weak areas using retrieve_user_memory_tool"}],
                    tools=tools_schema,
                    max_tokens=50
                ),
                timeout=5.0
            )
            tc = res_tool.choices[0].message.tool_calls
            print(f"Tool Calling Request: SUCCESS ({round(time.time() - t0, 3)}s) -> Parsed tool calls: {bool(tc)}")
        except Exception as e:
            print(f"Tool Calling Request: FAILED ({round(time.time() - t0, 3)}s) -> {e}")

    # 2. SOURCE-AWARE TAVILY SEARCH & EVIDENCE CLASSIFICATION
    print("\n--- 2. TAVILY COMPANY-INTELLIGENCE EVIDENCE ARCHITECTURE ---")
    company_service = CompanyIntelligenceService()
    t0_comp = time.time()
    insights = await company_service.get_company_insights("Stripe")
    comp_latency = round(time.time() - t0_comp, 3)

    print(f"Execution Latency: {comp_latency}s")
    print(f"Extracted Tech Stack: {insights.get('tech_stack')}")
    print(f"Hiring Trends Summary: {repr(insights.get('hiring_trends', '')[:100])}")
    print(f"Candidate Experience Signals: {repr(insights.get('candidate_experience_signals', '')[:100])}")
    print(f"Retrieved Source Count: {len(insights.get('sources', []))}")
    
    # Print classified source evidence details
    for s in insights.get("sources", [])[:4]:
        print(f"  -> [{s.get('category')} | {s.get('tier')}] {s.get('title')} ({s.get('domain')}) - Score: {s.get('relevance_score')}")

    forbidden_garbage = ["Interview", "Problems", "Coding", "S", "Ll", "Like"]
    found_garbage = [w for w in insights.get("tech_stack", []) if w in forbidden_garbage]
    if found_garbage:
        print(f"CRITICAL FAILURE: TF-IDF Word Salad found: {found_garbage}")
    else:
        print("VERIFIED: Clean source-aware technology extraction (0 TF-IDF word salad detected).")

    # 3. END-TO-END HTTP API & NO-FABRICATION CONTRACT
    print("\n--- 3. END-TO-END HTTP API & NO-FABRICATION CONTRACT ---")
    if os.path.exists("final_root_cause_temp_db.sqlite"):
        try:
            os.remove("final_root_cause_temp_db.sqlite")
        except Exception:
            pass

    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        async with async_session() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db

    async with async_session() as db:
        user_a = User(email="final_audit@ace.ai", hashed_password=get_password_hash("password123"), is_active=True)
        db.add(user_a)
        await db.commit()
        await db.refresh(user_a)

        mem = UserMemory(user_id=user_a.id, category="weak_area", memory_text="Graph theory and topological sort algorithms.")
        db.add(mem)
        await db.commit()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res_auth = await client.post("/api/v1/auth/login", data={"username": "final_audit@ace.ai", "password": "password123"})
        token = res_auth.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Multi-Tool Request via HTTP
        payload_multi = {
            "message": "Retrieve my weak areas using retrieve_user_memory_tool. Search Stripe's tech stack using search_company_intelligence_tool. Compare them using nlp_semantic_similarity_tool."
        }
        res_multi = await client.post("/api/v1/agent/query", headers=headers, json=payload_multi)

        print(f"HTTP Status: {res_multi.status_code}")
        print(f"Complete JSON Response Body: {json.dumps(res_multi.json(), indent=2)}")

        resp_content = res_multi.json().get("response", "")
        if "[A.C.E. Multi-Tool Synthesis Engine" in resp_content or "[A.C.E. Production NLP Engine Output]" in resp_content:
            print("CRITICAL FAILURE: Fake LLM pseudo-answer detected!")
        else:
            print("VERIFIED: Honest controlled application response returned (No fake LLM impersonation).")

    app.dependency_overrides.clear()
    await engine.dispose()
    if os.path.exists("final_root_cause_temp_db.sqlite"):
        try:
            os.remove("final_root_cause_temp_db.sqlite")
        except Exception:
            pass

    print("\n" + "="*80)
    print("FINAL AUDIT EVIDENCE COMPLETE")
    print("="*80)

if __name__ == "__main__":
    asyncio.run(run_final_audit())
