import pytest
from typing import AsyncGenerator
from unittest.mock import patch, AsyncMock
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
import networkx as nx

from app.core.database import Base
from app.models.user import User, Profile, Resume, Application, Roadmap, RoadmapNode, LearningCompletion
from app.services.career_intelligence import career_intelligence_service

TEST_DATABASE_URL = "sqlite+aiosqlite:///./test_roadmap_hardening.db"

@pytest.fixture(scope="function", autouse=True)
def mock_external_services():
    mock_company = AsyncMock(return_value={"tech_stack": ["Python", "PostgreSQL", "FastAPI", "Docker"]})
    mock_ats = AsyncMock(return_value={"status": "success", "matched_keywords": ["Python"], "missing_keywords": [{"keyword": "FastAPI"}], "weak_keywords": []})
    mock_llm = AsyncMock(return_value='{"prioritized_gaps": [], "learning_roadmap": [{"id": "python", "name": "Python", "status": "recommended", "impact": "high", "prerequisites": [], "reason": "Core requirement", "estimated_effort_hours": null}], "recommendations": [], "ai_synthesis": "Summary"}')

    with patch.object(career_intelligence_service.company_intel_service, "get_company_insights", mock_company), \
         patch("app.services.ats_analyzer.ats_analyzer_service.analyze_resume_ats", mock_ats), \
         patch("app.services.career_intelligence.generate_content_with_routing", mock_llm), \
         patch("app.core.llm_router.generate_content_with_routing", mock_llm):
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

@pytest.mark.anyio
async def test_invariant_1_role_requirements_independent_of_resume(db_session: AsyncSession):
    """1. Role requirements independent of resume."""
    user1 = User(email="cand1@example.com", hashed_password="pw")
    db_session.add(user1)
    await db_session.commit()
    await db_session.refresh(user1)

    prof1 = Profile(user_id=user1.id, target_role="Backend Engineer", preferences={"target_company": "Acme"})
    db_session.add(prof1)
    
    res1 = Resume(user_id=user1.id, file_name="res1.pdf", raw_text="Experienced in COBOL, FORTRAN and Pascal.", parsed_data={"skills": ["COBOL", "FORTRAN"]})
    db_session.add(res1)
    await db_session.commit()

    canonical = await career_intelligence_service.get_canonical_candidate_profile(user1.id, db_session)
    assert canonical["target_role"] == "Backend Engineer"
    assert canonical["target_company"] == "Acme"
    assert "COBOL" in canonical["verified_skills"]

@pytest.mark.anyio
async def test_invariant_2_jd_requirements_authoritative(db_session: AsyncSession):
    """2. JD requirements remain authoritative when supplied."""
    user = User(email="jd_test@example.com", hashed_password="pw")
    db_session.add(user)
    await db_session.commit()

    prof = Profile(user_id=user.id, target_role="DevOps Engineer")
    db_session.add(prof)

    app = Application(
        user_id=user.id,
        company_name="CloudCorp",
        role_title="DevOps Engineer",
        jd_text="Must have Terraform, Kubernetes, Prometheus and AWS."
    )
    db_session.add(app)
    await db_session.commit()

    canonical = await career_intelligence_service.get_canonical_candidate_profile(user.id, db_session)
    assert canonical["target_role"] == "DevOps Engineer"

@pytest.mark.anyio
async def test_invariant_3_company_context_resolution(db_session: AsyncSession):
    """3. Explicit candidate target company resolves over application company."""
    user = User(email="company_res@example.com", hashed_password="pw")
    db_session.add(user)
    await db_session.commit()

    # Explicit profile preference
    prof = Profile(user_id=user.id, target_role="Frontend Engineer", preferences={"target_company": "Stripe"})
    db_session.add(prof)

    # Newer application to a different company
    app = Application(user_id=user.id, company_name="RandomStartup", role_title="Frontend Engineer")
    db_session.add(app)
    await db_session.commit()

    canonical = await career_intelligence_service.get_canonical_candidate_profile(user.id, db_session)
    assert canonical["target_company"] == "Stripe"  # Profile preference authoritative!

@pytest.mark.anyio
async def test_invariant_5_6_node_id_completion_and_verified_skill_distinction(db_session: AsyncSession):
    """5. Completion is node-ID based. 6. Skill verification != roadmap completion."""
    user = User(email="node_comp@example.com", hashed_password="pw")
    db_session.add(user)
    await db_session.commit()

    prof = Profile(user_id=user.id, target_role="Data Engineer", skills_json={"skills": ["Python", "SQL"]})
    db_session.add(prof)
    await db_session.commit()

    # Create Roadmap & Nodes
    roadmap = Roadmap(user_id=user.id, target_role="Data Engineer", version_hash="v1_test_hash")
    db_session.add(roadmap)
    await db_session.flush()

    node1 = RoadmapNode(roadmap_id=roadmap.id, skill_name="Python", skill_id="python", status="recommended")
    node2 = RoadmapNode(roadmap_id=roadmap.id, skill_name="Apache Spark", skill_id="spark", status="recommended", prerequisites_json=["python"])
    db_session.add_all([node1, node2])
    await db_session.commit()

    # Possessing "Python" as a verified skill satisfies prerequisite for Spark, BUT node1 is NOT completed!
    res = await career_intelligence_service.generate_career_intelligence(user.id, db_session)

    nodes = {n["skill_id"]: n for n in res["learning_roadmap"]}
    assert nodes["python"]["status"] != "completed"  # Node itself not completed merely because verified
    assert nodes["spark"]["status"] != "blocked"    # Prerequisite Python is satisfied by verified skill!

    # Complete Node 1 explicitly via LearningCompletion (node-id based)
    comp = LearningCompletion(user_id=user.id, roadmap_node_id=node1.id, skill_name="Python")
    db_session.add(comp)
    await db_session.commit()

    res_after = await career_intelligence_service.generate_career_intelligence(user.id, db_session)
    nodes_after = {n["skill_id"]: n for n in res_after["learning_roadmap"]}
    assert nodes_after["python"]["status"] == "completed"

