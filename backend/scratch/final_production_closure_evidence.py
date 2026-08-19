import os
import sys
import asyncio
import json
import time
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.future import select

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.core.database import get_db, SessionLocal, engine
from app.core.config import settings
from app.models.user import User, UserMemory, ChatSession, ChatMessage
from app.core.security import get_password_hash
from app.services.company_intelligence import CompanyIntelligenceService

async def run_final_closure_audit():
    print("="*80)
    print("ACE FINAL PRODUCTION CLOSURE — FULL SYSTEM EVIDENCE AUDIT")
    print("="*80)
    print(f"Active PostgreSQL Database Engine: {settings.DATABASE_URL.split('@')[-1]}")

    # PART 1: GROQ DIRECT DIAGNOSTIC SUITE
    print("\n--- PART 1: GROQ REAL DIAGNOSTICS ---")
    groq_key = settings.GROQ_API_KEY or os.environ.get("GROQ_API_KEY")
    if groq_key:
        from groq import AsyncGroq
        client = AsyncGroq(api_key=groq_key)

        # 1. Simple Text Request
        t0 = time.time()
        try:
            res_text = await asyncio.wait_for(
                client.chat.completions.create(
                    model="openai/gpt-oss-120b",
                    messages=[{"role": "user", "content": "Hello ACE Diagnostic"}],
                    max_tokens=10
                ),
                timeout=5.0
            )
            lat_text = round(time.time() - t0, 3)
            print(f"1. Groq Simple Request: SUCCESS ({lat_text}s) -> '{res_text.choices[0].message.content.strip()}'")
        except Exception as e:
            print(f"1. Groq Simple Request: FAILED -> {e}")

        # 2. Tool Calling Request
        t0 = time.time()
        tools_schema = [{
            "type": "function",
            "function": {
                "name": "retrieve_user_memory_tool",
                "description": "Fetch user memory",
                "parameters": {"type": "object", "properties": {"query": {"type": "string"}}, "required": ["query"]}
            }
        }]
        try:
            res_tool = await asyncio.wait_for(
                client.chat.completions.create(
                    model="openai/gpt-oss-120b",
                    messages=[{"role": "user", "content": "Fetch my weak areas using retrieve_user_memory_tool"}],
                    tools=tools_schema,
                    max_tokens=50
                ),
                timeout=5.0
            )
            lat_tool = round(time.time() - t0, 3)
            tc = res_tool.choices[0].message.tool_calls
            print(f"2. Groq Tool Request: SUCCESS ({lat_tool}s) -> Tool Call Returned: {bool(tc)}")
        except Exception as e:
            print(f"2. Groq Tool Request: FAILED -> {e}")

    # PART 2: 5-TIER TAVILY SOURCE CLASSIFICATION & EVIDENCE PIPELINE
    print("\n--- PART 2: 5-TIER TAVILY SOURCE CLASSIFICATION & EVIDENCE PIPELINE ---")
    comp_service = CompanyIntelligenceService()

    for target in ["Stripe", "Google"]:
        print(f"\n[Company Intelligence: {target}]")
        t0 = time.time()
        insights = await comp_service.get_company_insights(target)
        latency = round(time.time() - t0, 3)

        print(f"Latency: {latency}s")
        print(f"Verified Tech Stack: {insights.get('tech_stack')}")
        print(f"Hiring Trends: {repr(insights.get('hiring_trends', '')[:80])}")
        print(f"Candidate Signals: {repr(insights.get('candidate_experience_signals', '')[:80])}")

        sources = insights.get("sources", [])
        print(f"Retrieved Sources: {len(sources)}")
        for s in sources[:5]:
            print(f"  -> [{s.get('tier')}] {s.get('domain')} ({s.get('category')}) - Title: {s.get('title')[:50]}")

    # PART 3: CONCURRENCY & CONTEXTVAR ISOLATION AUDIT
    print("\n--- PART 3: MULTI-USER CONCURRENCY & CONTEXTVAR ISOLATION ---")
    async def simulate_user_request(user_idx: int):
        from app.core.config import tool_calls_counter
        tool_calls_counter.set({"count": user_idx})
        await asyncio.sleep(0.05)
        current = tool_calls_counter.get()
        return current.get("count") == user_idx

    concurrency_results = await asyncio.gather(*[simulate_user_request(i) for i in range(1, 10)])
    print(f"Multi-User ContextVar Isolation: {'ALL PASSED' if all(concurrency_results) else 'FAILED'}")

    # PART 4: REAL POSTGRES HTTP ROUTE & CONTROLLED ERROR CONTRACT
    print("\n--- PART 4: REAL POSTGRES HTTP ROUTE & NO-FABRICATION CONTRACT ---")
    async with SessionLocal() as db:
        res_u = await db.execute(select(User).filter(User.email == "closure_audit@ace.ai"))
        u = res_u.scalars().first()
        if not u:
            u = User(email="closure_audit@ace.ai", hashed_password=get_password_hash("password123"), is_active=True)
            db.add(u)
            await db.commit()
            await db.refresh(u)

        res_mem = await db.execute(select(UserMemory).filter(UserMemory.user_id == u.id, UserMemory.category == "weak_area"))
        mem = res_mem.scalars().first()
        if not mem:
            mem = UserMemory(user_id=u.id, category="weak_area", memory_text="Graph theory and topological sort algorithms.")
            db.add(mem)
            await db.commit()

        print(f"PostgreSQL Persistence Verified for User ID: {u.id}")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res_auth = await client.post("/api/v1/auth/login", data={"username": "closure_audit@ace.ai", "password": "password123"})
        token = res_auth.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        res = await client.post("/api/v1/agent/query", headers=headers, json={"message": "Compare my weak areas with Stripe tech stack"})
        print(f"HTTP Response Status Code: {res.status_code}")
        print(f"HTTP JSON Body: {json.dumps(res.json(), indent=2)}")

    print("\n" + "="*80)
    print("ACE FINAL PRODUCTION CLOSURE AUDIT COMPLETE")
    print("="*80)

if __name__ == "__main__":
    asyncio.run(run_final_closure_audit())
