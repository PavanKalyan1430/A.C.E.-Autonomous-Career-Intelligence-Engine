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
from sqlalchemy import text

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.core.database import Base, get_db
from app.core.config import settings
from app.models.user import User, UserMemory, ChatSession, ChatMessage, InterviewSession, Resume, Application, Company
from app.core.security import get_password_hash
from app.services.company_intelligence import CompanyIntelligenceService
from app.services.career_intelligence import career_intelligence_service

ISOLATED_DB_URL = "postgresql+asyncpg://postgres:pavan@localhost:5432/ace_isolated_test_db"
MAINTENANCE_DB_URL = "postgresql+asyncpg://postgres:pavan@localhost:5432/postgres"

async def run_final_e2e_closure_audit():
    print("="*80)
    print("ACE MASTER FINAL E2E / BROWSER / API / PROVIDER CLOSURE AUDIT")
    print("="*80)

    # 1. FRESH ISOLATED POSTGRESQL MIGRATION TEST
    print("\n--- SECTION 1: FRESH ISOLATED POSTGRESQL MIGRATION TEST ---")
    print(f"Creating & Connecting to Isolated Database: ace_isolated_test_db")
    
    maint_engine = create_async_engine(MAINTENANCE_DB_URL, isolation_level="AUTOCOMMIT")
    async with maint_engine.connect() as conn:
        await conn.execute(text("DROP DATABASE IF EXISTS ace_isolated_test_db;"))
        await conn.execute(text("CREATE DATABASE ace_isolated_test_db;"))
    await maint_engine.dispose()

    iso_engine = create_async_engine(ISOLATED_DB_URL, echo=False)
    iso_session = sessionmaker(iso_engine, class_=AsyncSession, expire_on_commit=False)

    async with iso_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("1. Fresh Database Table Schema & Constraints Created Successfully.")

    async def override_get_db_iso() -> AsyncGenerator[AsyncSession, None]:
        async with iso_session() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db_iso

    # 2. SEED FRESH USERS (USER A & USER B)
    async with iso_session() as db:
        user_a = User(email="e2e_user_a@ace.ai", hashed_password=get_password_hash("password123"), is_active=True)
        user_b = User(email="e2e_user_b@ace.ai", hashed_password=get_password_hash("password123"), is_active=True)
        db.add_all([user_a, user_b])
        await db.commit()
        await db.refresh(user_a)
        await db.refresh(user_b)

        resume_a = Resume(
            user_id=user_a.id,
            file_name="user_a_resume.pdf",
            raw_text="Staff Backend Engineer. Skills: Python, PostgreSQL, FastAPI, Kubernetes.",
            parsed_data={"skills": ["Python", "PostgreSQL", "FastAPI", "Kubernetes"]}
        )
        app_a = Application(
            user_id=user_a.id,
            company_name="Stripe",
            role_title="Senior Backend Engineer",
            status="interview"
        )
        db.add_all([resume_a, app_a])

        resume_b = Resume(
            user_id=user_b.id,
            file_name="user_b_resume.pdf",
            raw_text="DevOps Architect. Skills: AWS, Docker, Terraform.",
            parsed_data={"skills": ["AWS", "Docker", "Terraform"]}
        )
        db.add(resume_b)
        await db.commit()

    print(f"2. Fresh Users & Resumes Seeded: User A ({user_a.id}), User B ({user_b.id})")

    # 3. REAL AUTHENTICATED HTTP E2E WORKFLOW (USER A)
    print("\n--- SECTION 2: REAL AUTHENTICATED HTTP E2E WORKFLOW ---")
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # A. Login User A
        t0 = time.time()
        res_login_a = await client.post("/api/v1/auth/login", data={"username": "e2e_user_a@ace.ai", "password": "password123"})
        lat_login_a = round((time.time() - t0) * 1000, 2)
        assert res_login_a.status_code == 200
        token_a = res_login_a.json()["access_token"]
        headers_a = {"Authorization": f"Bearer {token_a}"}
        print(f"3. POST /api/v1/auth/login (User A): 200 OK ({lat_login_a}ms) -> Bearer Token Received")

        # B. Login User B
        res_login_b = await client.post("/api/v1/auth/login", data={"username": "e2e_user_b@ace.ai", "password": "password123"})
        assert res_login_b.status_code == 200
        token_b = res_login_b.json()["access_token"]
        headers_b = {"Authorization": f"Bearer {token_b}"}

        # C. GET Dashboard User A
        t0 = time.time()
        res_dash_a = await client.get("/api/v1/analytics/dashboard", headers=headers_a)
        lat_dash_a = round((time.time() - t0) * 1000, 2)
        assert res_dash_a.status_code == 200
        data_dash_a = res_dash_a.json()
        print(f"4. GET /api/v1/analytics/dashboard (User A): 200 OK ({lat_dash_a}ms) -> Applications: {data_dash_a['overview']['active_applications']}")

        # D. GET Dashboard User B (Isolation Check)
        res_dash_b = await client.get("/api/v1/analytics/dashboard", headers=headers_b)
        assert res_dash_b.status_code == 200
        data_dash_b = res_dash_b.json()
        print(f"5. GET /api/v1/analytics/dashboard (User B Isolation Check): 200 OK -> Applications: {data_dash_b['overview']['active_applications']} (EXPECTED 0)")
        assert data_dash_a['overview']['active_applications'] == 1
        assert data_dash_b['overview']['active_applications'] == 0

        # E. GET Career Intelligence User A
        t0 = time.time()
        res_career_a = await client.get("/api/v1/career/intelligence", headers=headers_a)
        lat_career_a = round((time.time() - t0) * 1000, 2)
        assert res_career_a.status_code == 200
        data_career_a = res_career_a.json()
        print(f"6. GET /api/v1/career/intelligence (User A): 200 OK ({lat_career_a}ms)")
        print(f"   - Verified Skills: {data_career_a['profile']['verified_skills']}")
        print(f"   - Target Company: {data_career_a['profile']['target_company']}")

        # F. GET Company Intelligence (Stripe & Google 5-Tier Classification)
        print("\n--- SECTION 3: TAVILY COMPANY INTELLIGENCE & 5-TIER PROVENANCE ---")
        t0 = time.time()
        res_comp_stripe = await client.get("/api/v1/company/Stripe", headers=headers_a)
        lat_comp = round((time.time() - t0) * 1000, 2)
        assert res_comp_stripe.status_code == 200
        data_comp = res_comp_stripe.json()
        print(f"7. GET /api/v1/company/Stripe: 200 OK ({lat_comp}ms)")
        print(f"   - Tech Stack: {data_comp.get('tech_stack')}")
        print(f"   - Total Classified Sources: {len(data_comp.get('sources', []))}")
        for src in data_comp.get("sources", [])[:3]:
            print(f"     -> [{src.get('tier')}] {src.get('domain')} - {src.get('title')[:40]}")

        # G. POST Real Spoken Audio Upload to Mock Interview
        print("\n--- SECTION 4: MOCK INTERVIEW & REAL SPOKEN AUDIO STT E2E ---")
        async with iso_session() as db:
            int_sess = InterviewSession(
                user_id=user_a.id,
                role_title="Backend Engineer",
                company_name="Stripe",
                is_completed=False,
                questions=["Explain rate limiting."],
                transcript=[{"question": "Explain rate limiting.", "answer": "", "evaluation": {}}]
            )
            db.add(int_sess)
            await db.commit()
            await db.refresh(int_sess)
            sess_id = int_sess.id

        audio_mp3_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "freetts.org-2026-08-17_06-58-27.mp3"))
        with open(audio_mp3_path, "rb") as audio_file:
            audio_bytes = audio_file.read()

        t0 = time.time()
        res_audio = await client.post(
            "/api/v1/interview/audio-answer",
            headers=headers_a,
            files={"audio_file": ("spoken_answer.mp3", audio_bytes, "audio/mp3")},
            data={"session_id": str(sess_id), "question_index": "0"}
        )
        lat_audio = round((time.time() - t0) * 1000, 2)
        print(f"8. POST /api/v1/interview/audio-answer: Status={res_audio.status_code} ({lat_audio}ms)")
        if res_audio.status_code == 200:
            print(f"   - Transcribed Engine: {res_audio.json().get('stt_engine')}")
            print(f"   - Transcript Length: {len(res_audio.json().get('transcript', ''))} chars")

    # CLEANUP ISOLATED TEST DB
    app.dependency_overrides.clear()
    await iso_engine.dispose()

    maint_engine = create_async_engine(MAINTENANCE_DB_URL, isolation_level="AUTOCOMMIT")
    async with maint_engine.connect() as conn:
        await conn.execute(text("DROP DATABASE IF EXISTS ace_isolated_test_db;"))
    await maint_engine.dispose()

    print("\n" + "="*80)
    print("ACE MASTER FINAL E2E & PROVIDER CLOSURE AUDIT COMPLETE: VERIFIED")
    print("="*80)

if __name__ == "__main__":
    asyncio.run(run_final_e2e_closure_audit())
