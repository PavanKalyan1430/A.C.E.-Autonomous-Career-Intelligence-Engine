import os
import sys
import asyncio
import json
import time
from typing import AsyncGenerator, Dict, Any, List
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.core.database import get_db, SessionLocal, engine
from app.core.config import settings
from app.models.user import User, UserMemory, ChatSession, ChatMessage
from app.core.security import get_password_hash
from app.services.company_intelligence import CompanyIntelligenceService

async def run_amplification_and_provider_audit():
    print("="*80)
    print("ACE COMPREHENSIVE PROVIDER & TOKEN AMPLIFICATION AUDIT (REAL POSTGRES DB)")
    print("="*80)
    print(f"Active Database Engine: REAL PostgreSQL ({settings.DATABASE_URL.split('@')[-1]})")

    # 1. 5-TIER SOURCE CLASSIFIER & TAVILY EVIDENCE AUDIT (STRIPE & GOOGLE)
    print("\n--- 1. 5-TIER TAVILY SOURCE CLASSIFICATION AUDIT ---")
    comp_service = CompanyIntelligenceService()

    for target_comp in ["Stripe", "Google"]:
        print(f"\n[Target Company: {target_comp}]")
        t0 = time.time()
        insights = await comp_service.get_company_insights(target_comp)
        latency = round(time.time() - t0, 3)

        print(f"Latency: {latency}s")
        print(f"Verified Tech Stack: {insights.get('tech_stack')}")
        print(f"Hiring Trends: {repr(insights.get('hiring_trends', '')[:90])}")
        print(f"Candidate Experience Signals: {repr(insights.get('candidate_experience_signals', '')[:90])}")
        
        sources = insights.get("sources", [])
        print(f"Total Sources Retrieved: {len(sources)}")
        for s in sources[:6]:
            print(f"  -> [{s.get('tier')}] Category: {s.get('category')} | Domain: {s.get('domain')} | Title: {s.get('title')[:60]}")

        # Verification of Classification Integrity
        pragmatic_sources = [s for s in sources if "pragmaticengineer.com" in s.get("domain", "") or "back4app.com" in s.get("domain", "")]
        for ps in pragmatic_sources:
            if "Tier 1" in ps.get("tier", ""):
                print(f"CRITICAL FAILURE: {ps.get('domain')} misclassified as Tier 1 Official!")
            else:
                print(f"VERIFIED: {ps.get('domain')} correctly classified as {ps.get('tier')}")

    # 2. GROQ MULTI-TOOL LLM TOKEN & REQUEST AMPLIFICATION TRACE
    print("\n--- 2. GROQ MULTI-TOOL TOKEN & REQUEST AMPLIFICATION TRACE ---")
    groq_key = settings.GROQ_API_KEY or os.environ.get("GROQ_API_KEY")
    if groq_key:
        from groq import AsyncGroq
        groq_client = AsyncGroq(api_key=groq_key)

        print("Executing Multi-Tool LLM Request Trace on Groq (openai/gpt-oss-120b)...")
        tools = [
            {
                "type": "function",
                "function": {
                    "name": "retrieve_user_memory_tool",
                    "description": "Retrieve user memories",
                    "parameters": {"type": "object", "properties": {"query": {"type": "string"}}, "required": ["query"]}
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "search_company_intelligence_tool",
                    "description": "Fetch company insights",
                    "parameters": {"type": "object", "properties": {"company_name": {"type": "string"}}, "required": ["company_name"]}
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "nlp_semantic_similarity_tool",
                    "description": "Compute semantic similarity",
                    "parameters": {"type": "object", "properties": {"text1": {"type": "string"}, "text2": {"type": "string"}}, "required": ["text1", "text2"]}
                }
            }
        ]

        messages = [
            {"role": "user", "content": "Retrieve my weak areas using retrieve_user_memory_tool. Search Stripe's tech stack using search_company_intelligence_tool. Compare them using nlp_semantic_similarity_tool."}
        ]

        t0_trace = time.time()
        try:
            res1 = await asyncio.wait_for(
                groq_client.chat.completions.create(
                    model="openai/gpt-oss-120b",
                    messages=messages,
                    tools=tools,
                    max_tokens=150
                ),
                timeout=10.0
            )
            lat1 = round(time.time() - t0_trace, 3)
            usage1 = res1.usage
            in_tok = getattr(usage1, "prompt_tokens", 0) if usage1 else 0
            out_tok = getattr(usage1, "completion_tokens", 0) if usage1 else 0
            tot_tok = getattr(usage1, "total_tokens", 0) if usage1 else 0

            print(f"LLM Call #1 (Reasoning): Status=200 OK | Latency={lat1}s | Input Tokens={in_tok} | Output Tokens={out_tok} | Cumulative Tokens={tot_tok}")
            if res1.choices[0].message.tool_calls:
                tc = res1.choices[0].message.tool_calls[0]
                print(f"  -> Generated Tool Call: {tc.function.name} (Args: {tc.function.arguments})")
        except Exception as e:
            print(f"LLM Call #1 FAILED: {type(e).__name__} - {e}")

    # 3. REAL POSTGRESQL HTTP API & DATABASE TRANSACTION TEST
    print("\n--- 3. REAL POSTGRESQL HTTP API & TRANSACTION AUDIT ---")
    async with SessionLocal() as db:
        # Fetch or create user in PostgreSQL
        res_u = await db.execute(select(User).filter(User.email == "pg_audit@ace.ai"))
        u = res_u.scalars().first()
        if not u:
            u = User(email="pg_audit@ace.ai", hashed_password=get_password_hash("password123"), is_active=True)
            db.add(u)
            await db.commit()
            await db.refresh(u)

        res_mem = await db.execute(select(UserMemory).filter(UserMemory.user_id == u.id, UserMemory.category == "weak_area"))
        mem = res_mem.scalars().first()
        if not mem:
            mem = UserMemory(user_id=u.id, category="weak_area", memory_text="Graph theory and topological sort algorithms.")
            db.add(mem)
            await db.commit()

        print(f"PostgreSQL Test User ID: {u.id} | UserMemory ID: {mem.id}")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res_auth = await client.post("/api/v1/auth/login", data={"username": "pg_audit@ace.ai", "password": "password123"})
        token = res_auth.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Query HTTP Route against Real PostgreSQL DB
        res = await client.post("/api/v1/agent/query", headers=headers, json={"message": "Compare my weak areas with Stripe stack"})
        print(f"HTTP Status (Real PostgreSQL Route): {res.status_code}")
        print(f"HTTP Body: {json.dumps(res.json(), indent=2)}")

    print("\n" + "="*80)
    print("REAL POSTGRES AUDIT & EVIDENCE COMPLETE")
    print("="*80)

if __name__ == "__main__":
    asyncio.run(run_amplification_and_provider_audit())
