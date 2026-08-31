import asyncio
import json
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

from app.core.config import settings
from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User, Resume, ChatSession, ChatMessage
from app.schemas.chat import ChatSessionResponse, ChatSessionHeaderResponse, ChatMessageResponse
from app.agents.orchestrator import agent_executor
from app.services.nlp_service import production_nlp_service
from app.services.memory_service import memory_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/agent", tags=["agent"])

class QueryRequest(BaseModel):
    message: str
    session_id: Optional[int] = None

class QueryResponse(BaseModel):
    session_id: int
    response: str
    current_agent: str
    meta_data: Optional[Dict[str, Any]] = None

@router.post("/query", response_model=QueryResponse)
async def query_agent(
    payload: QueryRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    from app.core.config import tool_calls_counter
    tool_calls_counter.set({"count": 0})

    # 1. Retrieve or create ChatSession
    if payload.session_id:
        result = await db.execute(
            select(ChatSession)
            .filter(ChatSession.id == payload.session_id, ChatSession.user_id == current_user.id)
            .options(selectinload(ChatSession.messages))
        )
        session = result.scalars().first()
        if not session:
            raise HTTPException(status_code=404, detail="Chat session not found")
    else:
        title_snippet = payload.message[:30] + "..." if len(payload.message) > 30 else payload.message
        session = ChatSession(user_id=current_user.id, title=title_snippet)
        db.add(session)
        await db.commit()
        await db.refresh(session)

    # 2. Save user message to database
    user_msg = ChatMessage(
        session_id=session.id,
        role="user",
        content=payload.message,
        agent_name="user"
    )
    db.add(user_msg)
    await db.commit()

    # 3. Vector RAG Search: Retrieve user's relevant stored memories
    relevant_memories = await memory_service.search_relevant_memories(db, current_user.id, payload.message, top_k=3)
    memory_context_str = ""
    if relevant_memories:
        mem_lines = [f"- [{m['category']}] {m['memory_text']}" for m in relevant_memories]
        memory_context_str = "\n[User Personal Memory Context]:\n" + "\n".join(mem_lines)

    # Retrieve user's Career Intelligence context using the lightweight profile only.
    # We intentionally use `get_canonical_candidate_profile` (DB-only, no LLM calls) rather
    # than `generate_career_intelligence` (which runs a full ATS + LLM synthesis) so that:
    #   1. We don't consume LLM quota / mocks set up for the agent itself.
    #   2. We avoid triggering SQLAlchemy async greenlet issues in test contexts.
    # The agent's own tools (compute_topological_skill_gap_tool, retrieve_user_memory_tool)
    # handle deeper analysis on demand during reasoning.
    career_context_str = ""
    try:
        from app.services.career_intelligence import career_intelligence_service
        candidate_profile = await career_intelligence_service.get_canonical_candidate_profile(
            current_user.id, db
        )
        if candidate_profile and candidate_profile.get("target_role"):
            verified_skills = candidate_profile.get("verified_skills", [])
            weak_areas = candidate_profile.get("weak_areas", [])
            avg_score = candidate_profile.get("average_interview_score", 0.0)
            interview_count = candidate_profile.get("interview_history_count", 0)

            career_context_str = (
                f"\n[Candidate Career Profile]:\n"
                f"- Target Role: {candidate_profile.get('target_role')}\n"
                f"- Target Company: {candidate_profile.get('target_company') or 'None Specified'}\n"
                f"- Verified Skills: {', '.join(verified_skills)}\n"
                f"- Weak Areas (from mock interviews): {', '.join(weak_areas)}\n"
                f"- Mock Interview Sessions: {interview_count} completed, "
                f"avg score {avg_score}/100\n"
            )
    except Exception as e:
        logger.warning(f"Could not load career profile context for agent: {e}")

    # 4. Fetch past messages in session for multi-turn history context
    history_result = await db.execute(
        select(ChatMessage)
        .filter(ChatMessage.session_id == session.id)
        .order_by(ChatMessage.created_at.asc())
    )
    past_messages = history_result.scalars().all()
    message_history = []

    # Inject memory & career context if available (combined into a single system-context message)
    context_parts = []
    if memory_context_str:
        context_parts.append(memory_context_str)
    if career_context_str:
        context_parts.append(career_context_str)

    if context_parts:
        message_history.append({"role": "user", "content": "\n\n".join(context_parts)})

    for msg in past_messages:
        role = "user" if msg.role == "user" else "assistant"
        message_history.append({"role": role, "content": msg.content})

    # 5. Execute Dynamic ReAct Agent or Production NLP Engine
    response_content = ""
    current_agent = "autonomous_react_agent"
    error_metadata = {}

    if agent_executor:
        try:
            # Wrap in overall wall-clock execution timeout
            final_state = await asyncio.wait_for(
                agent_executor.ainvoke(
                    {"messages": message_history},
                    config={"recursion_limit": settings.AGENT_MAX_ITERATIONS}
                ),
                timeout=settings.AGENT_EXECUTION_TIMEOUT
            )
            messages = final_state.get("messages", [])
            if messages:
                last_msg = messages[-1]
                response_content = getattr(last_msg, "content", str(last_msg))
                if response_content == "Sorry, need more steps to process this request.":
                    from app.core.config import tool_calls_counter
                    tracker = tool_calls_counter.get()
                    count = tracker.get("count", 0) if tracker else 0
                    if count >= settings.AGENT_MAX_TOOL_CALLS:
                        response_content = "I couldn't complete that analysis because the agent exceeded its allocated tool call budget. Your resume and profile are safe. You can retry the analysis."
                        error_metadata = {
                            "status": "execution_limit_exceeded",
                            "error": "Agent tool call limit exceeded"
                        }
                    else:
                        response_content = "I couldn't complete that analysis because the agent execution iteration limit was exceeded. Your resume and profile are safe. You can retry the analysis."
                        error_metadata = {
                            "status": "execution_limit_exceeded",
                            "error": "Agent iteration limit exceeded"
                        }
            else:
                response_content = "No response generated by agent."
        except asyncio.TimeoutError:
            response_content = "I couldn't complete that analysis because the career intelligence service timed out. Your resume and profile are safe. You can retry the analysis."
            error_metadata = {
                "status": "execution_limit_exceeded",
                "error": "Agent execution timeout exceeded"
            }
        except ValueError as e:
            if "Agent tool call limit exceeded" in str(e):
                response_content = "I couldn't complete that analysis because the agent exceeded its allocated tool call budget. Your resume and profile are safe. You can retry the analysis."
                error_metadata = {
                    "status": "execution_limit_exceeded",
                    "error": "Agent tool call limit exceeded"
                }
            else:
                response_content = "I couldn't complete that analysis because of an validation failure. Your resume and profile are safe."
                error_metadata = {
                    "status": "execution_limit_exceeded",
                    "error": f"Agent validation failure: {str(e)}"
                }
        except Exception as e:
            err_name = type(e).__name__
            if "Agent tool call limit exceeded" in str(e):
                response_content = "I couldn't complete that analysis because the agent exceeded its allocated tool call budget. Your resume and profile are safe. You can retry the analysis."
                error_metadata = {
                    "status": "execution_limit_exceeded",
                    "error": "Agent tool call limit exceeded"
                }
            elif err_name == "GraphRecursionError" or "recursion limit" in str(e).lower() or "recursion" in err_name.lower():
                response_content = "I couldn't complete that analysis because the agent execution iteration limit was exceeded. Your resume and profile are safe. You can retry the analysis."
                error_metadata = {
                    "status": "execution_limit_exceeded",
                    "error": "Agent iteration limit exceeded"
                }
            else:
                err_msg = str(e)
                if "rate" in err_msg.lower() or "429" in err_msg or "quota" in err_msg.lower() or "resourceexhausted" in err_msg.lower():
                    response_content = "AI provider rate limit reached. Please try again in a few moments."
                    error_metadata = {
                        "status": "error",
                        "code": "provider_rate_limited",
                        "error": err_msg
                    }
                else:
                    response_content = "The career intelligence reasoning service is temporarily unavailable. Please retry."
                    error_metadata = {
                        "status": "error",
                        "code": "llm_unavailable",
                        "error": err_msg
                    }
    else:
        response_content = "AI agent service is not initialized."
        error_metadata = {
            "status": "error",
            "code": "llm_unavailable",
            "error": "AI agent service is not initialized."
        }

    # 6. Save assistant response to database
    assistant_msg = ChatMessage(
        session_id=session.id,
        role="assistant",
        content=response_content,
        agent_name=current_agent,
        meta_data=error_metadata
    )
    db.add(assistant_msg)
    await db.commit()

    return QueryResponse(
        session_id=session.id,
        response=response_content,
        current_agent=current_agent,
        meta_data=error_metadata if error_metadata else None
    )

@router.get("/sessions", response_model=List[ChatSessionHeaderResponse])
async def list_chat_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ChatSession)
        .filter(ChatSession.user_id == current_user.id)
        .order_by(ChatSession.updated_at.desc())
    )
    return list(result.scalars().all())

@router.get("/sessions/{session_id}", response_model=ChatSessionResponse)
async def get_chat_session_detail(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ChatSession)
        .filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
        .options(selectinload(ChatSession.messages))
    )
    session = result.scalars().first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chat_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ChatSession)
        .filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
    )
    session = result.scalars().first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    await db.delete(session)
    await db.commit()
