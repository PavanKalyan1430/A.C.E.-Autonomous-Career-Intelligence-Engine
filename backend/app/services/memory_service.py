from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Dict, Any

from app.models.user import UserMemory

class MemoryService:
    async def add_memory(
        self, db: AsyncSession, user_id: int, category: str, memory_text: str, meta_data: Dict[str, Any] = None
    ) -> UserMemory:
        db_memory = UserMemory(
            user_id=user_id,
            category=category,
            memory_text=memory_text,
            meta_data=meta_data or {}
        )
        db.add(db_memory)
        await db.commit()
        await db.refresh(db_memory)
        return db_memory

    async def get_memories_by_category(
        self, db: AsyncSession, user_id: int, category: str
    ) -> List[UserMemory]:
        result = await db.execute(
            select(UserMemory)
            .filter(UserMemory.user_id == user_id, UserMemory.category == category)
            .order_by(UserMemory.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_all_user_memories(self, db: AsyncSession, user_id: int) -> List[UserMemory]:
        result = await db.execute(
            select(UserMemory)
            .filter(UserMemory.user_id == user_id)
            .order_by(UserMemory.created_at.desc())
        )
        return list(result.scalars().all())
