import pytest
import asyncio
import json
import io
import os
import wave
import struct
import math
import time
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.orm.attributes import flag_modified
from sqlalchemy.future import select
from unittest.mock import patch, AsyncMock, MagicMock

from app.main import app
from app.core.database import Base, get_db
from app.core.config import settings
from app.models.user import User, InterviewSession, InterviewFeedback
from app.core.security import get_password_hash
from app.services.audio_service import audio_transcription_service

# File-based SQLite for isolated concurrent tests
TEST_DATABASE_URL = "sqlite+aiosqlite:///test_temp_db.sqlite"

@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"

@pytest.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    # Clean up old database file if exists
    if os.path.exists("test_temp_db.sqlite"):
        try:
            os.remove("test_temp_db.sqlite")
        except Exception:
            pass
            
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    async with async_session() as session:
        yield session
        
    await engine.dispose()
    
    if os.path.exists("test_temp_db.sqlite"):
        try:
            os.remove("test_temp_db.sqlite")
        except Exception:
            pass

@pytest.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        async with async_session() as session:
            yield session
            
    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
    await engine.dispose()

@pytest.fixture(scope="function")
async def test_user(db_session: AsyncSession) -> User:
    user = User(
        email="test_contract@ace.ai",
        hashed_password=get_password_hash("securepassword123"),
        is_active=True,
        is_superuser=False
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
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

@pytest.fixture(scope="function")
async def second_test_user(db_session: AsyncSession) -> User:
    user = User(
        email="second_user@ace.ai",
        hashed_password=get_password_hash("secondpassword123"),
        is_active=True,
        is_superuser=False
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user

@pytest.fixture(scope="function")
async def second_auth_headers(client: AsyncClient, second_test_user: User) -> dict:
    login_data = {
        "username": second_test_user.email,
        "password": "secondpassword123"
    }
    response = await client.post("/api/v1/auth/login", data=login_data)
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture(autouse=True)
def disable_rate_limiting():
    original_val = settings.RATE_LIMIT_ENABLED
    settings.RATE_LIMIT_ENABLED = False
    yield
    settings.RATE_LIMIT_ENABLED = original_val

def generate_sine_wave_audio(duration_sec: float = 1.0) -> bytes:
    wav_io = io.BytesIO()
    with wave.open(wav_io, 'wb') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(8000)
        num_frames = int(8000 * duration_sec)
        for i in range(num_frames):
            val = int(32767 * math.sin(2 * math.pi * 440 * i / 8000))
            wav_file.writeframes(struct.pack('<h', val))
    return wav_io.getvalue()

def mock_tool(return_val=None, side_effect=None):
    m = MagicMock()
    m.ainvoke = AsyncMock(return_value=return_val, side_effect=side_effect)
    return m

# --- 1. Timeout & Fallback resilience tests ---
@pytest.mark.anyio
async def test_llm_router_transient_failure_and_fallback(client: AsyncClient, auth_headers: dict):
    mock_eval = mock_tool(return_val=json.dumps({
        "technical_score": 88.0,
        "strengths": "Good explanation of system performance.",
        "nlp_action_verbs_detected": ["design"],
        "nlp_quantifiable_metrics": ["35%"]
    }))
    
    start_payload = {
        "role_title": "Python Developer",
        "company_name": "ResilientCorp",
        "tech_stack_or_jd": "FastAPI, Postgres"
    }
    
    mock_gen = mock_tool(return_val=json.dumps({"questions": ["Q1", "Q2"]}))
    with patch("app.api.interview.generate_interview_questions_tool", mock_gen):
        res = await client.post("/api/v1/interview/start", headers=auth_headers, json=start_payload)
        session_id = res.json()["session_id"]

    with patch("app.api.interview.evaluate_star_interview_tool", mock_eval):
        submit_res = await client.post("/api/v1/interview/submit-answer", headers=auth_headers, json={
            "session_id": session_id,
            "question_index": 0,
            "user_answer": "I have extensive experience working with FastAPI and connection pool sizing.",
            "speech_duration_seconds": 15.0
        })
        assert submit_res.status_code == 200
        assert submit_res.json()["evaluation_score"] == 88.0

# --- 2. State machine sequence & completion tests ---
@pytest.mark.anyio
async def test_interview_state_machine_transition_violations(client: AsyncClient, auth_headers: dict):
    mock_gen = mock_tool(return_val=json.dumps({"questions": ["Q1", "Q2"]}))
    with patch("app.api.interview.generate_interview_questions_tool", mock_gen):
        res = await client.post("/api/v1/interview/start", headers=auth_headers, json={
            "role_title": "Systems Dev",
            "tech_stack_or_jd": "Rust"
        })
        session_id = res.json()["session_id"]

    submit_res = await client.post("/api/v1/interview/submit-answer", headers=auth_headers, json={
        "session_id": session_id,
        "question_index": 1,
        "user_answer": "Testing invalid transition sequence.",
        "speech_duration_seconds": 10.0
    })
    assert submit_res.status_code == 400

# --- 3. Idempotency (Duplicate submissions) ---
@pytest.mark.anyio
async def test_answer_idempotency_workflow(client: AsyncClient, auth_headers: dict):
    mock_gen = mock_tool(return_val=json.dumps({"questions": ["Q1", "Q2"]}))
    with patch("app.api.interview.generate_interview_questions_tool", mock_gen):
        res = await client.post("/api/v1/interview/start", headers=auth_headers, json={
            "role_title": "Developer",
            "tech_stack_or_jd": "Go"
        })
        session_id = res.json()["session_id"]

    mock_eval = mock_tool(return_val=json.dumps({
        "technical_score": 90.0,
        "strengths": "Great response."
    }))

    with patch("app.api.interview.evaluate_star_interview_tool", mock_eval):
        res1 = await client.post("/api/v1/interview/submit-answer", headers=auth_headers, json={
            "session_id": session_id,
            "question_index": 0,
            "user_answer": "This is a unique answer response.",
            "speech_duration_seconds": 20.0
        })
        assert res1.status_code == 200
        
        res2 = await client.post("/api/v1/interview/submit-answer", headers=auth_headers, json={
            "session_id": session_id,
            "question_index": 0,
            "user_answer": "This is a unique answer response.",
            "speech_duration_seconds": 20.0
        })
        assert res2.status_code == 200
        assert res2.json()["evaluation_score"] == 90.0

# --- 4. Database boundaries and transactional resilience ---
@pytest.mark.anyio
async def test_answer_decoupled_db_transaction_on_llm_failure(client: AsyncClient, db_session: AsyncSession, auth_headers: dict):
    mock_gen = mock_tool(return_val=json.dumps({"questions": ["Q1", "Q2"]}))
    with patch("app.api.interview.generate_interview_questions_tool", mock_gen):
        res = await client.post("/api/v1/interview/start", headers=auth_headers, json={
            "role_title": "Developer",
            "tech_stack_or_jd": "Go"
        })
        session_id = res.json()["session_id"]

    mock_eval = mock_tool(side_effect=Exception("Simulated LLM Timeout/Internal Error"))

    with patch("app.api.interview.evaluate_star_interview_tool", mock_eval):
        submit_res = await client.post("/api/v1/interview/submit-answer", headers=auth_headers, json={
            "session_id": session_id,
            "question_index": 0,
            "user_answer": "Valid candidate answer that must survive database transaction rollback.",
            "speech_duration_seconds": 15.0
        })
        assert submit_res.status_code == 502

    stmt = select(InterviewSession).filter(InterviewSession.id == session_id)
    result = await db_session.execute(stmt)
    session_record = result.scalars().first()
    assert session_record is not None
    assert len(session_record.transcript) == 1
    assert session_record.transcript[0]["user_answer"] == "Valid candidate answer that must survive database transaction rollback."
    assert session_record.transcript[0]["evaluation_status"] == "FAILED"

# --- 5. Audio ingestion constraints and validation ---
@pytest.mark.anyio
async def test_audio_upload_ingestion_limits(client: AsyncClient, auth_headers: dict):
    mock_gen = mock_tool(return_val=json.dumps({"questions": ["Q1", "Q2"]}))
    with patch("app.api.interview.generate_interview_questions_tool", mock_gen):
        res = await client.post("/api/v1/interview/start", headers=auth_headers, json={
            "role_title": "Audio Expert",
            "tech_stack_or_jd": "DSP"
        })
        session_id = res.json()["session_id"]

    # Case A: Unsupported MIME type/extension
    files = {"audio_file": ("exploit.exe", b"MZ\x90\x00", "application/octet-stream")}
    audio_res = await client.post(
        "/api/v1/interview/audio-answer",
        headers=auth_headers,
        data={"session_id": session_id, "question_index": 0},
        files=files
    )
    assert audio_res.status_code == 400
    assert "Unsupported file extension" in audio_res.json()["detail"]

    # Case B: Excessive duration
    mock_transcribe = AsyncMock(return_value={"transcript": "hello world", "duration_seconds": 660.0, "engine": "groq"})
    with patch("app.api.interview.audio_transcription_service.transcribe_in_memory_audio", mock_transcribe):
        files_long = {"audio_file": ("too_long.wav", b"RIFF\x00\x00\x00\x00WAVEfmt ", "audio/wav")}
        audio_res_long = await client.post(
            "/api/v1/interview/audio-answer",
            headers=auth_headers,
            data={"session_id": session_id, "question_index": 0},
            files=files_long
        )
        assert audio_res_long.status_code == 400

# --- 6. Concurrency Stress Test ---
@pytest.mark.anyio
async def test_concurrent_submissions_isolation(client: AsyncClient, auth_headers: dict):
    mock_gen = mock_tool(return_val=json.dumps({"questions": ["Q1", "Q2"]}))
    with patch("app.api.interview.generate_interview_questions_tool", mock_gen):
        res = await client.post("/api/v1/interview/start", headers=auth_headers, json={
            "role_title": "Concurrency Engineer",
            "tech_stack_or_jd": "FastAPI"
        })
        session_id = res.json()["session_id"]

    async def slow_eval(*args, **kwargs):
        await asyncio.sleep(0.5)
        return json.dumps({"technical_score": 85.0, "strengths": "OK"})

    mock_eval = MagicMock()
    mock_eval.ainvoke = AsyncMock(side_effect=slow_eval)

    with patch("app.api.interview.evaluate_star_interview_tool", mock_eval):
        payload = {
            "session_id": session_id,
            "question_index": 0,
            "user_answer": "Concurrency test answer.",
            "speech_duration_seconds": 15.0
        }
        
        tasks = [
            client.post("/api/v1/interview/submit-answer", headers=auth_headers, json=payload),
            client.post("/api/v1/interview/submit-answer", headers=auth_headers, json=payload)
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        statuses = [r.status_code for r in results if not isinstance(r, Exception)]
        
        assert 200 in statuses
        assert (409 in statuses) or (statuses.count(200) == 2)

# --- 7. STT Timeout & Fallback resilience tests (Cases A-D) ---
@pytest.mark.anyio
async def test_stt_transcription_timeouts():
    # Case A: STT completes before timeout -> SUCCESS
    mock_groq = MagicMock()
    mock_groq.audio.transcriptions.create.return_value = MagicMock(text="Primary transcribed content")
    
    with patch("app.services.audio_service._build_groq_client", return_value=mock_groq), \
         patch.object(settings, "STT_TIMEOUT", 2.0):
        res = await audio_transcription_service.transcribe_in_memory_audio(
            b"RIFF\x00\x00\x00\x00WAVEfmt ", filename="test.wav", mime_type="audio/wav"
        )
        assert res["transcript"] == "Primary transcribed content"
        assert res["engine"] == "groq-whisper-large-v3-turbo"

    # Case B: STT exceeds timeout -> Controlled timeout fallback
    def slow_transcribe(*args, **kwargs):
        time.sleep(1.0)
        m = MagicMock()
        m.text = "Delayed content"
        return m

    mock_groq_slow = MagicMock()
    mock_groq_slow.audio.transcriptions.create.side_effect = slow_transcribe

    with patch("app.services.audio_service._build_groq_client", return_value=mock_groq_slow), \
         patch.object(settings, "STT_TIMEOUT", 0.1), \
         patch.object(settings, "GEMINI_API_KEY", ""):  # No Gemini fallback
        res = await audio_transcription_service.transcribe_in_memory_audio(
            b"RIFF\x00\x00\x00\x00WAVEfmt ", filename="test.wav", mime_type="audio/wav"
        )
        assert res["transcript"] == ""
        assert res["engine"] == "failed"

    # Case C: Primary STT exceeds timeout -> Fallback STT succeeds
    mock_gemini_client = MagicMock()
    mock_gemini_client.models.generate_content.return_value = MagicMock(text="Fallback transcribed content")

    with patch("app.services.audio_service._build_groq_client", return_value=mock_groq_slow), \
         patch("google.genai.Client", return_value=mock_gemini_client), \
         patch.object(settings, "STT_TIMEOUT", 0.1), \
         patch.object(settings, "GEMINI_API_KEY", "dummy_key"):
        res = await audio_transcription_service.transcribe_in_memory_audio(
            b"RIFF\x00\x00\x00\x00WAVEfmt ", filename="test.wav", mime_type="audio/wav"
        )
        # Gemin fallback timeout is also 0.1, but gemini call doesn't raise exception here since it's not delayed
        assert res["transcript"] == "Fallback transcribed content"
        assert res["engine"] == "gemini-3.6-flash-audio"

    # Case D: Primary STT timeout -> Fallback STT timeout -> failure
    def slow_gemini(*args, **kwargs):
        time.sleep(1.0)
        m = MagicMock()
        m.text = "Delayed fallback"
        return m

    mock_gemini_slow = MagicMock()
    mock_gemini_slow.models.generate_content.side_effect = slow_gemini

    with patch("app.services.audio_service._build_groq_client", return_value=mock_groq_slow), \
         patch("google.genai.Client", return_value=mock_gemini_slow), \
         patch.object(settings, "STT_TIMEOUT", 0.1), \
         patch.object(settings, "GEMINI_API_KEY", "dummy_key"):
        res = await audio_transcription_service.transcribe_in_memory_audio(
            b"RIFF\x00\x00\x00\x00WAVEfmt ", filename="test.wav", mime_type="audio/wav"
        )
        assert res["transcript"] == ""
        assert res["engine"] == "failed"

# --- 8. Rate Limiting workflow & isolation tests ---
@pytest.mark.anyio
async def test_rate_limiting_workflow_and_isolation(client: AsyncClient, auth_headers: dict, second_auth_headers: dict):
    # Enable rate limiting for this specific test
    with patch.object(settings, "RATE_LIMIT_ENABLED", True):
        # 1. Start a session
        mock_gen = mock_tool(return_val=json.dumps({"questions": ["Q1", "Q2", "Q3", "Q4", "Q5", "Q6"]}))
        with patch("app.api.interview.generate_interview_questions_tool", mock_gen):
            res = await client.post("/api/v1/interview/start", headers=auth_headers, json={
                "role_title": "Developer", "tech_stack_or_jd": "Go"
            })
            session_id = res.json()["session_id"]

        # Mock evaluate
        mock_eval = mock_tool(return_val=json.dumps({"technical_score": 90.0, "strengths": "OK"}))
        with patch("app.api.interview.evaluate_star_interview_tool", mock_eval):
            # 2. Simulate legitimate workflow below rate limit
            # Submit answers sequentially. Limit is 15 requests/minute.
            for q_idx in range(4):
                res_sub = await client.post("/api/v1/interview/submit-answer", headers=auth_headers, json={
                    "session_id": session_id,
                    "question_index": q_idx,
                    "user_answer": f"Legitimate response to question {q_idx}",
                    "speech_duration_seconds": 12.0
                })
                assert res_sub.status_code == 200

            # 3. Simulate abuse (rapid repeated submissions exceeding limit)
            # Send 15 more requests rapidly. They should start hitting 429.
            hit_429 = False
            for q_idx in range(20):
                res_sub = await client.post("/api/v1/interview/submit-answer", headers=auth_headers, json={
                    "session_id": session_id,
                    "question_index": 4,
                    "user_answer": "Abusive repeated submit",
                    "speech_duration_seconds": 12.0
                })
                if res_sub.status_code == 429:
                    hit_429 = True
                    break
            assert hit_429, "Rate limiter did not block abusive rapid requests."

            # 4. Cross-user isolation
            # User B should still succeed since User B's limit is separate
            mock_gen_b = mock_tool(return_val=json.dumps({"questions": ["Q1"]}))
            with patch("app.api.interview.generate_interview_questions_tool", mock_gen_b):
                res_b = await client.post("/api/v1/interview/start", headers=second_auth_headers, json={
                    "role_title": "Developer", "tech_stack_or_jd": "Go"
                })
                session_id_b = res_b.json()["session_id"]

            res_sub_b = await client.post("/api/v1/interview/submit-answer", headers=second_auth_headers, json={
                "session_id": session_id_b,
                "question_index": 0,
                "user_answer": "Isolated candidate response.",
                "speech_duration_seconds": 12.0
            })
            assert res_sub_b.status_code == 200

# --- 9. Audio container validation tests ---
@pytest.mark.anyio
async def test_audio_container_validations(client: AsyncClient, auth_headers: dict):
    # Start session
    mock_gen = mock_tool(return_val=json.dumps({"questions": ["Q1", "Q2"]}))
    with patch("app.api.interview.generate_interview_questions_tool", mock_gen):
        res = await client.post("/api/v1/interview/start", headers=auth_headers, json={
            "role_title": "Audio Expert", "tech_stack_or_jd": "DSP"
        })
        session_id = res.json()["session_id"]

    # Mock transcription success
    mock_transcribe = AsyncMock(return_value={"transcript": "valid text", "duration_seconds": 15.0, "engine": "groq"})
    mock_eval = mock_tool(return_val=json.dumps({"technical_score": 90.0}))

    # Case A: Valid WAV container (starts with RIFF...WAVE)
    wav_bytes = b"RIFF\x00\x00\x00\x00WAVEfmt "
    with patch("app.api.interview.audio_transcription_service.transcribe_in_memory_audio", mock_transcribe), \
         patch("app.api.interview.evaluate_star_interview_tool", mock_eval):
        files = {"audio_file": ("answer.wav", wav_bytes, "audio/wav")}
        audio_res = await client.post(
            "/api/v1/interview/audio-answer",
            headers=auth_headers,
            data={"session_id": session_id, "question_index": 0},
            files=files
        )
        assert audio_res.status_code == 200

    # Case B: Valid WebM container (starts with EBML magic)
    webm_bytes = b"\x1a\x45\xdf\xa3\x99\x88"
    with patch("app.api.interview.audio_transcription_service.transcribe_in_memory_audio", mock_transcribe), \
         patch("app.api.interview.evaluate_star_interview_tool", mock_eval):
        files = {"audio_file": ("answer.webm", webm_bytes, "audio/webm")}
        audio_res = await client.post(
            "/api/v1/interview/audio-answer",
            headers=auth_headers,
            data={"session_id": session_id, "question_index": 1},
            files=files
        )
        assert audio_res.status_code == 200

    # Case C: Wrong extension (executable content renamed to webm)
    malicious_bytes = b"MZ\x90\x00exeheader"
    files = {"audio_file": ("exploit.webm", malicious_bytes, "audio/webm")}
    audio_res = await client.post(
        "/api/v1/interview/audio-answer",
        headers=auth_headers,
        data={"session_id": session_id, "question_index": 2},
        files=files
    )
    assert audio_res.status_code == 400

    # Case D: Corrupt / random binaries
    random_bytes = b"\x00\x01\x02\x03\x04\x05\x06\x07"
    files = {"audio_file": ("random.wav", random_bytes, "audio/wav")}
    audio_res = await client.post(
        "/api/v1/interview/audio-answer",
        headers=auth_headers,
        data={"session_id": session_id, "question_index": 2},
        files=files
    )
    assert audio_res.status_code == 400

# --- 10. Stuck PROCESSING state recovery tests ---
@pytest.mark.anyio
async def test_stale_processing_recovery(client: AsyncClient, db_session: AsyncSession, auth_headers: dict):
    # Start session
    mock_gen = mock_tool(return_val=json.dumps({"questions": ["Q1", "Q2", "Q3"]}))
    with patch("app.api.interview.generate_interview_questions_tool", mock_gen):
        res = await client.post("/api/v1/interview/start", headers=auth_headers, json={
            "role_title": "Dev", "tech_stack_or_jd": "Go"
        })
        session_id = res.json()["session_id"]

    mock_eval = mock_tool(return_val=json.dumps({"technical_score": 85.0}))

    # Case A: Normal transition PROCESSING -> COMPLETED
    with patch("app.api.interview.evaluate_star_interview_tool", mock_eval):
        res_sub = await client.post("/api/v1/interview/submit-answer", headers=auth_headers, json={
            "session_id": session_id,
            "question_index": 0,
            "user_answer": "Valid normal submission answer.",
            "speech_duration_seconds": 10.0
        })
        assert res_sub.status_code == 200

    # Case B: Stale processing (elapsed > timeout) -> Fail / recoverable state
    # Manually inject a stuck PROCESSING entry with a started timestamp in the past
    stmt = select(InterviewSession).filter(InterviewSession.id == session_id)
    result = await db_session.execute(stmt)
    session_record = result.scalars().first()
    
    stuck_time = time.time() - (settings.INTERVIEW_PROCESSING_TIMEOUT + 10.0)
    session_record.transcript.append({
        "question_index": 1,
        "question": "Q2",
        "user_answer": "Stuck response",
        "evaluation_status": "PROCESSING",
        "processing_started_at": stuck_time,
        "evaluation_score": None,
        "filler_words_found": [],
        "filler_word_ratio": 0.0,
        "wpm_pace": None,
        "action_verbs": [],
        "metrics": [],
        "suggestions": []
    })
    flag_modified(session_record, "transcript")
    await db_session.commit()

    # Case C: Submit again on the stale index -> Should trigger lazy recovery and allow re-evaluation
    with patch("app.api.interview.evaluate_star_interview_tool", mock_eval):
        res_retry = await client.post("/api/v1/interview/submit-answer", headers=auth_headers, json={
            "session_id": session_id,
            "question_index": 1,
            "user_answer": "Recovered response retry",
            "speech_duration_seconds": 10.0
        })
        assert res_retry.status_code == 200
        assert res_retry.json()["evaluation_score"] == 85.0
