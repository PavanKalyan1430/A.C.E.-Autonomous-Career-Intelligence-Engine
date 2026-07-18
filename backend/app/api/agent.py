from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
from typing import List, Dict, Any

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User, Resume
from app.agents.orchestrator import agent_app

router = APIRouter(prefix="/agent", tags=["agent"])

class QueryRequest(BaseModel):
    message: str

class QueryResponse(BaseModel):
    response: str
    current_agent: str

@router.post("/query", response_model=QueryResponse)
async def query_agent(
    payload: QueryRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Fetch user's latest resume data if any
    result = await db.execute(
        select(Resume)
        .filter(Resume.user_id == current_user.id)
        .order_by(Resume.created_at.desc())
    )
    resume = result.scalars().first()
    resume_data = resume.parsed_data if resume else {}
    
    # Initialize graph state
    initial_state = {
        "messages": [{"role": "user", "content": payload.message}],
        "user_id": current_user.id,
        "resume_data": resume_data,
        "company_data": {},
        "roadmap_data": {},
        "interview_data": {},
        "current_agent": "orchestrator",
        "next_step": ""
    }
    
    try:
        # Run graph execution
        final_state = await agent_app.ainvoke(initial_state)
        
        # Get last message response
        messages = final_state.get("messages", [])
        response_content = (
            messages[-1].get("content", "I am not sure how to assist with that query.")
            if messages else "No response generated."
        )
        
        return QueryResponse(
            response=response_content,
            current_agent=final_state.get("current_agent", "orchestrator")
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Orchestrator error: {str(e)}")
