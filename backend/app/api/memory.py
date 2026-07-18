from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import List, Dict, Any

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.services.memory_service import MemoryService

router = APIRouter(prefix="/memory", tags=["memory"])
memory_service = MemoryService()

class MemoryCreate(BaseModel):
    category: str
    memory_text: str
    meta_data: Dict[str, Any] = None

class MemoryResponse(BaseModel):
    id: int
    category: str
    memory_text: str
    meta_data: Dict[str, Any]

    class Config:
        from_attributes = True

@router.post("/", response_model=MemoryResponse)
async def create_memory(
    payload: MemoryCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    mem = await memory_service.add_memory(
        db, current_user.id, payload.category, payload.memory_text, payload.meta_data
    )
    return mem

@router.get("/", response_model=List[MemoryResponse])
async def get_all_memories(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await memory_service.get_all_user_memories(db, current_user.id)
