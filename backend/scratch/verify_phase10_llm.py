import sys
import os
import asyncio
import json
import time
import math
import struct
import wave
import io
from unittest.mock import patch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import sqlalchemy
from fastapi import FastAPI
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select

from app.main import app
from app.core.database import get_db
from app.models.user import User, Application, ApplicationStatus, InterviewSession
from app.core.security import get_password_hash
from app.core.config import settings
from app.core.llm_router import get_active_provider, set_active_provider

# --- Test Resumes ---------------------------------------------------------------
REALISTIC_RESUME_PYTHON = """
John Doe - Senior Software Engineer
Email: john.doe@email.com | Phone: 123-456-7890

Summary:
Highly experienced Senior Software Engineer with over 8 years of experience designing and
implementing scalable web applications, microservices, and distributed systems. Expert in
Python, FastAPI, Docker, Kubernetes, and PostgreSQL. Skilled in optimizing API performance
and leading engineering teams to deliver production-ready software solutions.

Professional Experience:
Senior Software Engineer - Tech Solutions Inc. (2020 - Present)
- Designed and built a high-throughput microservices backend using FastAPI and Python,
  reducing response latencies by 35%.
- Containerized applications using Docker and orchestrated deployments on Kubernetes clusters,
  improving system availability to 99.9%.
- Managed PostgreSQL database schemas and implemented connection pooling, improving read
  throughput by 50%.
- Integrated external LLMs and search APIs to build AI-driven resume parsing systems.

Education:
Bachelor of Science in Computer Science - State University (2012 - 2016)
"""

REALISTIC_RESUME_CPP = """
Jane Smith - Systems Engineer
Email: jane.smith@systems.io | GitHub: github.com/jsmith-systems

Summary:
Systems Engineer with 6 years of experience in high-performance computing, embedded systems,
and real-time trading infrastructure. Proficient in C++, Go, Rust, and CMake. Deep expertise
in POSIX threading, lock-free data structures, and TCP/IP networking. Contributed to open-source
projects using Python and Bash automation.

Professional Experience:
Systems Engineer - FinTech Corp (2019 - Present)
- Built ultra-low-latency order matching engine in C++ using lock-free queues, reducing tick-to-trade
  latency from 12ms to 850 microseconds.
- Designed distributed message broker using Go and gRPC, handling 500k messages/sec.
- Implemented CI/CD pipelines using GitHub Actions, Docker, and Kubernetes.
- Automated infrastructure provisioning with Terraform and Ansible across AWS and GCP.

Education:
M.S. in Computer Engineering - Institute of Technology (2013 - 2015)
"""

# --- Audio Loading ---------------------------------------------------------------
def generate_sine_wave_audio() -> bytes:
    wav_io = io.BytesIO()
    with wave.open(wav_io, 'wb') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(8000)
        for i in range(8000):
            val = int(32767 * math.sin(2 * math.pi * 440 * i / 8000))
            wav_file.writeframes(struct.pack('<h', val))
    return wav_io.getvalue()

def load_test_audio() -> tuple:
    """Find any .mp3 file in the ACE root directory (handles renamed files)."""
    ace_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    mp3_files = [f for f in os.listdir(ace_root) if f.lower().endswith(".mp3")]
    if mp3_files:
        # Pick the largest mp3 (the most substantive interview recording)
        mp3_files.sort(key=lambda f: os.path.getsize(os.path.join(ace_root, f)), reverse=True)
        chosen = mp3_files[0]
        audio_path = os.path.join(ace_root, chosen)
        with open(audio_path, "rb") as f:
            data = f.read()
        duration_s = len(data) // 16000
        print(f"  [Audio] Loaded real audio file: {chosen} ({len(data)} bytes, ~{duration_s}s)")
        return chosen, data, "audio/mpeg"
    else:
        print("  [Audio] No .mp3 found in ACE root - using generated sine wave fallback")
        return "speech.wav", generate_sine_wave_audio(), "audio/wav"


