import json
import logging
import os
import time
from typing import List, Dict, Any, Optional
from collections import defaultdict
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm.attributes import flag_modified

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.config import settings
from app.models.user import User, InterviewSession, InterviewFeedback
from app.schemas.interview import (
    InterviewStartRequest,
    InterviewStartResponse,
    AnswerSubmitRequest,
    AnswerSubmitResponse,
    InterviewFinishRequest,
    InterviewFinishResponse
)
from app.tools.interview_tools import generate_interview_questions_tool, evaluate_star_interview_tool
from app.services.nlp_service import production_nlp_service
from app.services.audio_service import audio_transcription_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/interview", tags=["interview"])

# --- InMemory Sliding Window Rate Limiter ---
class InMemoryRateLimiter:
    def __init__(self, requests_limit: int = 5, window_seconds: float = 60.0):
        self.requests_limit = requests_limit
        self.window_seconds = window_seconds
        self.history = defaultdict(list)

    def is_rate_limited(self, user_id: int) -> bool:
        now = time.time()
        self.history[user_id] = [t for t in self.history[user_id] if now - t < self.window_seconds]
        if len(self.history[user_id]) >= self.requests_limit:
            return True
        self.history[user_id].append(now)
        return False

# Segregated rate limiters (increased for fluid development/usage)
text_limiter = InMemoryRateLimiter(requests_limit=60, window_seconds=60.0)
audio_limiter = InMemoryRateLimiter(requests_limit=30, window_seconds=60.0)

async def check_rate_limit_text(current_user: User = Depends(get_current_user)):
    if not settings.RATE_LIMIT_ENABLED:
        return
    if text_limiter.is_rate_limited(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Maximum 15 text answer submissions per minute."
        )

async def check_rate_limit_audio(current_user: User = Depends(get_current_user)):
    if not settings.RATE_LIMIT_ENABLED:
        return
    if audio_limiter.is_rate_limited(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Maximum 10 audio answer submissions per minute."
        )

def validate_audio_container(audio_bytes: bytes, filename: str) -> bool:
    if len(audio_bytes) < 4:
        return False
    ext = os.path.splitext(filename)[1].lower()
    if ext == ".wav":
        return len(audio_bytes) >= 12 and audio_bytes.startswith(b"RIFF") and audio_bytes[8:12] == b"WAVE"
    elif ext == ".webm":
        return audio_bytes.startswith(b"\x1a\x45\xdf\xa3")
    elif ext == ".mp3":
        return audio_bytes.startswith(b"ID3") or (audio_bytes[0] == 0xFF and (audio_bytes[1] & 0xE0) == 0xE0)
    elif ext == ".ogg":
        return audio_bytes.startswith(b"OggS")
    elif ext == ".m4a":
        return audio_bytes[4:8] == b"ftyp"
    return False