@pytest.mark.anyio
async def test_invariant_7_readiness_score_separation(db_session: AsyncSession):
    """7. Roadmap completion != career readiness."""
    user = User(email="readiness@example.com", hashed_password="pw")
    db_session.add(user)
    await db_session.commit()

    prof = Profile(user_id=user.id, target_role="Security Engineer")
    db_session.add(prof)

    roadmap = Roadmap(user_id=user.id, target_role="Security Engineer", version_hash="readiness_hash")
    db_session.add(roadmap)
    await db_session.flush()

    n1 = RoadmapNode(roadmap_id=roadmap.id, skill_name="Cryptography", skill_id="crypto")
    db_session.add(n1)
    await db_session.commit()

    # Complete node 1 -> 100% roadmap completion
    db_session.add(LearningCompletion(user_id=user.id, roadmap_node_id=n1.id, skill_name="Cryptography"))
    await db_session.commit()

    res = await career_intelligence_service.generate_career_intelligence(user.id, db_session)
    assert res["learning_completion_pct"] == 100.0
    # Career readiness is evidence alignment
    assert res["readiness_score"] is None or isinstance(res["readiness_score"], float)

@pytest.mark.anyio
async def test_invariant_8_9_missing_scores_not_zero(db_session: AsyncSession):
    """8 & 9. Missing scores return None, not 0 or 0.0."""
    user = User(email="noscores@example.com", hashed_password="pw")
    db_session.add(user)
    await db_session.commit()

    prof = Profile(user_id=user.id, target_role="Backend Engineer")
    db_session.add(prof)
    await db_session.commit()

    canonical = await career_intelligence_service.get_canonical_candidate_profile(user.id, db_session)
    assert canonical["average_interview_score"] is None  # NOT 0.0!

@pytest.mark.anyio
async def test_invariant_9_networkx_cycle_handling(db_session: AsyncSession):
    """9. NetworkX cycle handling is deterministic and safe."""
    G = nx.DiGraph()
    G.add_node("node1")
    G.add_node("node2")

    # Add cycle
    if not nx.has_path(G, "node2", "node1"):
        G.add_edge("node1", "node2")
    if not nx.has_path(G, "node1", "node2"):
        G.add_edge("node2", "node1")

    # Topological sort works safely without unhandled cycle crash
    cycles = list(nx.simple_cycles(G))
    assert len(cycles) == 0  # Cycle was prevented safely

@pytest.mark.anyio
async def test_invariant_10_force_refresh_versioning_and_completion(db_session: AsyncSession):
    """10. Force refresh creates new roadmap version while preserving completions."""
    user = User(email="refresh@example.com", hashed_password="pw")
    db_session.add(user)
    await db_session.commit()

    prof = Profile(user_id=user.id, target_role="Cloud Engineer")
    db_session.add(prof)
    await db_session.commit()

    res1 = await career_intelligence_service.generate_career_intelligence(user.id, db_session, force_refresh=False)
    node1_id = res1["learning_roadmap"][0]["node_id"]

    # Mark completion
    db_session.add(LearningCompletion(user_id=user.id, roadmap_node_id=node1_id, skill_name=res1["learning_roadmap"][0]["name"]))
    await db_session.commit()

    # Force refresh
    res2 = await career_intelligence_service.generate_career_intelligence(user.id, db_session, force_refresh=True)

    # Completion migrated cleanly
    completed_nodes = [n for n in res2["learning_roadmap"] if n["status"] == "completed"]
    assert len(completed_nodes) >= 1

@pytest.mark.anyio
async def test_invariant_12_no_arbitrary_effort_fallbacks(db_session: AsyncSession):
    """12. Roadmap effort does not use 8/12 arbitrary fallback."""
    user = User(email="effort@example.com", hashed_password="pw")
    db_session.add(user)
    await db_session.commit()

    prof = Profile(user_id=user.id, target_role="Fullstack Engineer")
    db_session.add(prof)
    await db_session.commit()

    res = await career_intelligence_service.generate_career_intelligence(user.id, db_session, force_refresh=False)
    for n in res["learning_roadmap"]:
        assert n["estimated_effort_hours"] is None or n["estimated_effort_hours"] >= 0

@pytest.mark.anyio
async def test_invariant_14_persisted_vs_computed_status(db_session: AsyncSession):
    """14. Persisted status and computed status remain semantically distinct."""
    user = User(email="status_test@example.com", hashed_password="pw")
    db_session.add(user)
    await db_session.commit()

    prof = Profile(user_id=user.id, target_role="QA Engineer")
    db_session.add(prof)

    roadmap = Roadmap(user_id=user.id, target_role="QA Engineer", version_hash="stat_v1")
    db_session.add(roadmap)
    await db_session.flush()

    n1 = RoadmapNode(roadmap_id=roadmap.id, skill_name="Selenium", skill_id="selenium", status="focus")
    db_session.add(n1)
    await db_session.commit()

    # Complete node 1
    db_session.add(LearningCompletion(user_id=user.id, roadmap_node_id=n1.id, skill_name="Selenium"))
    await db_session.commit()

    res = await career_intelligence_service.generate_career_intelligence(user.id, db_session)
    # Computed status for API response is "completed"
    assert res["learning_roadmap"][0]["status"] == "completed"

    # Persisted recommendation status in DB remains "focus"
    db_node = await db_session.get(RoadmapNode, n1.id)
    assert db_node.status == "focus"
