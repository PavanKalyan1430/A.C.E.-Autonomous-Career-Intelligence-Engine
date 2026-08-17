import pytest
import os
import sys
import json
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

# Ensure backend root directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from alembic.config import Config
from alembic import command
from app.core.database import Base
from app.models.user import Profile, InterviewFeedback, InterviewSession

TEST_MIGRATION_DB_URL = "postgresql+asyncpg://postgres:pavan@localhost:5432/ace_migration_test"
SYNC_MIGRATION_DB_URL = "postgresql://postgres:pavan@localhost:5432/ace_migration_test"

def get_alembic_config(db_url: str) -> Config:
    config_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "alembic.ini"))
    alembic_cfg = Config(config_path)
    alembic_cfg.set_main_option("sqlalchemy.url", db_url)
    return alembic_cfg

@pytest.fixture(scope="function")
def migration_db():
    # Dynamically clean the PostgreSQL public schema before the test
    from sqlalchemy import create_engine
    engine = create_engine(SYNC_MIGRATION_DB_URL)
    with engine.connect() as conn:
        conn.execute(text("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres; GRANT ALL ON SCHEMA public TO public;"))
        conn.commit()
    engine.dispose()

    yield TEST_MIGRATION_DB_URL

    # Dynamically clean the PostgreSQL public schema after the test
    engine = create_engine(SYNC_MIGRATION_DB_URL)
    with engine.connect() as conn:
        conn.execute(text("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres; GRANT ALL ON SCHEMA public TO public;"))
        conn.commit()
    engine.dispose()

def test_database_migration_upgrade_and_downgrade_integrity(migration_db):
    alembic_cfg = get_alembic_config(migration_db)
    
    # 1. Run upgrade to baseline version (77cce5d9c29a)
    command.upgrade(alembic_cfg, "77cce5d9c29a")
    
    # Connect and seed data with the old schema (which has the 'score' column)
    from sqlalchemy import create_engine
    engine = create_engine(SYNC_MIGRATION_DB_URL)
    
    with engine.connect() as conn:
        # Seed a dummy user first to satisfy foreign keys
        conn.execute(text(
            "INSERT INTO users (id, email, hashed_password, is_active, is_superuser, created_at) "
            "VALUES (1, 'candidate@ace.ai', 'hashedpassword', true, false, '2026-08-13 00:00:00')"
        ))
        # Seed an interview session with feedback JSON having the 'score' key
        conn.execute(text(
            "INSERT INTO interview_sessions (id, user_id, role_title, company_name, questions, current_question_index, transcript, feedback, is_completed, created_at) "
            "VALUES (10, 1, 'Systems Architect', 'Amazon', '[]', 0, '[]', '{\"score\": 82.0, \"questions_answered\": 3}', true, '2026-08-13 00:00:00')"
        ))
        # Seed an interview feedback row using the old 'score' column
        conn.execute(text(
            "INSERT INTO interview_feedbacks (id, user_id, session_id, score, strengths, weakness_areas, improvements, created_at) "
            "VALUES (100, 1, 10, 82, 'Excellent technical communication', '[]', '[]', '2026-08-13 00:00:00')"
        ))
        conn.commit()

    # 2. Upgrade to the latest revision (5c13fae14884)
    command.upgrade(alembic_cfg, "head")
    
    # Verify that the column was successfully renamed and the JSON data was migrated
    with engine.connect() as conn:
        # Verify column renamed and data preserved in interview_feedbacks
        feedback_row = conn.execute(text("SELECT id, overall_score, strengths FROM interview_feedbacks WHERE id = 100")).first()
        assert feedback_row is not None
        assert feedback_row[1] == 82  # score value 82 preserved in overall_score
        assert feedback_row[2] == 'Excellent technical communication'
        
        session_row = conn.execute(text("SELECT id, feedback FROM interview_sessions WHERE id = 10")).first()
        assert session_row is not None
        feedback_val = session_row[1]
        feedback_json = json.loads(feedback_val) if isinstance(feedback_val, str) else feedback_val
        assert "overall_score" in feedback_json
        assert feedback_json["overall_score"] == 82.0
        # Verify unique constraints are enforced after upgrade
        from sqlalchemy.orm import Session
        with Session(engine) as session:
            p1 = Profile(user_id=1, bio="Bio 1", overall_score=0)
            session.add(p1)
            session.commit()
            
            p2 = Profile(user_id=1, bio="Bio 2", overall_score=0)
            session.add(p2)
            try:
                session.commit()
                assert False, "Duplicate user_id allowed on profiles"
            except Exception:
                session.rollback()
                
            # Create a new session first to avoid conflict with seed session (id=10)
            s11 = InterviewSession(id=11, user_id=1, role_title="Staff Developer", current_question_index=0)
            session.add(s11)
            session.commit()
            
            f1 = InterviewFeedback(user_id=1, session_id=11, overall_score=80)
            session.add(f1)
            session.commit()
            
            f2 = InterviewFeedback(user_id=1, session_id=11, overall_score=90)
            session.add(f2)
            try:
                session.commit()
                assert False, "Duplicate session_id allowed on feedbacks"
            except Exception:
                session.rollback()
            
    # 3. Test rollback (downgrade) back to baseline
    command.downgrade(alembic_cfg, "77cce5d9c29a")
    
    # Verify rollback restored the score column and JSON feedback key
    with engine.connect() as conn:
        feedback_row = conn.execute(text("SELECT id, score FROM interview_feedbacks WHERE id = 100")).first()
        assert feedback_row is not None
        assert feedback_row[1] == 82
        
        session_row = conn.execute(text("SELECT id, feedback FROM interview_sessions WHERE id = 10")).first()
        assert session_row is not None
        feedback_val = session_row[1]
        feedback_json = json.loads(feedback_val) if isinstance(feedback_val, str) else feedback_val
        assert "score" in feedback_json
        assert feedback_json["score"] == 82.0
        assert "overall_score" not in feedback_json
        
    engine.dispose()
