import datetime
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Dict, Any, Optional

from app.models.user import UserMemory

logger = logging.getLogger(__name__)

class MemoryService:
    async def add_memory(
        self, db: AsyncSession, user_id: int, category: str, memory_text: str, meta_data: Dict[str, Any] = None
    ) -> UserMemory:
        if not memory_text or not memory_text.strip():
            raise ValueError("Memory text cannot be empty or whitespace.")
        if not category or not category.strip():
            raise ValueError("Category cannot be empty or whitespace.")

        category = category.strip()
        memory_text = memory_text.strip()
        meta_data = meta_data or {}

        try:
            # 1. Retrieve existing memories in the same category for deduplication
            existing_memories = await self.get_memories_by_category(db, user_id, category)
            from app.services.nlp_service import production_nlp_service

            for mem in existing_memories:
                # Exact text match (case-insensitive and stripped)
                if mem.memory_text.strip().lower() == memory_text.lower():
                    mem.meta_data = {**(mem.meta_data or {}), **meta_data}
                    mem.created_at = datetime.datetime.utcnow()
                    await db.commit()
                    await db.refresh(mem)
                    return mem

                # Semantic duplicate check (cosine similarity >= 0.85)
                try:
                    sim_res = await production_nlp_service.compute_semantic_similarity(memory_text, mem.memory_text)
                    if sim_res.get("cosine_similarity_score", 0.0) >= 0.85:
                        mem.memory_text = memory_text
                        mem.meta_data = {**(mem.meta_data or {}), **meta_data}
                        mem.created_at = datetime.datetime.utcnow()
                        await db.commit()
                        await db.refresh(mem)
                        return mem
                except Exception as e:
                    logger.error(f"Failed semantic duplicate check in add_memory: {e}")

            # 2. If no duplicate found, insert new memory
            db_memory = UserMemory(
                user_id=user_id,
                category=category,
                memory_text=memory_text,
                meta_data=meta_data
            )
            db.add(db_memory)
            await db.commit()
            await db.refresh(db_memory)
            return db_memory
        except Exception as e:
            await db.rollback()
            raise e

    async def update_memory(
        self, db: AsyncSession, user_id: int, memory_id: int, category: str, memory_text: str, meta_data: Dict[str, Any] = None
    ) -> Optional[UserMemory]:
        if not memory_text or not memory_text.strip():
            raise ValueError("Memory text cannot be empty or whitespace.")
        if not category or not category.strip():
            raise ValueError("Category cannot be empty or whitespace.")

        try:
            result = await db.execute(
                select(UserMemory).filter(UserMemory.id == memory_id)
            )
            db_memory = result.scalars().first()
            if not db_memory:
                return None
            if db_memory.user_id != user_id:
                raise PermissionError("Not authorized to update this memory.")

            db_memory.category = category.strip()
            db_memory.memory_text = memory_text.strip()
            db_memory.meta_data = meta_data or {}
            db_memory.created_at = datetime.datetime.utcnow()
            await db.commit()
            await db.refresh(db_memory)
            return db_memory
        except Exception as e:
            await db.rollback()
            raise e

    async def delete_memory(self, db: AsyncSession, user_id: int, memory_id: int) -> bool:
        try:
            result = await db.execute(
                select(UserMemory).filter(UserMemory.id == memory_id)
            )
            db_memory = result.scalars().first()
            if not db_memory:
                return False
            if db_memory.user_id != user_id:
                raise PermissionError("Not authorized to delete this memory.")

            await db.delete(db_memory)
            await db.commit()
            return True
        except Exception as e:
            await db.rollback()
            raise e

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
        
        try:
            all_memories = await self.get_all_user_memories(db, user_id)
        except Exception as e:
            logger.error(f"Error retrieving memories in search_relevant_memories: {e}")
            return []

        if not all_memories:
            return []

        scored_memories = []
        for mem in all_memories:
            if not mem.memory_text:
                continue
            try:
                sim_res = await production_nlp_service.compute_semantic_similarity(query, mem.memory_text)
                score = sim_res.get("cosine_similarity_score", 0.0)
                match_pct = sim_res.get("match_percentage", 0.0)
            except Exception as e:
                logger.error(f"Semantic similarity match failed in search: {e}")
                # Safe fallback using keyword overlap/containment
                query_lower = query.lower()
                mem_text_lower = mem.memory_text.lower()
                if query_lower in mem_text_lower or any(word in mem_text_lower for word in query_lower.split() if len(word) > 3):
                    score = 0.5
                    match_pct = 50.0
                else:
                    score = 0.0
                    match_pct = 0.0

            scored_memories.append({
                "id": mem.id,
                "category": mem.category,
                "memory_text": mem.memory_text,
                "relevance_score": score,
                "match_percentage": match_pct
            })

        scored_memories.sort(key=lambda x: x["relevance_score"], reverse=True)
        return scored_memories[:top_k]

memory_service = MemoryService()

