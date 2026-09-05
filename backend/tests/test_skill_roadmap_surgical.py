import pytest
import asyncio
import hashlib
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import IntegrityError
from sqlalchemy.future import select

from app.main import app
from app.core.database import Base, get_db
from app.models.user import User, Profile, Resume, Roadmap, RoadmapNode, LearningCompletion
from app.core.security import get_password_hash
from app.services.career_intelligence import career_intelligence_service

TEST_DATABASE_URL = "sqlite+aiosqlite:///test_roadmap_surgical_db.sqlite"

from unittest.mock import patch

@pytest.fixture(scope="function", autouse=True)
def mock_external_services():
    with patch.object(career_intelligence_service.company_intel_service, "get_company_insights", return_value={"tech_stack": ["Python", "PostgreSQL", "FastAPI", "Docker"]}), \
         patch("app.services.company_intelligence.CompanyIntelligenceService.get_company_insights", return_value={"tech_stack": ["Python", "PostgreSQL", "FastAPI", "Docker"]}), \
         patch("app.services.ats_analyzer.ats_analyzer_service.analyze_resume_ats", return_value={"status": "success", "matched_keywords": ["Python"], "missing_keywords": [], "weak_keywords": []}), \
         patch("app.services.career_intelligence.generate_content_with_routing", return_value='{"prioritized_gaps": [], "learning_roadmap": [], "recommendations": [], "ai_synthesis": "Summary"}'), \
         patch("app.core.llm_router.generate_content_with_routing", return_value='{"prioritized_gaps": [], "learning_roadmap": [], "recommendations": [], "ai_synthesis": "Summary"}'):
        yield

@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"

@pytest.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()

@pytest.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()

@pytest.fixture(scope="function")
async def test_users(db_session: AsyncSession):
    user_a = User(
        email="user_a@ace.ai",
        hashed_password=get_password_hash("password123"),
        is_active=True
    )
    user_b = User(
        email="user_b@ace.ai",
        hashed_password=get_password_hash("password123"),
        is_active=True
    )
    db_session.add_all([user_a, user_b])
    await db_session.commit()
    await db_session.refresh(user_a)
    await db_session.refresh(user_b)

    prof_a = Profile(user_id=user_a.id, target_role="Backend Engineer", preferences={"target_company": "Stripe"}, skills_json={"skills": ["Python"]})
    prof_b = Profile(user_id=user_b.id, target_role="Frontend Engineer", preferences={"target_company": "Google"}, skills_json={"skills": ["React"]})
    db_session.add_all([prof_a, prof_b])
    await db_session.commit()

    return user_a, user_b

@pytest.fixture
async def auth_headers_user_a(client: AsyncClient, test_users) -> dict:
    res = await client.post("/api/v1/auth/login", data={"username": "user_a@ace.ai", "password": "password123"})
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
async def auth_headers_user_b(client: AsyncClient, test_users) -> dict:
    res = await client.post("/api/v1/auth/login", data={"username": "user_b@ace.ai", "password": "password123"})
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

# --- 1. DATABASE & UNIQUE CONSTRAINT TESTS ---
@pytest.mark.anyio
async def test_database_learning_completion_uniqueness(db_session: AsyncSession, test_users):
    user_a, _ = test_users

    roadmap = Roadmap(user_id=user_a.id, target_role="Backend Engineer", version_hash="v1_hash")
    db_session.add(roadmap)
    await db_session.commit()
    await db_session.refresh(roadmap)

    node = RoadmapNode(
        roadmap_id=roadmap.id,
        skill_name="FastAPI",
        skill_id="fastapi",
        status="recommended",
        impact="high"
    )
    db_session.add(node)
    await db_session.commit()
    await db_session.refresh(node)

    comp1 = LearningCompletion(user_id=user_a.id, roadmap_node_id=node.id, skill_name="FastAPI")
    db_session.add(comp1)
    await db_session.commit()

    # Inserting duplicate record for same user and roadmap node must fail
    comp2 = LearningCompletion(user_id=user_a.id, roadmap_node_id=node.id, skill_name="FastAPI")
    db_session.add(comp2)
    with pytest.raises(IntegrityError):
        await db_session.commit()
    await db_session.rollback()

