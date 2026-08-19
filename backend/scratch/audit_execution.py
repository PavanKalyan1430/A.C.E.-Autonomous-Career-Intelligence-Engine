import os
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')
import asyncio
import json
import time
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select
from sqlalchemy.orm.attributes import flag_modified
from unittest.mock import patch, AsyncMock, MagicMock

# Set pythonpath to include backend directory
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.core.database import Base, get_db
from app.core.config import settings
from app.models.user import User, InterviewSession, InterviewFeedback
from app.core.security import get_password_hash
from app.services.audio_service import audio_transcription_service

# Print configuration
print("--- ENVIRONMENT SETTINGS ---")
print("DATABASE_URL:", settings.DATABASE_URL)
print("STT_TIMEOUT:", settings.STT_TIMEOUT)
print("INTERVIEW_PROCESSING_TIMEOUT:", settings.INTERVIEW_PROCESSING_TIMEOUT)
print("RATE_LIMIT_ENABLED:", settings.RATE_LIMIT_ENABLED)

# Verify if we can connect to PostgreSQL
engine = create_async_engine(settings.DATABASE_URL, echo=False)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def print_db_state(session_id: int):
    async with async_session() as db:
        stmt = select(InterviewSession).filter(InterviewSession.id == session_id)
        result = await db.execute(stmt)
        record = result.scalars().first()
        if record:
            print(f"  [DB STATE] session_id={record.id} index={record.current_question_index} completed={record.is_completed}")
            print(f"  [DB TRANSCRIPT] {json.dumps(record.transcript, indent=2)}")
        else:
            print("  [DB STATE] No record found.")