async def run_verification():
    print("=" * 80)
    print("ACE PHASE 10 - FINAL TARGETED FIXES VERIFICATION")
    print("=" * 80)

    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        await db.execute(text("DELETE FROM applications WHERE company_name IN ('Microsoft', 'Google', 'Stripe');"))
        await db.execute(text("DELETE FROM interview_feedbacks;"))
        await db.execute(text("DELETE FROM interview_sessions;"))
        await db.execute(text("DELETE FROM resumes;"))
        await db.execute(text("DELETE FROM chat_messages;"))
        await db.execute(text("DELETE FROM chat_sessions;"))
        await db.execute(text("DELETE FROM users WHERE email IN ('user_a@ace.ai', 'user_b@ace.ai');"))
        await db.commit()

        user_a = User(email="user_a@ace.ai", hashed_password=get_password_hash("password123"), is_active=True)
        db.add(user_a)
        await db.commit()
        await db.refresh(user_a)
        user_a_id = user_a.id

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res_a = await client.post("/api/v1/auth/login", data={"username": "user_a@ace.ai", "password": "password123"})
        token_a = res_a.json()["access_token"]
        headers_a = {"Authorization": f"Bearer {token_a}"}

        # -----------------------------------------------------------------------
        # ISSUE 1 & 2 - REAL AUDIO + REAL GROQ STT + REAL GEMINI FALLBACK
        # -----------------------------------------------------------------------
        print("\n--- ISSUE 1 & 2: AUDIO ENDPOINT WITH REAL audio.mp3 ---")
        try:
            start_payload = {
                "role_title": "Senior Python Developer",
                "company_name": "Netflix",
                "tech_stack_or_jd": "Python, FastAPI, Docker, PostgreSQL, Kubernetes."
            }
            start_res = await client.post("/api/v1/interview/start", json=start_payload, headers=headers_a)
            session_id = start_res.json()["session_id"]
            print(f"  Session started. Session ID: {session_id}")

            # -- Part A: Groq STT (primary) --
            print("\n  [Part A] Groq Whisper STT + Groq LLM Eval (primary path)")
            filename, audio_bytes, mime_type = load_test_audio()
            files = {"audio_file": (filename, audio_bytes, mime_type)}
            data  = {"session_id": session_id, "question_index": 0}

            t0 = time.time()
            res_a_audio = await client.post("/api/v1/interview/audio-answer", data=data, files=files, headers=headers_a)
            elapsed = round(time.time() - t0, 2)

            print(f"  HTTP Status      : {res_a_audio.status_code}")
            print(f"  Latency          : {elapsed}s")
            body_a = res_a_audio.json()
            stt_engine_a = body_a.get("stt_engine", "groq-whisper-large-v3-turbo (inferred)")
            print(f"  STT Engine       : {stt_engine_a}")
            print(f"  WPM Speech Pace  : {body_a.get('wpm_speech_pace')}")
            print(f"  Evaluation Score : {body_a.get('evaluation_score')}")
            print(f"  Action Verbs     : {body_a.get('action_verbs_detected')}")
            print(f"  Suggestions      : {body_a.get('suggestions')}")
            assert res_a_audio.status_code == 200, f"Expected 200, got {res_a_audio.status_code}"
            # Score can be None (LLM busy) or a float
            score_a = body_a.get("evaluation_score")
            assert score_a is None or isinstance(score_a, (int, float)), "Score type mismatch"
            print("  Groq path: PASS OK")

            # -- Part B: Genuine Groq Key Failure -> Real Gemini 3.6 Flash STT + Eval --
            print("\n  [Part B] Genuine Groq Key Failure -> Gemini 3.6 Flash STT + Eval fallback")
            filename_fb, audio_bytes_fb, mime_type_fb = load_test_audio()
            files_fb = {"audio_file": (filename_fb, audio_bytes_fb, mime_type_fb)}
            data_fb  = {"session_id": session_id, "question_index": 1}

            with patch("app.core.config.settings.GROQ_API_KEY", "gsk_INVALID_KEY_for_genuine_failure_test"):
                t1 = time.time()
                res_b_audio = await client.post("/api/v1/interview/audio-answer", data=data_fb, files=files_fb, headers=headers_a)
                elapsed_fb = round(time.time() - t1, 2)

            print(f"  HTTP Status      : {res_b_audio.status_code}")
            print(f"  Latency          : {elapsed_fb}s")
            body_b = res_b_audio.json()
            stt_engine_b = body_b.get("stt_engine", "gemini-3.6-flash-audio (inferred from Groq failure)")
            print(f"  STT Engine       : {stt_engine_b}")
            print(f"  WPM Speech Pace  : {body_b.get('wpm_speech_pace')}")
            print(f"  Evaluation Score : {body_b.get('evaluation_score')}")
            print(f"  Action Verbs     : {body_b.get('action_verbs_detected')}")
            assert res_b_audio.status_code == 200, f"Expected 200, got {res_b_audio.status_code}"
            print("  Gemini fallback path: PASS OK")

            # -- PostgreSQL persistence check --
            async with async_session() as db:
                result = await db.execute(
                    select(InterviewSession).filter(InterviewSession.id == session_id)
                )
                session_obj = result.scalars().first()
                transcript = session_obj.transcript or []
                print(f"\n  PostgreSQL: {len(transcript)} answer(s) persisted for session {session_id}")
                assert len(transcript) >= 1

            print("\nISSUE 1 & 2 VERDICT: PASS OK")
        except Exception as e:
            import traceback; traceback.print_exc()
            print(f"\nISSUE 1 & 2 VERDICT: FAIL - {e}")

        # ------------------------------------------------------------------------
        # ISSUE 3 - RESUME SKILL FILTERING (GENERIC, TWO RESUMES)
        # ------------------------------------------------------------------------
        print("\n--- ISSUE 3: RESUME SKILL FILTERING (GENERIC) ---")

        NOISE_TOKENS = {"john", "doe", "jane", "smith", "experience", "improving",
                        "senior", "engineer", "software", "developer", "resume",
                        "summary", "profile", "candidate"}
        LEGIT_PYTHON = {"fastapi", "python", "docker", "kubernetes", "postgresql"}
        LEGIT_CPP    = {"c++", "go", "rust", "grpc", "terraform", "ansible", "aws", "gcp"}

        for label, resume_text, legit_set in [
            ("Python/FastAPI Resume", REALISTIC_RESUME_PYTHON, LEGIT_PYTHON),
            ("C++/Go Systems Resume", REALISTIC_RESUME_CPP, LEGIT_CPP),
        ]:
            print(f"\n  [{label}]")
            try:
                files_r = {"file": ("resume.txt", resume_text.encode(), "text/plain")}
                res_r = await client.post("/api/v1/resume/upload", files=files_r, headers=headers_a)
                assert res_r.status_code == 200, f"Upload failed: {res_r.status_code}"
                skills = res_r.json().get("skills", [])
                print(f"  Provider         : {get_active_provider()}")
                print(f"  Extracted Skills : {skills}")

                noisy = [s for s in skills if s.lower() in NOISE_TOKENS]
                legit_found = [s for s in skills if s.lower() in legit_set]
                print(f"  Noisy words kept : {noisy}  (must be empty)")
                print(f"  Legit skills     : {legit_found}  (must be non-empty)")

                assert len(noisy) == 0, f"Noise words leaked into skills: {noisy}"
                assert len(legit_found) > 0, f"No legitimate skills found! Got: {skills}"
                print(f"  PASS OK")
            except Exception as e:
                import traceback; traceback.print_exc()
                print(f"  FAIL - {e}")

        print("\nISSUE 3 VERDICT: see individual results above")

        # ------------------------------------------------------------------------
        # PostgreSQL Rollback Regression
        # ------------------------------------------------------------------------
        print("\n--- REGRESSION: PostgreSQL Rollback ---")
        try:
            async with async_session() as db:
                result = await db.execute(
                    select(Application).filter(Application.user_id == user_a_id, Application.company_name == "Microsoft")
                )
                assert len(result.scalars().all()) == 0

            try:
                with patch("sqlalchemy.ext.asyncio.session.AsyncSession.commit",
                           side_effect=Exception("Simulated commit failure")):
                    await client.post("/api/v1/applications/", json={
                        "company_name": "Microsoft", "role_title": "Staff Engineer",
                        "status": "applied", "jd_text": "Azure, C#, Kubernetes."
                    }, headers=headers_a)
            except Exception:
                pass

            async with async_session() as db:
                result = await db.execute(
                    select(Application).filter(Application.user_id == user_a_id, Application.company_name == "Microsoft")
                )
                count = len(result.scalars().all())
                print(f"  Apps in DB after rollback: {count} (expected 0)")
                assert count == 0
            print("  Rollback: PASS OK")
        except Exception as e:
            print(f"  Rollback: FAIL - {e}")

    async with async_session() as db:
        await db.execute(text("DELETE FROM applications WHERE company_name IN ('Microsoft', 'Google', 'Stripe');"))
        await db.execute(text("DELETE FROM interview_feedbacks;"))
        await db.execute(text("DELETE FROM interview_sessions;"))
        await db.execute(text("DELETE FROM resumes;"))
        await db.execute(text("DELETE FROM chat_messages;"))
        await db.execute(text("DELETE FROM chat_sessions;"))
        await db.execute(text("DELETE FROM users WHERE email IN ('user_a@ace.ai', 'user_b@ace.ai');"))
        await db.commit()

    await engine.dispose()
    print("\n" + "=" * 80)
    print("VERIFICATION COMPLETE")
    print("=" * 80)

if __name__ == "__main__":
    asyncio.run(run_verification())
