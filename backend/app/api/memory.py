from fastapi import APIRouter, Depends, HTTPException, status
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
    try:
        mem = await memory_service.add_memory(
            db, current_user.id, payload.category, payload.memory_text, payload.meta_data
        )
        return mem
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/", response_model=List[MemoryResponse])
async def get_all_memories(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await memory_service.get_all_user_memories(db, current_user.id)

@router.put("/{memory_id}", response_model=MemoryResponse)
async def update_memory(
    memory_id: int,
    payload: MemoryCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    try:
        mem = await memory_service.update_memory(
            db, current_user.id, memory_id, payload.category, payload.memory_text, payload.meta_data
        )
        if not mem:
            raise HTTPException(status_code=404, detail="Memory not found")
        return mem
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError:
        # Strict user isolation: return 404 to avoid leaking existence
        raise HTTPException(status_code=404, detail="Memory not found")

@router.delete("/{memory_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_memory(
    memory_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    try:
        success = await memory_service.delete_memory(db, current_user.id, memory_id)
        if not success:
            raise HTTPException(status_code=404, detail="Memory not found")
    except PermissionError:
        # Strict user isolation: return 404 to avoid leaking existence
        raise HTTPException(status_code=404, detail="Memory not found")