@router.post("/start", response_model=InterviewStartResponse)
async def start_interview_session(
    payload: InterviewStartRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    tech_context = payload.tech_stack_or_jd or f"{payload.role_title} engineering domain"
    difficulty = payload.difficulty or "Medium"
    exp_level = payload.experience_level or "Entry Level"
    num_questions = payload.num_questions or 3
    
    t0 = time.time()
    # Generate dynamic questions via LLM
    questions_json_str = await generate_interview_questions_tool.ainvoke({
        "role_title": payload.role_title,
        "tech_stack_or_jd": tech_context,
        "difficulty": difficulty,
        "experience_level": exp_level,
        "num_questions": num_questions,
        "company_name": payload.company_name
    })

    llm_latency = round(time.time() - t0, 3)
    logger.info(f"LLM question generation latency: {llm_latency}s")
    
    try:
        q_data = json.loads(questions_json_str)
        questions = q_data.get("questions", [])
        if not questions or not isinstance(questions, list) or len(questions) == 0:
            raise ValueError("No valid questions returned from generation tool")
    except Exception as e:
        logger.error(f"Failed to generate interview questions via LLM: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to generate dynamic interview questions from LLM. Please try again."
        )

    session = InterviewSession(
        user_id=current_user.id,
        role_title=payload.role_title,
        company_name=payload.company_name,
        questions=questions,
        current_question_index=0,
        transcript=[],
        feedback={"difficulty": difficulty, "experience_level": exp_level},
        is_completed=False
    )

    db.add(session)
    await db.commit()
    await db.refresh(session)

    return InterviewStartResponse(
        session_id=session.id,
        role_title=session.role_title,
        company_name=session.company_name,
        questions=session.questions,
        created_at=session.created_at
    )


@router.post("/submit-answer", response_model=AnswerSubmitResponse, dependencies=[Depends(check_rate_limit_text)])
async def submit_interview_answer(
    payload: AnswerSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    t_start = time.time()
    
    # 1. Fetch session and perform ownership / validation checks
    # Use with_for_update() to lock the session row to prevent race conditions on concurrent retries
    result = await db.execute(
        select(InterviewSession)
        .filter(InterviewSession.id == payload.session_id, InterviewSession.user_id == current_user.id)
        .with_for_update()
    )
    session = result.scalars().first()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found.")

    if session.is_completed:
        raise HTTPException(
            status_code=400,
            detail="Cannot submit answer. This interview session is already completed."
        )

    # 2. Check Idempotency (Existing transcript items)
    existing_entry = None
    transcript_list = list(session.transcript) if session.transcript else []
    for entry in transcript_list:
        if entry.get("question_index") == payload.question_index:
            existing_entry = entry
            break

    if existing_entry:
        status_val = existing_entry.get("evaluation_status")
        if status_val == "COMPLETED":
            return AnswerSubmitResponse(
                session_id=session.id,
                question_index=payload.question_index,
                evaluation_score=existing_entry.get("evaluation_score"),
                action_verbs_detected=existing_entry.get("action_verbs"),
                quantifiable_metrics=existing_entry.get("metrics"),
                filler_words_detected=existing_entry.get("filler_words_found"),
                filler_word_ratio=existing_entry.get("filler_word_ratio"),
                wpm_speech_pace=existing_entry.get("wpm_pace"),
                suggestions=existing_entry.get("suggestions", [])
            )
        elif status_val == "PROCESSING":
            started_at = existing_entry.get("processing_started_at")
            if started_at and (time.time() - started_at > settings.INTERVIEW_PROCESSING_TIMEOUT):
                logger.warning(
                    f"Session {session.id} index {payload.question_index} stuck in PROCESSING since {started_at}. Recovering..."
                )
                existing_entry["evaluation_status"] = "FAILED"
                existing_entry["failure_reason"] = "Processing timeout exceeded"
                flag_modified(session, "transcript")
            else:
                raise HTTPException(status_code=409, detail="Answer is currently being evaluated.")
        # FAILED status will allow re-attempts

    # 3. Enforce sequential state transitions
    if payload.question_index != session.current_question_index:
        raise HTTPException(
            status_code=400,
            detail=f"Out of order answer submission. Expected index {session.current_question_index}, but received {payload.question_index}."
        )

    authoritative_question = session.questions[payload.question_index]
    answer_text = payload.user_answer.strip()
    words = answer_text.split()
    total_words = len(words)

    # Extract POS/linguistic traits
    linguistic_res = await production_nlp_service.extract_linguistic_features(answer_text)
    raw_entities = linguistic_res.get("extracted_entities", [])
    interjections_found = [ent["text"] for ent in raw_entities if ent.get("label") in ["INTJ", "DISCOURSE"]]
    
    filler_count = len(interjections_found)
    filler_word_ratio = round(float(filler_count / max(total_words, 1)), 4)

    wpm_pace = None
    if payload.speech_duration_seconds and payload.speech_duration_seconds > 0:
        wpm_pace = round(float((total_words / payload.speech_duration_seconds) * 60), 1)

    # Write transition state (PROCESSING) and close connection
    if existing_entry:
        existing_entry["evaluation_status"] = "PROCESSING"
        existing_entry["processing_started_at"] = time.time()
        existing_entry["user_answer"] = answer_text
        existing_entry["filler_words_found"] = interjections_found
        existing_entry["filler_word_ratio"] = filler_word_ratio
        existing_entry["wpm_pace"] = wpm_pace
        flag_modified(session, "transcript")
    else:
        qa_entry = {
            "question_index": payload.question_index,
            "question": authoritative_question,
            "user_answer": answer_text,
            "evaluation_status": "PROCESSING",
            "processing_started_at": time.time(),
            "evaluation_score": None,
            "filler_words_found": interjections_found,
            "filler_word_ratio": filler_word_ratio,
            "wpm_pace": wpm_pace,
            "action_verbs": [],
            "metrics": [],
            "suggestions": []
        }
        transcript_list.append(qa_entry)
        session.transcript = transcript_list
        flag_modified(session, "transcript")

    db.add(session)
    await db.commit()
    await db.refresh(session)
    db_latency = round(time.time() - t_start, 3)

    # --- DATABASE TRANSACTION FULLY RELEASED ---

    # 4. Invoke LLM Evaluation outside Postgres transaction context
    session_difficulty = "Medium"
    session_exp = "Entry Level"
    if isinstance(session.feedback, dict):
        if session.feedback.get("difficulty"):
            session_difficulty = session.feedback.get("difficulty")
        if session.feedback.get("experience_level"):
            session_exp = session.feedback.get("experience_level")

    t_llm = time.time()
    llm_error = None
    eval_res_json = None
    
    if answer_text == "Skipped by candidate (No response provided)":
        eval_res_json = json.dumps({
            "technical_score": 0,
            "strengths": "None",
            "weaknesses": "Question was skipped by candidate.",
            "star_coverage_assessment": "No response provided.",
            "improvement_suggestions": ["Review the core concepts related to this topic."]
        })
    else:
        try:
            eval_res_json = await evaluate_star_interview_tool.ainvoke({
                "question": authoritative_question,
                "user_answer": answer_text,
                "role_title": session.role_title,
                "difficulty": session_difficulty,
                "experience_level": session_exp
            })
        except Exception as e:
            llm_error = f"LLM evaluation failed: {e}"
            logger.error(llm_error)



    llm_latency = round(time.time() - t_llm, 3)

    # --- ACQUIRE FRESH TRANSACTION TO PERSIST RESULTS ---
    t_db2 = time.time()
    result = await db.execute(
        select(InterviewSession)
        .filter(InterviewSession.id == payload.session_id, InterviewSession.user_id == current_user.id)
        .with_for_update()
    )
    session = result.scalars().first()

    target_entry = None
    for entry in session.transcript:
        if entry.get("question_index") == payload.question_index:
            target_entry = entry
            break

    score = None
    action_verbs = linguistic_res.get("action_verbs", [])
    metrics = linguistic_res.get("quantifiable_metrics", [])
    suggestions = []
    
    if filler_word_ratio > 0.05:
        suggestions.append(f"Verbal hesitation ratio detected at {round(filler_word_ratio*100, 1)}%. Practice silent pauses.")
    if wpm_pace and (wpm_pace < 110 or wpm_pace > 180):
        suggestions.append(f"Speaking rate is {wpm_pace} WPM. Optimal technical interview pace is 120-150 WPM.")
    if not metrics:
        suggestions.append("Include quantifiable impact figures (e.g. latency reductions, scale metrics).")

    eval_status = "COMPLETED"
    if llm_error or not eval_res_json:
        eval_status = "FAILED"
    else:
        try:
            eval_data = json.loads(eval_res_json)
            # Schema structure validation
            if not isinstance(eval_data, dict) or ("technical_score" not in eval_data and "evaluation_score" not in eval_data):
                raise ValueError("Malformed LLM response schema")
            
            score_raw = eval_data.get("technical_score") or eval_data.get("evaluation_score")
            score = float(score_raw) if score_raw is not None else None
            if score is not None and not (0.0 <= score <= 100.0):
                raise ValueError("Evaluation score must be between 0 and 100")

            action_verbs = eval_data.get("nlp_action_verbs_detected", action_verbs)
            metrics = eval_data.get("nlp_quantifiable_metrics", metrics)
            if "improvement_suggestions" in eval_data:
                suggestions.extend(eval_data["improvement_suggestions"])
        except Exception as e:
            eval_status = "FAILED"
            llm_error = f"LLM output validation error: {e}"
            logger.error(llm_error)

    target_entry["evaluation_status"] = eval_status
    target_entry["evaluation_score"] = score
    target_entry["action_verbs"] = action_verbs
    target_entry["metrics"] = metrics
    target_entry["suggestions"] = suggestions
    if llm_error:
        target_entry["failure_reason"] = llm_error

    flag_modified(session, "transcript")

    if eval_status == "COMPLETED":
        session.current_question_index = payload.question_index + 1

    db.add(session)
    await db.commit()
    await db.refresh(session)
    db_latency += round(time.time() - t_db2, 3)

    # Observability structured logs
    total_latency = round(time.time() - t_start, 3)
    logger.info(
        f"[OBSERVABILITY] session_id={session.id} user_id={current_user.id} "
        f"question_index={payload.question_index} status={eval_status} "
        f"db_latency={db_latency}s llm_latency={llm_latency}s total_latency={total_latency}s"
    )

    if eval_status == "FAILED":
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Evaluation failed: {llm_error}. Your response was saved. Please re-submit to retry."
        )

    return AnswerSubmitResponse(
        session_id=session.id,
        question_index=payload.question_index,
        evaluation_score=score,
        action_verbs_detected=action_verbs,
        quantifiable_metrics=metrics,
        filler_words_detected=interjections_found,
        filler_word_ratio=filler_word_ratio,
        wpm_speech_pace=wpm_pace,
        suggestions=suggestions
    )

@router.post("/audio-answer", response_model=AnswerSubmitResponse, dependencies=[Depends(check_rate_limit_audio)])
async def submit_audio_interview_answer(
    session_id: int = Form(...),
    question_index: int = Form(...),
    audio_file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    t_start = time.time()

    # 1. Enforce strict whitelisted file type extensions and MIME types
    filename = audio_file.filename or "speech.webm"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in settings.ALLOWED_AUDIO_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file extension '{ext}'. Whitelisted: {settings.ALLOWED_AUDIO_EXTENSIONS}"
        )

    # 2. Enforce file size limit checks to prevent memory depletion
    content_length = audio_file.headers.get("content-length")
    if content_length and int(content_length) > settings.MAX_AUDIO_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"Audio file size exceeds limit of {settings.MAX_AUDIO_SIZE_BYTES} bytes."
        )

    audio_bytes = await audio_file.read()
    if len(audio_bytes) > settings.MAX_AUDIO_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"Audio file size exceeds limit of {settings.MAX_AUDIO_SIZE_BYTES} bytes."
        )

    # 3. Validate real audio magic bytes / container
    if not validate_audio_container(audio_bytes, filename):
        del audio_bytes
        raise HTTPException(
            status_code=400,
            detail="Audio file verification failed. Invalid or corrupt audio container signature."
        )

    # 4. Transcribe speech audio in-memory
    t_stt = time.time()
    stt_res = await audio_transcription_service.transcribe_in_memory_audio(
        audio_bytes,
        filename=filename,
        mime_type=audio_file.content_type or "audio/webm"
    )
    stt_latency = round(time.time() - t_stt, 3)

    transcript_text = stt_res.get("transcript", "").strip()
    duration_sec = stt_res.get("duration_seconds", 0.0)

    # Enforce maximum duration limits
    if duration_sec > settings.MAX_AUDIO_DURATION_SECONDS:
        del audio_bytes
        raise HTTPException(
            status_code=400,
            detail=f"Audio duration {duration_sec}s exceeds threshold limit of {settings.MAX_AUDIO_DURATION_SECONDS}s."
        )

    # Release file memory early
    del audio_bytes

    if stt_res.get("engine") == "failed" or not transcript_text:
        raise HTTPException(
            status_code=502,
            detail="Speech to text transcription failed or returned empty transcript."
        )

    logger.info(f"[OBSERVABILITY] STT completed. engine={stt_res.get('engine')} latency={stt_latency}s")

    # 5. Delegate parsed text to transaction-decoupled evaluator
    payload = AnswerSubmitRequest(
        session_id=session_id,
        question_index=question_index,
        user_answer=transcript_text,
        speech_duration_seconds=duration_sec
    )
    return await submit_interview_answer(payload, current_user, db)

