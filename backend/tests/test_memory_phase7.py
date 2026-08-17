import pytest
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from unittest.mock import patch

from app.core.database import Base
from app.models.user import User, UserMemory
from app.services.memory_service import memory_service

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

@pytest.fixture
async def db_session():
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    async with async_session() as db:
        # Create test users
        u1 = User(id=101, email="user1@example.com", hashed_password="pw")
        u2 = User(id=102, email="user2@example.com", hashed_password="pw")
        db.add_all([u1, u2])
        await db.commit()
        
    async with async_session() as db:
        yield db

    await engine.dispose()

@pytest.mark.anyio
async def test_user_isolation(db_session):
    """Verify that every memory query is scoped to the authenticated user and no cross-user leak occurs."""
    # Add memory for User 1
    m1 = await memory_service.add_memory(
        db_session, user_id=101, category="preference", memory_text="I prefer remote work."
    )
    # Add memory for User 2
    m2 = await memory_service.add_memory(
        db_session, user_id=102, category="preference", memory_text="I prefer onsite work."
    )

    # Get memories for User 1
    mems_u1 = await memory_service.get_all_user_memories(db_session, user_id=101)
    assert len(mems_u1) == 1
    assert mems_u1[0].memory_text == "I prefer remote work."

    # Get memories for User 2
    mems_u2 = await memory_service.get_all_user_memories(db_session, user_id=102)
    assert len(mems_u2) == 1
    assert mems_u2[0].memory_text == "I prefer onsite work."

    # Search isolated
    search_u1 = await memory_service.search_relevant_memories(db_session, user_id=101, query="work style")
    assert len(search_u1) == 1
    assert search_u1[0]["memory_text"] == "I prefer remote work."

    search_u2 = await memory_service.search_relevant_memories(db_session, user_id=102, query="work style")
    assert len(search_u2) == 1
    assert search_u2[0]["memory_text"] == "I prefer onsite work."


@pytest.mark.anyio
async def test_exact_deduplication(db_session):
    """Verify that adding the exact same memory text under the same category updates metadata and does not duplicate."""
    # First insert
    m1 = await memory_service.add_memory(
        db_session, user_id=101, category="skill", memory_text="Proficient in Python.", meta_data={"source": "resume"}
    )
    # Second insert of exact text
    m2 = await memory_service.add_memory(
        db_session, user_id=101, category="skill", memory_text=" Proficient in Python. ", meta_data={"added": "manual"}
    )

    assert m1.id == m2.id
    mems = await memory_service.get_all_user_memories(db_session, user_id=101)
    assert len(mems) == 1
    assert mems[0].meta_data.get("source") == "resume"
    assert mems[0].meta_data.get("added") == "manual"


@pytest.mark.anyio
async def test_semantic_deduplication(db_session):
    """Verify that adding a highly semantically similar memory text updates the existing row."""
    # First insert
    m1 = await memory_service.add_memory(
        db_session, user_id=101, category="goal", memory_text="I want to learn Go language.", meta_data={"priority": "high"}
    )

    # Second insert (highly similar to first, similarity >= 0.85)
    m2 = await memory_service.add_memory(
        db_session, user_id=101, category="goal", memory_text="My goal is to learn Go language.", meta_data={"revised": True}
    )

    assert m1.id == m2.id
    mems = await memory_service.get_all_user_memories(db_session, user_id=101)
    assert len(mems) == 1
    assert mems[0].memory_text == "My goal is to learn Go language."
    assert mems[0].meta_data.get("priority") == "high"
    assert mems[0].meta_data.get("revised") is True


@pytest.mark.anyio
async def test_update_delete_ownership(db_session):
    """Verify update/delete ownership checks and user isolation."""
    # Add memory for User 1
    m1 = await memory_service.add_memory(
        db_session, user_id=101, category="weak_area", memory_text="Struggling with system design."
    )
    m1_id = m1.id

    # User 2 tries to update User 1's memory
    with pytest.raises(PermissionError):
        await memory_service.update_memory(
            db_session, user_id=102, memory_id=m1_id, category="weak_area", memory_text="Hacked."
        )

    # User 2 tries to delete User 1's memory
    with pytest.raises(PermissionError):
        await memory_service.delete_memory(db_session, user_id=102, memory_id=m1_id)

    # Ensure memory is unmodified and still exists for User 1
    mems = await memory_service.get_all_user_memories(db_session, user_id=101)
    assert len(mems) == 1
    assert mems[0].memory_text == "Struggling with system design."

    # User 1 successfully updates
    m1_updated = await memory_service.update_memory(
        db_session, user_id=101, memory_id=m1_id, category="weak_area", memory_text="Improving in system design."
    )
    assert m1_updated.memory_text == "Improving in system design."

    # User 1 successfully deletes
    deleted = await memory_service.delete_memory(db_session, user_id=101, memory_id=m1_id)
    assert deleted is True

    mems_after = await memory_service.get_all_user_memories(db_session, user_id=101)
    assert len(mems_after) == 0



@pytest.mark.anyio
async def test_empty_and_whitespace_inputs(db_session):
    """Verify adding empty or whitespace memory texts raises ValueError."""
    with pytest.raises(ValueError):
        await memory_service.add_memory(db_session, user_id=101, category="goal", memory_text="")

    with pytest.raises(ValueError):
        await memory_service.add_memory(db_session, user_id=101, category=" ", memory_text="valid text")


@pytest.mark.anyio
async def test_search_similarity_fallback(db_session):
    """Verify that search fallback works if the NLP semantic similarity service fails."""
    await memory_service.add_memory(
        db_session, user_id=101, category="skill", memory_text="Deep expertise in Kubernetes containers."
    )

    # Force compute_semantic_similarity to fail/raise Exception
    with patch("app.services.nlp_service.production_nlp_service.compute_semantic_similarity", side_effect=Exception("Model failed")):
        results = await memory_service.search_relevant_memories(db_session, user_id=101, query="Kubernetes")
        assert len(results) == 1
        assert results[0]["memory_text"] == "Deep expertise in Kubernetes containers."
        assert results[0]["relevance_score"] == 0.5
        assert results[0]["match_percentage"] == 50.0
