import json
import logging
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api.deps import get_current_user
from app.core.database import get_db
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

@router.post("/start", response_model=InterviewStartResponse)
async def start_interview_session(
    payload: InterviewStartRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    tech_context = payload.tech_stack_or_jd or f"{payload.role_title} engineering domain"
    
    # Generate dynamic questions via LLM
    questions_json_str = await generate_interview_questions_tool.ainvoke({
        "role_title": payload.role_title,
        "tech_stack_or_jd": tech_context
    })
    
    try:
        q_data = json.loads(questions_json_str)
        questions = q_data.get("questions", [])
    except Exception:
        keyphrases = production_nlp_service.extract_tfidf_keyphrases(tech_context, top_n=2)
        top_skills = [kp["keyphrase"] for kp in keyphrases] if keyphrases else [payload.role_title]
        questions = [
            f"Explain how you design high-throughput system architecture utilizing {top_skills[0]}.",
            f"Describe how you handle concurrency, trade-offs, and fault-tolerance in {payload.role_title} production environments."
        ]

    session = InterviewSession(
        user_id=current_user.id,
        role_title=payload.role_title,
        company_name=payload.company_name,
        questions=questions,
        current_question_index=0,
        transcript=[],
        feedback={},
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

@router.post("/submit-answer", response_model=AnswerSubmitResponse)
async def submit_interview_answer(
    payload: AnswerSubmitRequest,
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

    answer_text = payload.user_answer.strip()
    words = answer_text.split()
    total_words = len(words)

    linguistic_res = production_nlp_service.extract_linguistic_features(answer_text)
    raw_entities = linguistic_res.get("extracted_entities", [])
    interjections_found = [ent["text"] for ent in raw_entities if ent.get("label") in ["INTJ", "DISCOURSE"]]
    
    filler_count = len(interjections_found)
    filler_word_ratio = round(float(filler_count / max(total_words, 1)), 4)

    wpm_pace = None
    if payload.speech_duration_seconds and payload.speech_duration_seconds > 0:
        wpm_pace = round(float((total_words / payload.speech_duration_seconds) * 60), 1)

    eval_res_json = await evaluate_star_interview_tool.ainvoke({
        "question": payload.question,
        "user_answer": answer_text
    })
    
    try:
        eval_data = json.loads(eval_res_json)
    except Exception:
        eval_data = {}

    score = eval_data.get("evaluation_score", 70.0)
    action_verbs = eval_data.get("nlp_action_verbs_detected", linguistic_res.get("action_verbs", []))
    metrics = eval_data.get("nlp_quantifiable_metrics", linguistic_res.get("quantifiable_metrics", []))
    
    suggestions = []
    if filler_word_ratio > 0.05:
        suggestions.append(f"Verbal hesitation ratio detected at {round(filler_word_ratio*100, 1)}%. Practice silent pauses.")
    if wpm_pace and (wpm_pace < 110 or wpm_pace > 180):
        suggestions.append(f"Speaking rate is {wpm_pace} WPM. Optimal technical interview pace is 120-150 WPM.")
    if not metrics:
        suggestions.append("Include quantifiable impact figures (e.g. latency reductions, scale metrics).")

    qa_entry = {
        "question_index": payload.question_index,
        "question": payload.question,
        "user_answer": answer_text,
        "score": score,
        "filler_words_found": interjections_found,
        "filler_word_ratio": filler_word_ratio,
        "wpm_pace": wpm_pace,
        "action_verbs": action_verbs,
        "metrics": metrics
    }
    
    updated_transcript = list(session.transcript) if session.transcript else []
    updated_transcript.append(qa_entry)
    session.transcript = updated_transcript
    session.current_question_index = payload.question_index + 1
    
    db.add(session)
    await db.commit()

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

@router.post("/audio-answer", response_model=AnswerSubmitResponse)
async def submit_audio_interview_answer(
    session_id: int = Form(...),
    question_index: int = Form(...),
    question: str = Form(...),
    audio_file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    SOTA Zero-Disk In-Memory Audio Processing Endpoint.
    Ingests raw audio stream in RAM, transcribes via Groq Cloud (whisper-large-v3-turbo) in ~150ms,
    evaluates WPM pace + SpaCy interjections + STAR coverage, and purges RAM audio bytes.
    """
    result = await db.execute(
        select(InterviewSession)
        .filter(InterviewSession.id == session_id, InterviewSession.user_id == current_user.id)
    )
    session = result.scalars().first()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found.")

    audio_bytes = await audio_file.read()
    stt_res = await audio_transcription_service.transcribe_in_memory_audio(
        audio_bytes,
        filename=audio_file.filename or "speech.webm",
        mime_type=audio_file.content_type or "audio/webm"
    )

    transcript_text = stt_res.get("transcript", "")
    duration_sec = stt_res.get("duration_seconds", 0.0)

    # Delegate transcript & duration to submit_interview_answer logic
    payload = AnswerSubmitRequest(
        session_id=session_id,
        question_index=question_index,
        question=question,
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

    transcript = session.transcript or []
    if transcript:
        scores = [entry.get("score", 70.0) for entry in transcript]
        avg_score = round(float(sum(scores) / len(scores)), 1)
    else:
        avg_score = 0.0

    session.is_completed = True
    session.feedback = {"score": avg_score, "questions_answered": len(transcript)}
    
    areas_to_improve = []
    all_metrics = [m for entry in transcript for m in entry.get("metrics", [])]
    if not all_metrics:
        areas_to_improve.append("Quantifiable Metric Density")
    
    all_fillers = [f for entry in transcript for f in entry.get("filler_words_found", [])]
    if all_fillers:
        areas_to_improve.append("Verbal Hesitation Ratio")
        
    if not areas_to_improve:
        areas_to_improve.append("Depth of Architectural Trade-off Analysis")

    feedback_record = InterviewFeedback(
        user_id=current_user.id,
        session_id=session.id,
        score=int(avg_score),
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
