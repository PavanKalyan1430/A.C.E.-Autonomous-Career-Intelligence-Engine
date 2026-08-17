import pytest
import os
import sys
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

# Ensure backend root directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import Base
from app.models.user import User, Profile, InterviewSession, InterviewFeedback

TEST_INTEGRITY_DB_URL = "sqlite+aiosqlite:///:memory:"

@pytest.fixture(scope="function")
async def integrity_db_session():
    engine = create_async_engine(TEST_INTEGRITY_DB_URL, future=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    session_factory = sessionmaker(
        bind=engine, class_=AsyncSession, expire_on_commit=False
    )
    async with session_factory() as session:
        yield session
        
    await engine.dispose()

@pytest.mark.anyio
async def test_profile_one_to_one_integrity(integrity_db_session):
    # 1. Create a user
    user = User(email="test_unique@ace.ai", hashed_password="hashed_pwd")
    integrity_db_session.add(user)
    await integrity_db_session.commit()
    await integrity_db_session.refresh(user)

    # 2. Add first profile
    profile1 = Profile(user_id=user.id, bio="First Bio")
    integrity_db_session.add(profile1)
    await integrity_db_session.commit()

    # 3. Try to add a second profile for the same user
    profile2 = Profile(user_id=user.id, bio="Second Bio")
    integrity_db_session.add(profile2)
    
    with pytest.raises(IntegrityError):
        await integrity_db_session.commit()

@pytest.mark.anyio
async def test_feedback_one_to_one_integrity(integrity_db_session):
    # 1. Create a user and a session
    user = User(email="feedback_unique@ace.ai", hashed_password="hashed_pwd")
    integrity_db_session.add(user)
    await integrity_db_session.commit()
    await integrity_db_session.refresh(user)

    session = InterviewSession(user_id=user.id, role_title="Staff Eng", current_question_index=0)
    integrity_db_session.add(session)
    await integrity_db_session.commit()
    await integrity_db_session.refresh(session)

    # 2. Add first feedback
    feedback1 = InterviewFeedback(user_id=user.id, session_id=session.id, overall_score=80)
    integrity_db_session.add(feedback1)
    await integrity_db_session.commit()

    # 3. Try to add a second feedback for the same session
    feedback2 = InterviewFeedback(user_id=user.id, session_id=session.id, overall_score=90)
    integrity_db_session.add(feedback2)
    
    with pytest.raises(IntegrityError):
        await integrity_db_session.commit()
