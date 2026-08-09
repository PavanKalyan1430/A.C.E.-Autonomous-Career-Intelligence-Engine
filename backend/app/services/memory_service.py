from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Dict, Any, Optional

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

    async def search_relevant_memories(
        self, db: AsyncSession, user_id: int, query: str, top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Uses SentenceTransformers dense vector embeddings to compute Cosine Distance 
        and rank user memories by semantic relevance to the current query.
        """
        from app.services.nlp_service import production_nlp_service
        
        all_memories = await self.get_all_user_memories(db, user_id)
        if not all_memories:
            return []

        scored_memories = []
        for mem in all_memories:
            sim_res = production_nlp_service.compute_semantic_similarity(query, mem.memory_text)
            scored_memories.append({
                "id": mem.id,
                "category": mem.category,
                "memory_text": mem.memory_text,
                "relevance_score": sim_res["cosine_similarity_score"],
                "match_percentage": sim_res["match_percentage"]
            })

        scored_memories.sort(key=lambda x: x["relevance_score"], reverse=True)
        return scored_memories[:top_k]

memory_service = MemoryService()