@router.post("/finish", response_model=InterviewFinishResponse)
async def finish_interview_session(
    payload: InterviewFinishRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(InterviewSession)
        .filter(InterviewSession.id == payload.session_id, InterviewSession.user_id == current_user.id)
    )
    session = result.scalars().first()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found.")

    if session.is_completed:
        raise HTTPException(
            status_code=400,
            detail="Cannot finish session. This interview session is already completed."
        )

    transcript = session.transcript or []
    valid_scores = [entry.get("evaluation_score") for entry in transcript if entry.get("evaluation_score") is not None]
    if valid_scores:
        avg_score = round(float(sum(valid_scores) / len(valid_scores)), 1)
    else:
        avg_score = 0.0

    session.is_completed = True
    session.feedback = {"overall_score": avg_score, "questions_answered": len(transcript)}
    
    areas_to_improve = []
    
    if avg_score > 0 and avg_score < 70.0:
        areas_to_improve.append("Technical Accuracy & Depth")

    all_metrics = [m for entry in transcript for m in entry.get("metrics", [])]
    if not all_metrics:
        areas_to_improve.append("Quantifiable Metric Density")
    
    all_fillers = [f for entry in transcript for f in entry.get("filler_words_found", [])]
    if all_fillers:
        areas_to_improve.append("Verbal Hesitation Ratio")

    all_wpm = [entry.get("wpm_pace") for entry in transcript if entry.get("wpm_pace") is not None]
    if all_wpm:
        avg_wpm = sum(all_wpm) / len(all_wpm)
        if avg_wpm < 110 or avg_wpm > 180:
            areas_to_improve.append("Speaking Pace & Delivery")
    # Extract dynamic feedback suggestions from transcript evaluation results
    for entry in transcript:
        suggestions = entry.get("suggestions", [])
        for surg in suggestions:
            if surg and surg not in areas_to_improve:
                areas_to_improve.append(surg)



    feedback_record = InterviewFeedback(
        user_id=current_user.id,
        session_id=session.id,
        overall_score=int(avg_score),
        strengths=f"Completed {len(transcript)} technical evaluation questions for {session.role_title}.",
        weakness_areas=areas_to_improve,
        improvements=[f"Focus on strengthening {area}" for area in areas_to_improve]
    )
    db.add(session)
    db.add(feedback_record)
    await db.commit()

    return InterviewFinishResponse(
        session_id=session.id,
        overall_score=avg_score,
        strengths=feedback_record.strengths,
        areas_for_improvement=feedback_record.improvements,
        is_completed=True
    )
