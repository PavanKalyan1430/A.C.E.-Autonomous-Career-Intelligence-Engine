import os
import sys
import asyncio
import json
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.core.database import Base, get_db
from app.core.config import settings
from app.models.user import User, Resume, UserMemory, ChatSession, ChatMessage
from app.core.security import get_password_hash

DATABASE_URL = settings.DATABASE_URL
engine = create_async_engine(DATABASE_URL, echo=False)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def setup_test_data(db: AsyncSession) -> int:
    # Clean old audit users
    res = await db.execute(select(User).filter(User.email == "orchestration_audit@ace.ai"))
    existing = res.scalars().first()
    if existing:
        await db.delete(existing)
        await db.commit()

    user = User(
        email="orchestration_audit@ace.ai",
        hashed_password=get_password_hash("password123"),
        is_active=True
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # 1. Add Resume
    resume = Resume(
        user_id=user.id,
        file_name="resume.pdf",
        raw_text="Pavan Kalyan. Expert Backend Software Engineer with 5 years of experience. Skills: Python, FastAPI, PostgreSQL, Redis, Docker, Kubernetes. Built high-throughput microservices.",
        parsed_data={
            "skills": ["Python", "FastAPI", "PostgreSQL", "Redis", "Docker", "Kubernetes"],
            "experience_years": 5
        }
    )
    db.add(resume)

    # 2. Add Memories
    mem1 = UserMemory(
        user_id=user.id,
        category="goal",
        memory_text="Wants to transition to a Staff Software Engineer role at a top-tier company working on distributed systems."
    )
    mem2 = UserMemory(
        user_id=user.id,
        category="weak_area",
        memory_text="Needs to improve knowledge of topological graph analysis and Advanced System Design patterns."
    )
    db.add(mem1)
    db.add(mem2)

    await db.commit()
    return user.id

async def run_audit():
    async with async_session() as db:
        user_id = await setup_test_data(db)

    async def override_get_db():
        async with async_session() as session:
            yield session
    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Login
        login_res = await client.post("/api/v1/auth/login", data={"username": "orchestration_audit@ace.ai", "password": "password123"})
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        print("--- AUDIT CASE 1: MULTI-TOOL ORCHESTRATION ---")
        q1_payload = {
            "message": "Verify if my resume skills align with Google's backend stack. Retrieve my career goal first, search Google's tech stack, and compute the semantic similarity."
        }
        print("Payload:", q1_payload)
        res1 = await client.post("/api/v1/agent/query", headers=headers, json=q1_payload)
        print("Status Code:", res1.status_code)
        print("Response:", json.dumps(res1.json(), indent=2))

        print("\n--- AUDIT CASE 2: SESSION CONTINUITY ---")
        session_id = res1.json()["session_id"]
        q2_payload = {
            "message": "Based on my previous query comparing my skills with Google, what are the missing topological skill gaps for my target role?",
            "session_id": session_id
        }
        print("Payload:", q2_payload)
        res2 = await client.post("/api/v1/agent/query", headers=headers, json=q2_payload)
        print("Status Code:", res2.status_code)
        print("Response:", json.dumps(res2.json(), indent=2))

    # Cleanup
    async with async_session() as db:
        res = await db.execute(select(User).filter(User.id == user_id))
        user = res.scalars().first()
        if user:
            await db.delete(user)
            await db.commit()

if __name__ == "__main__":
    asyncio.run(run_audit())