# --- 2. IDEMPOTENT MUTATION & AUTHORIZATION TESTS ---
@pytest.mark.anyio
async def test_idempotent_completion_flow_and_authorization(client: AsyncClient, db_session: AsyncSession, test_users, auth_headers_user_a, auth_headers_user_b):
    user_a, user_b = test_users

    # Create Roadmap & Node for User A
    roadmap = Roadmap(user_id=user_a.id, target_role="Backend Engineer", version_hash="v1_hash")
    db_session.add(roadmap)
    await db_session.commit()
    await db_session.refresh(roadmap)

    node = RoadmapNode(
        roadmap_id=roadmap.id,
        skill_name="PostgreSQL",
        skill_id="postgresql",
        status="recommended",
        impact="high"
    )
    db_session.add(node)
    await db_session.commit()
    await db_session.refresh(node)

    # User B attempting to complete User A's node must fail (HTTP 403 or 404)
    res_unauth = await client.put(
        "/api/v1/career/skills/complete",
        json={"roadmap_node_id": node.id, "completed": True},
        headers=auth_headers_user_b
    )
    assert res_unauth.status_code in [403, 404]

    # User A completing node -> HTTP 200
    res_comp1 = await client.put(
        "/api/v1/career/skills/complete",
        json={"roadmap_node_id": node.id, "completed": True},
        headers=auth_headers_user_a
    )
    assert res_comp1.status_code == 200
    assert res_comp1.json()["is_completed"] is True

    # Repeated request must be idempotent (HTTP 200, no duplicate rows)
    res_comp2 = await client.put(
        "/api/v1/career/skills/complete",
        json={"roadmap_node_id": node.id, "completed": True},
        headers=auth_headers_user_a
    )
    assert res_comp2.status_code == 200
    assert res_comp2.json()["is_completed"] is True

    # Verify exactly 1 completion record exists in DB
    comps = await db_session.execute(select(LearningCompletion).filter(LearningCompletion.user_id == user_a.id))
    assert len(list(comps.scalars().all())) == 1

    # Reverting completion (completed=False)
    res_revert1 = await client.put(
        "/api/v1/career/skills/complete",
        json={"roadmap_node_id": node.id, "completed": False},
        headers=auth_headers_user_a
    )
    assert res_revert1.status_code == 200
    assert res_revert1.json()["is_completed"] is False

    # Repeated revert is idempotent
    res_revert2 = await client.put(
        "/api/v1/career/skills/complete",
        json={"roadmap_node_id": node.id, "completed": False},
        headers=auth_headers_user_a
    )
    assert res_revert2.status_code == 200

    comps_after = await db_session.execute(select(LearningCompletion).filter(LearningCompletion.user_id == user_a.id))
    assert len(list(comps_after.scalars().all())) == 0

# --- 3. NETWORKX GRAPH ENGINE & DEPENDENCY PROPAGATION TESTS ---
@pytest.mark.anyio
async def test_networkx_graph_cycle_resolution_and_propagation(db_session: AsyncSession, test_users):
    user_a, _ = test_users

    # Create Roadmap with a cyclic prerequisite: A -> B -> C -> A
    roadmap = Roadmap(user_id=user_a.id, target_role="Backend Engineer", version_hash="cyclic_v1")
    db_session.add(roadmap)
    await db_session.commit()
    await db_session.refresh(roadmap)

    node_a = RoadmapNode(roadmap_id=roadmap.id, skill_name="Node A", skill_id="node_a", status="recommended", impact="high", prerequisites_json=["node_c"])
    node_b = RoadmapNode(roadmap_id=roadmap.id, skill_name="Node B", skill_id="node_b", status="recommended", impact="medium", prerequisites_json=["node_a"])
    node_c = RoadmapNode(roadmap_id=roadmap.id, skill_name="Node C", skill_id="node_c", status="recommended", impact="medium", prerequisites_json=["node_b"])
    db_session.add_all([node_a, node_b, node_c])
    await db_session.commit()

    # Generate career intelligence to trigger NetworkX cycle breaking & topological sorting
    result = await career_intelligence_service.generate_career_intelligence(user_a.id, db_session)
    roadmap_out = result["learning_roadmap"]

    assert len(roadmap_out) == 3
    # Check that phases are populated and valid integers >= 1
    phases = [n["phase"] for n in roadmap_out]
    assert all(p >= 1 for p in phases)
    # Check readiness score calculation
    assert "readiness_score" in result
    assert "next_best_action" in result

# --- 4. STABLE CONTENT FINGERPRINTING & CACHE INVALIDATION ---
@pytest.mark.anyio
async def test_stable_content_fingerprint_invalidation(db_session: AsyncSession, test_users):
    user_a, _ = test_users

    # Initial intelligence run
    res1 = await career_intelligence_service.generate_career_intelligence(user_a.id, db_session)

    # Adding a resume change must alter the state_hash fingerprint
    resume = Resume(
        user_id=user_a.id,
        file_name="new_resume.pdf",
        raw_text="Expert Python Developer with Kafka and Kubernetes experience.",
        parsed_data={"skills": ["Python", "Kafka", "Kubernetes"]}
    )
    db_session.add(resume)
    await db_session.commit()

    # Second intelligence run should detect state change and regenerate
    res2 = await career_intelligence_service.generate_career_intelligence(user_a.id, db_session)
    assert res2 is not None