async def run_audit():
    # Initialize DB schema on PostgreSQL if needed
    async with engine.begin() as conn:
        from sqlalchemy import text
        try:
            await conn.execute(text("ALTER TABLE interview_feedbacks ADD COLUMN IF NOT EXISTS overall_score INTEGER DEFAULT 0;"))
        except Exception as e:
            print("Alter table exception:", e)
        await conn.run_sync(Base.metadata.create_all)

    # Setup 2 clean test users
    async with async_session() as db:
        # Clear previous test data for clean slate
        await db.execute(select(User).filter(User.email.in_(["user_a@ace.ai", "user_b@ace.ai"])))
        for email in ["user_a@ace.ai", "user_b@ace.ai"]:
            res = await db.execute(select(User).filter(User.email == email))
            existing = res.scalars().first()
            if existing:
                await db.delete(existing)
        await db.commit()

        user_a = User(email="user_a@ace.ai", hashed_password=get_password_hash("password123"), is_active=True)
        user_b = User(email="user_b@ace.ai", hashed_password=get_password_hash("password123"), is_active=True)
        db.add(user_a)
        db.add(user_b)
        await db.commit()
        await db.refresh(user_a)
        await db.refresh(user_b)
        user_a_id = user_a.id
        user_b_id = user_b.id

    # Create dependency overrides for PostgreSQL session
    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        async with async_session() as session:
            yield session
    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Login User A & B
        res_a = await client.post("/api/v1/auth/login", data={"username": "user_a@ace.ai", "password": "password123"})
        token_a = res_a.json()["access_token"]
        headers_a = {"Authorization": f"Bearer {token_a}"}

        res_b = await client.post("/api/v1/auth/login", data={"username": "user_b@ace.ai", "password": "password123"})
        token_b = res_b.json()["access_token"]
        headers_b = {"Authorization": f"Bearer {token_b}"}

        print("\n==================================================")
        print("2. REAL TEXT INTERVIEW FLOW")
        print("==================================================")
        
        # Start session
        payload_start = {
            "role_title": "Senior Staff Engineer",
            "company_name": "Google",
            "tech_stack_or_jd": "Python, Distributed Systems, Concurrency Control"
        }
        print("REQUEST /start PAYLOAD:", payload_start)
        start_res = await client.post("/api/v1/interview/start", headers=headers_a, json=payload_start)
        print("RESPONSE STATUS:", start_res.status_code)
        print("RESPONSE JSON:", start_res.json())
        session_id = start_res.json()["session_id"]
        questions = start_res.json()["questions"]

        # Submit answers
        substantive_answers = [
            "We design high-throughput system architectures by decoupling read and write paths. We use read replicas and cache invalidation with Redis. We use rate limiting at the API gateway using a token bucket algorithm to protect downstream microservices.",
            "To handle concurrency and fault tolerance, we use optimistic locking at the database level where appropriate, and distributed locks via Redlock when necessary. We implement circuit breakers and retries with backoff for remote service calls."
        ]

        for idx, ans in enumerate(substantive_answers):
            payload_sub = {
                "session_id": session_id,
                "question_index": idx,
                "user_answer": ans,
                "speech_duration_seconds": 25.0
            }
            print(f"\nSUBMITTING ANSWER {idx} PAYLOAD:", payload_sub)
            await print_db_state(session_id)
            sub_res = await client.post("/api/v1/interview/submit-answer", headers=headers_a, json=payload_sub)
            print(f"RESPONSE ANSWER {idx} STATUS:", sub_res.status_code)
            print(f"RESPONSE ANSWER {idx} JSON:", sub_res.json())
            await print_db_state(session_id)

        print("\n==================================================")
        print("3. REAL AUDIO FLOW")
        print("==================================================")
        # Read the real freetts audio file from root workspace
        audio_path = "../freetts.org-2026-08-17_06-58-27.mp3"
        print(f"Checking real MP3 file path: {audio_path}")
        if not os.path.exists(audio_path):
            print("ERROR: real audio file does not exist!")
            return
        
        with open(audio_path, "rb") as f:
            audio_bytes = f.read()
        print("Audio file size:", len(audio_bytes), "bytes.")

        # Test Case A: Real Audio Ingestion -> STT -> LLM -> DB
        print("\nCase A: Submitting real MP3 audio...")
        files = {"audio_file": ("freetts.mp3", audio_bytes, "audio/mpeg")}
        data = {"session_id": session_id, "question_index": 2}
        
        # We disable rate limiting globally so that it doesn't block the audio run
        with patch.object(settings, "RATE_LIMIT_ENABLED", False):
            audio_res = await client.post(
                "/api/v1/interview/audio-answer",
                headers=headers_a,
                data=data,
                files=files
            )
        print("REAL AUDIO RESPONSE STATUS:", audio_res.status_code)
        print("REAL AUDIO RESPONSE JSON:", audio_res.json())
        await print_db_state(session_id)

        # Test Case B: Wrong extension renamed to webm
        print("\nCase B: Executable file named as webm (Renamed payload check)")
        files_bad = {"audio_file": ("malicious.webm", b"MZ\x90\x00somebinarydata", "audio/webm")}
        bad_res = await client.post(
            "/api/v1/interview/audio-answer",
            headers=headers_a,
            data={"session_id": session_id, "question_index": 3},
            files=files_bad
        )
        print("RENAME BYPASS STATUS:", bad_res.status_code)
        print("RENAME BYPASS DETAIL:", bad_res.json())

        # Test Case C: Corrupted WAV
        print("\nCase C: Corrupted WAV signature check")
        files_corrupt = {"audio_file": ("corrupt.wav", b"RIFF\x00\x00\x00\x00NOTWAVE", "audio/wav")}
        corrupt_res = await client.post(
            "/api/v1/interview/audio-answer",
            headers=headers_a,
            data={"session_id": session_id, "question_index": 3},
            files=files_corrupt
        )
        print("CORRUPT WAV STATUS:", corrupt_res.status_code)
        print("CORRUPT WAV DETAIL:", corrupt_res.json())

        print("\n==================================================")
        print("4. STUCK PROCESSING STATE RECOVERY")
        print("==================================================")
        
        # Inject stuck PROCESSING entry in PostgreSQL
        async with async_session() as db:
            result_db = await db.execute(select(InterviewSession).filter(InterviewSession.id == session_id))
            session_db = result_db.scalars().first()
            
            # Ensure questions has enough items for index 3
            while len(session_db.questions) <= 3:
                session_db.questions.append("Explain system architecture scaling.")
            flag_modified(session_db, "questions")
            
            # Setup stuck entry at index 3
            stale_time = time.time() - (settings.INTERVIEW_PROCESSING_TIMEOUT + 10.0)
            session_db.transcript.append({
                "question_index": 3,
                "question": "Explain system architecture scaling.",
                "user_answer": "Stuck in processing during crash",
                "evaluation_status": "PROCESSING",
                "processing_started_at": stale_time,
                "evaluation_score": None,
                "filler_words_found": [],
                "filler_word_ratio": 0.0,
                "wpm_pace": None,
                "action_verbs": [],
                "metrics": [],
                "suggestions": []
            })
            flag_modified(session_db, "transcript")
            await db.commit()
            
        print("Stuck entry injected into PostgreSQL. Current DB state:")
        await print_db_state(session_id)

        # Retry submitting the answer. The lazy recovery should trigger, mark the stuck as FAILED, and evaluate again
        payload_retry = {
            "session_id": session_id,
            "question_index": 3,
            "user_answer": "We scale system architectures vertically and horizontally. Horizontal scaling is preferred using stateless app servers behind Nginx.",
            "speech_duration_seconds": 15.0
        }
        print("\nRetrying stuck index 3 payload:", payload_retry)
        retry_res = await client.post("/api/v1/interview/submit-answer", headers=headers_a, json=payload_retry)
        print("RETRY STATUS:", retry_res.status_code)
        print("RETRY RESPONSE JSON:", retry_res.json())
        await print_db_state(session_id)

        print("\n==================================================")
        print("5. RATE LIMITING FLOW")
        print("==================================================")
        # Enable rate limits
        with patch.object(settings, "RATE_LIMIT_ENABLED", True):
            # Send sequential requests to trigger 429
            print("Triggering rapid requests to exceed text limit (15 requests/min)...")
            hit_429 = False
            for r_idx in range(25):
                res_rate = await client.post("/api/v1/interview/submit-answer", headers=headers_a, json={
                    "session_id": session_id,
                    "question_index": 0,
                    "user_answer": "Rate limit spam request text.",
                    "speech_duration_seconds": 10.0
                })
                if res_rate.status_code == 429:
                    print(f"HITTED 429 after {r_idx + 1} requests. Status: {res_rate.status_code}, Response: {res_rate.json()}")
                    hit_429 = True
                    break
            
            # Verify User B remains unaffected
            print("\nVerifying User B is unaffected by User A's rate limits...")
            res_b_start = await client.post("/api/v1/interview/start", headers=headers_b, json={
                "role_title": "Go Developer", "company_name": "Google", "tech_stack_or_jd": "Go"
            })
            session_id_b = res_b_start.json()["session_id"]
            
            res_b_sub = await client.post("/api/v1/interview/submit-answer", headers=headers_b, json={
                "session_id": session_id_b,
                "question_index": 0,
                "user_answer": "User B answer text that should succeed despite User A limits.",
                "speech_duration_seconds": 15.0
            })
            print("User B submit status:", res_b_sub.status_code)
            print("User B response:", res_b_sub.json())

        print("\n==================================================")
        print("6. AUTHORIZATION / ISOLATION")
        print("==================================================")
        # User B trying to submit to User A's session
        print("User B trying to submit to User A's session (cross-user violation):")
        cross_res = await client.post("/api/v1/interview/submit-answer", headers=headers_b, json={
            "session_id": session_id,
            "question_index": 0,
            "user_answer": "Intruder answer content",
            "speech_duration_seconds": 10.0
        })
        print("CROSS-USER RESPONSE STATUS:", cross_res.status_code)
        print("CROSS-USER RESPONSE JSON:", cross_res.json())

        # Clean up database test users
        async with async_session() as db:
            user_a = await db.get(User, user_a_id)
            user_b = await db.get(User, user_b_id)
            if user_a:
                await db.delete(user_a)
            if user_b:
                await db.delete(user_b)
            await db.commit()
            print("\nDatabase cleared of test users.")

if __name__ == "__main__":
    asyncio.run(run_audit())
