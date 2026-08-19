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
from unittest.mock import patch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.core.database import Base, get_db
from app.core.config import settings
from app.models.user import User, UserMemory, ChatSession, ChatMessage
from app.core.security import get_password_hash
from app.core.llm_router import get_active_provider
from app.services.company_intelligence import CompanyIntelligenceService

TEST_DATABASE_URL = "sqlite+aiosqlite:///root_cause_audit_temp_db.sqlite"

async def run_comprehensive_audit():
    print("="*80)
    print("ACE COMPREHENSIVE LLM / AGENT / FALLBACK ROOT-CAUSE AUDIT")
    print("="*80)

    # 1. GROQ CONFIGURATION & DIRECT DIAGNOSTIC
    print("\n--- 1. GROQ CONFIGURATION & DIRECT DIAGNOSTIC ---")
    groq_key = settings.GROQ_API_KEY or os.environ.get("GROQ_API_KEY")
    key_present = "Yes" if groq_key else "No"
    masked_key = (groq_key[:7] + "..." + groq_key[-4:]) if groq_key and len(groq_key) > 11 else "N/A"
    print(f"Groq API Key Present: {key_present} ({masked_key})")
    print(f"Configured Primary Model: openai/gpt-oss-120b")

    groq_text_status = "N/A"
    groq_text_latency = 0.0
    groq_tool_status = "N/A"
    groq_tool_latency = 0.0

    if groq_key:
        from groq import AsyncGroq
        client = AsyncGroq(api_key=groq_key)
        
        # Test A: Simple Text Request
        t0 = time.time()
        try:
            res_text = await asyncio.wait_for(
                client.chat.completions.create(
                    model="openai/gpt-oss-120b",
                    messages=[{"role": "user", "content": "Hello ACE Diagnostic"}],
                    max_tokens=20
                ),
                timeout=10.0
            )
            groq_text_latency = round(time.time() - t0, 3)
            groq_text_status = "200 OK"
            print(f"Groq Simple Text Call: SUCCESS ({groq_text_latency}s) -> Output: {repr(res_text.choices[0].message.content)}")
        except Exception as e:
            groq_text_latency = round(time.time() - t0, 3)
            groq_text_status = f"FAILED: {type(e).__name__} - {e}"
            print(f"Groq Simple Text Call: {groq_text_status} ({groq_text_latency}s)")

        # Test B: Simple Tool Calling Request
        t0 = time.time()
        tools_schema = [{
            "type": "function",
            "function": {
                "name": "test_tool",
                "description": "Test tool description",
                "parameters": {
                    "type": "object",
                    "properties": {"arg": {"type": "string"}},
                    "required": ["arg"]
                }
            }
        }]
        try:
            res_tool = await asyncio.wait_for(
                client.chat.completions.create(
                    model="openai/gpt-oss-120b",
                    messages=[{"role": "user", "content": "Call test_tool with arg='ping'"}],
                    tools=tools_schema,
                    max_tokens=50
                ),
                timeout=10.0
            )
            groq_tool_latency = round(time.time() - t0, 3)
            groq_tool_status = "200 OK"
            has_tool_call = bool(res_tool.choices[0].message.tool_calls)
            print(f"Groq Tool Calling Call: SUCCESS ({groq_tool_latency}s) -> Tool Calls Returned: {has_tool_call}")
        except Exception as e:
            groq_tool_latency = round(time.time() - t0, 3)
            groq_tool_status = f"FAILED: {type(e).__name__} - {e}"
            print(f"Groq Tool Calling Call: {groq_tool_status} ({groq_tool_latency}s)")

    # 2. COMPANY INTELLIGENCE DIAGNOSTIC (VERIFY NO TF-IDF WORD SALAD)
    print("\n--- 2. COMPANY INTELLIGENCE DIAGNOSTIC ---")
    company_service = CompanyIntelligenceService()
    t0_comp = time.time()
    comp_insights = await company_service.get_company_insights("Stripe")
    comp_latency = round(time.time() - t0_comp, 3)
    
    print(f"Company Intelligence Execution Time: {comp_latency}s")
    print(f"Extracted Tech Stack: {comp_insights.get('tech_stack')}")
    print(f"Status Code / Format: {comp_insights.get('status', 'success')}")
    
    # Check for TF-IDF word salad
    forbidden_garbage = ["Interview", "Problems", "Coding", "S", "Ll", "Like"]
    found_garbage = [w for w in comp_insights.get("tech_stack", []) if w in forbidden_garbage]
    if found_garbage:
        print(f"CRITICAL FAILURE: Found TF-IDF word salad in tech_stack: {found_garbage}")
    else:
        print("VERIFIED: Clean technology extraction (Zero TF-IDF word salad detected).")

    # 3. END-TO-END HTTP ROUTE & CONTROLLED ERROR CONTRACT AUDIT
    print("\n--- 3. REAL HTTP API & CONTROLLED ERROR CONTRACT AUDIT ---")
    if os.path.exists("root_cause_audit_temp_db.sqlite"):
        try:
            os.remove("root_cause_audit_temp_db.sqlite")
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
        user_a = User(email="root_audit@ace.ai", hashed_password=get_password_hash("password123"), is_active=True)
        db.add(user_a)
        await db.commit()
        await db.refresh(user_a)

        mem = UserMemory(user_id=user_a.id, category="weak_area", memory_text="Graph theory and topological sort algorithms.")
        db.add(mem)
        await db.commit()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res_auth = await client.post("/api/v1/auth/login", data={"username": "root_audit@ace.ai", "password": "password123"})
        token = res_auth.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Multi-Tool Request
        payload_multi = {
            "message": "Retrieve my weak areas using retrieve_user_memory_tool. Search Stripe's tech stack using search_company_intelligence_tool. Compare them using nlp_semantic_similarity_tool."
        }
        res_multi = await client.post("/api/v1/agent/query", headers=headers, json=payload_multi)
        
        print("\nMulti-Tool Route Response:")
        print(f"-> HTTP Status: {res_multi.status_code}")
        print(f"-> Response Body: {json.dumps(res_multi.json(), indent=2)}")
        
        # Verify no fake LLM answer when providers fail
        resp_str = res_multi.json().get("response", "")
        if "[A.C.E. Multi-Tool Synthesis Engine" in resp_str or "[A.C.E. Production NLP Engine Output]" in resp_str:
            print("CRITICAL FAILURE: Fake LLM pseudo-answer returned!")
        elif "provider_rate_limited" in resp_str or "llm_unavailable" in resp_str or "status" in resp_str:
            print("VERIFIED: Honest controlled error response returned when providers are rate limited / unavailable.")

    app.dependency_overrides.clear()
    await engine.dispose()
    if os.path.exists("root_cause_audit_temp_db.sqlite"):
        try:
            os.remove("root_cause_audit_temp_db.sqlite")
        except Exception:
            pass

    print("\n" + "="*80)
    print("COMPREHENSIVE AUDIT COMPLETE")
    print("="*80)

if __name__ == "__main__":
    asyncio.run(run_comprehensive_audit())
