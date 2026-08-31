import pytest
import json
from unittest.mock import patch, AsyncMock
from app.services.ats_analyzer import ATSAnalyzerService

@pytest.fixture
def anyio_backend():
    return "asyncio"

@pytest.fixture
def analyzer():
    return ATSAnalyzerService()

def mock_llm_response(required_skills, core_keywords, evidence_strength="strong", deficiencies=None, actionable_improvements=None, career_roadmap=None):
    req_evals = []
    for skill in required_skills:
        req_evals.append({
            "requirement": skill,
            "type": "skill",
            "evidence_strength": evidence_strength,
            "explicit_resume_evidence": "Found " + skill if evidence_strength != "missing" else "",
            "contextual_evidence": "Context for " + skill if evidence_strength != "missing" else "",
            "llm_validation": True if evidence_strength != "missing" else False,
            "explanation": "Verified in resume",
            "priority": "high"
        })
    for kw in core_keywords:
        req_evals.append({
            "requirement": kw,
            "type": "keyword",
            "evidence_strength": evidence_strength,
            "explicit_resume_evidence": "Found " + kw if evidence_strength != "missing" else "",
            "contextual_evidence": "Context for " + kw if evidence_strength != "missing" else "",
            "llm_validation": True if evidence_strength != "missing" else False,
            "explanation": "Verified in resume",
            "priority": "medium"
        })
    
    exp_quality = [
        {"dimension": "responsibility_clarity", "evidence_excerpt": "led team", "evidence_strength": evidence_strength, "reasoning": "verified"},
        {"dimension": "technical_depth", "evidence_excerpt": "python developer", "evidence_strength": evidence_strength, "reasoning": "verified"},
        {"dimension": "ownership", "evidence_excerpt": "owned backend", "evidence_strength": evidence_strength, "reasoning": "verified"},
        {"dimension": "measurable_outcomes_quality", "evidence_excerpt": "saved 20%", "evidence_strength": evidence_strength, "reasoning": "verified"},
        {"dimension": "scale", "evidence_excerpt": "1M users", "evidence_strength": evidence_strength, "reasoning": "verified"},
        {"dimension": "business_impact", "evidence_excerpt": "revenue growth", "evidence_strength": evidence_strength, "reasoning": "verified"}
    ]

    proj_quality = [
        {"dimension": "project_relevance", "evidence_excerpt": "django app", "evidence_strength": evidence_strength, "reasoning": "verified"},
        {"dimension": "technical_depth", "evidence_excerpt": "redis cache", "evidence_strength": evidence_strength, "reasoning": "verified"},
        {"dimension": "problem_complexity", "evidence_excerpt": "distributed system", "evidence_strength": evidence_strength, "reasoning": "verified"},
        {"dimension": "implementation_evidence", "evidence_excerpt": "github code", "evidence_strength": evidence_strength, "reasoning": "verified"},
        {"dimension": "measurable_outcome_quality", "evidence_excerpt": "50ms response", "evidence_strength": evidence_strength, "reasoning": "verified"},
        {"dimension": "ownership", "evidence_excerpt": "sole contributor", "evidence_strength": evidence_strength, "reasoning": "verified"}
    ]

    return {
        "requirements_evaluation": req_evals,
        "structural_deficiencies": deficiencies or [],
        "experience_quality": exp_quality,
        "experience_deficiencies": [],
        "project_quality": proj_quality,
        "project_deficiencies": [],
        "actionable_improvements": actionable_improvements or [],
        "career_roadmap": career_roadmap or {"immediate_1_2_weeks": [], "short_term_1_2_months": [], "long_term_3_6_months": []}
    }

@pytest.mark.anyio
async def test_determinism_identical_inputs(analyzer):
    """Verify that identical inputs produce identical scores."""
    raw_text = "Jane Doe. Email: jane@doe.com. Phone: 123-456-7890. Experienced Python Developer. Projects: FastAPI App."
    parsed_data = {
        "personal_info": {"name": "Jane Doe", "email": "jane@doe.com", "phone": "123-456-7890"},
        "work_experience": [{"role": "Developer", "description": "Experienced Python Developer"}],
        "projects": [{"title": "FastAPI App", "description": "FastAPI project"}],
        "skills": ["Python", "FastAPI"]
    }
    
    mock_reqs = {
        "required_skills": ["Python"],
        "core_keywords": ["FastAPI"],
        "description": "Python Developer",
        "source": "role_inference"
    }

    mock_reasoning = mock_llm_response(["Python"], ["FastAPI"], "strong")

    with patch("app.services.ats_analyzer.generate_content_with_routing", AsyncMock(side_effect=[
        json.dumps(mock_reqs), json.dumps(mock_reasoning),
        json.dumps(mock_reqs), json.dumps(mock_reasoning)
    ])):
        res1 = await analyzer.analyze_resume_ats(raw_text, parsed_data, "Python Developer")
        res2 = await analyzer.analyze_resume_ats(raw_text, parsed_data, "Python Developer")
        
        assert res1["overall_ats_score"] == res2["overall_ats_score"]
        assert res1["overall_ats_score"] is not None
        assert 0 <= res1["overall_ats_score"] <= 100

@pytest.mark.anyio
async def test_llm_failure_produces_null(analyzer):
    """Verify that LLM failure produces status = 'analysis_unavailable' and overall_ats_score = None."""
    raw_text = "Jane Doe. jane@doe.com."
    parsed_data = {}

    with patch("app.services.ats_analyzer.generate_content_with_routing", AsyncMock(side_effect=Exception("LLM Timeout"))):
        res = await analyzer.analyze_resume_ats(raw_text, parsed_data, "Python Developer")
        
        assert res["status"] == "analysis_unavailable"
        assert res["overall_ats_score"] is None
        for cat in res["categories"]:
            assert cat["score"] is None

@pytest.mark.anyio
async def test_no_fabricated_evidence_when_missing(analyzer):
    """Verify that when requirement evidence is missing, score is not padded, and evidence fields are empty."""
    raw_text = "Jane Doe. Email: jane@doe.com."
    parsed_data = {
        "personal_info": {"name": "Jane Doe", "email": "jane@doe.com"},
        "work_experience": [],
        "skills": []
    }
    
    mock_reqs = {
        "required_skills": ["Kubernetes"],
        "core_keywords": ["AWS"],
        "description": "DevOps Engineer",
        "source": "role_inference"
    }

    mock_reasoning = mock_llm_response(["Kubernetes"], ["AWS"], "missing")

    with patch("app.services.ats_analyzer.generate_content_with_routing", AsyncMock(side_effect=[
        json.dumps(mock_reqs), json.dumps(mock_reasoning)
    ])):
        res = await analyzer.analyze_resume_ats(raw_text, parsed_data, "DevOps Engineer")
        
        # Verify evidence matrix entries for missing skills are empty/clean
        for item in res["evidence_matrix"]:
            assert item["evidence_strength"] == "missing"
            assert item["explicit_resume_evidence"] == ""
            assert item["contextual_evidence"] == ""

@pytest.mark.anyio
async def test_requirement_provenance(analyzer):
    """Verify that every requirement has a source_type."""
    raw_text = "Jane Doe. Email: jane@doe.com."
    parsed_data = {
        "personal_info": {"name": "Jane Doe", "email": "jane@doe.com"}
    }
    
    mock_reqs = {
        "required_skills": ["Python"],
        "core_keywords": ["Git"],
        "description": "Python Developer",
        "source": "role_inference"
    }

    mock_reasoning = mock_llm_response(["Python"], ["Git"], "strong")

    # 1. Test role inference source
    with patch("app.services.ats_analyzer.generate_content_with_routing", AsyncMock(side_effect=[
        json.dumps(mock_reqs), json.dumps(mock_reasoning)
    ])):
        res = await analyzer.analyze_resume_ats(raw_text, parsed_data, "Python Developer")
        for item in res["evidence_matrix"]:
            assert item["source_type"] == "role_inference"

    # 2. Test supplied job description source
    with patch("app.services.ats_analyzer.generate_content_with_routing", AsyncMock(side_effect=[
        json.dumps(mock_reqs), json.dumps(mock_reasoning)
    ])):
        res = await analyzer.analyze_resume_ats(raw_text, parsed_data, "Python Developer", jd_text="Job Description text...")
        for item in res["evidence_matrix"]:
            assert item["source_type"] == "supplied_jd"

@pytest.mark.anyio
async def test_no_recommendation_without_detected_gap(analyzer):
    """Verify that recommendations are only generated if there are actual detected gaps (partial, weak, missing)."""
    raw_text = "Jane Doe. Email: jane@doe.com."
    parsed_data = {
        "personal_info": {"name": "Jane Doe", "email": "jane@doe.com"}
    }
    
    mock_reqs = {
        "required_skills": ["Python"],
        "core_keywords": ["Git"],
        "description": "Python Developer",
        "source": "role_inference"
    }

    # Case 1: Strong match (no gaps). Even if LLM returns some suggestions, python core filters them.
    mock_reasoning_no_gaps = mock_llm_response(["Python"], ["Git"], "strong", actionable_improvements=[
        {"gap": "Python is missing", "recommendation": "Learn python", "importance": "high"}
    ], career_roadmap={
        "immediate_1_2_weeks": [{"title": "Action", "action_item": "Do something", "why_recommended": "Python is missing", "priority": "high"}],
        "short_term_1_2_months": [], "long_term_3_6_months": []
    })

    with patch("app.services.ats_analyzer.generate_content_with_routing", AsyncMock(side_effect=[
        json.dumps(mock_reqs), json.dumps(mock_reasoning_no_gaps)
    ])):
        res = await analyzer.analyze_resume_ats(raw_text, parsed_data, "Python Developer")
        assert len(res["actionable_improvements"]) == 0
        assert len(res["career_roadmap"]["immediate_1_2_weeks"]) == 0

@pytest.mark.anyio
async def test_strong_vs_weak_contextual_evidence(analyzer):
    """Verify that strong contextual evidence yields higher score than weak (list-only) evidence."""
    raw_text = "Jane Doe."
    parsed_data = {
        "personal_info": {"name": "Jane Doe"}
    }
    
    mock_reqs = {
        "required_skills": ["Python"],
        "core_keywords": [],
        "description": "Python Developer",
        "source": "role_inference"
    }

    # Strong evidence mock
    mock_reasoning_strong = mock_llm_response(["Python"], [], "strong")
    # Weak evidence mock
    mock_reasoning_weak = mock_llm_response(["Python"], [], "weak")

    with patch("app.services.ats_analyzer.generate_content_with_routing", AsyncMock(side_effect=[
        json.dumps(mock_reqs), json.dumps(mock_reasoning_strong),
        json.dumps(mock_reqs), json.dumps(mock_reasoning_weak)
    ])):
        res_strong = await analyzer.analyze_resume_ats(raw_text, parsed_data, "Python Developer")
        res_weak = await analyzer.analyze_resume_ats(raw_text, parsed_data, "Python Developer")
        
        assert res_strong["categories"][1]["score"] > res_weak["categories"][1]["score"]

@pytest.mark.anyio
async def test_section_count_does_not_inflate_score(analyzer):
    """Verify that adding more sections doesn't blindly inflate the structure score."""
    raw_text = "Jane Doe. Email: jane@doe.com. Phone: 123-456-7890. Experience: Python Dev."
    
    parsed_data_few_sections = {
        "personal_info": {"name": "Jane Doe", "email": "jane@doe.com", "phone": "123-456-7890"},
        "work_experience": [{"role": "Dev", "description": "Python Dev"}],
        "skills": ["Python"]
    }
    
    parsed_data_extra_sections = {
        "personal_info": {"name": "Jane Doe", "email": "jane@doe.com", "phone": "123-456-7890"},
        "work_experience": [{"role": "Dev", "description": "Python Dev"}],
        "skills": ["Python"],
        "education": [],
        "projects": [],
        "summary": "Experienced Developer."
    }

    mock_reqs = {
        "required_skills": ["Python"],
        "core_keywords": [],
        "description": "Developer",
        "source": "role_inference"
    }
    mock_reasoning = mock_llm_response(["Python"], [], "strong")

    with patch("app.services.ats_analyzer.generate_content_with_routing", AsyncMock(side_effect=[
        json.dumps(mock_reqs), json.dumps(mock_reasoning),
        json.dumps(mock_reqs), json.dumps(mock_reasoning)
    ])):
        res_few = await analyzer.analyze_resume_ats(raw_text, parsed_data_few_sections, "Developer")
        res_extra = await analyzer.analyze_resume_ats(raw_text, parsed_data_extra_sections, "Developer")
        
        # Adding empty/extra sections shouldn't cause blind score inflation beyond the core structure checklist limit
        assert res_few["categories"][0]["score"] == res_extra["categories"][0]["score"]
