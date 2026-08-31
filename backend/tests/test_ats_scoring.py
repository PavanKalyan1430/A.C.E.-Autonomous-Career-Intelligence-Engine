import pytest
from unittest.mock import patch, AsyncMock
from app.services.ats_analyzer import ATSAnalyzerService

@pytest.fixture
def anyio_backend():
    return "asyncio"

@pytest.fixture
def analyzer():
    return ATSAnalyzerService()

@pytest.mark.anyio
async def test_deterministic_scoring_reproducibility(analyzer):
    """Verify that identical inputs produce the exact same final score."""
    raw_text = "Experienced Senior Backend Developer. Skills: Python, FastAPI, Docker, Kubernetes."
    parsed_data = {
        "personal_info": {"name": "Test Candidate", "email": "test@candidate.com", "phone": "123-456-7890"},
        "skills": ["Python", "FastAPI", "Docker", "Kubernetes"],
        "work_experience": [{"role": "Senior Backend Developer", "description": "Designed microservices using Python and FastAPI."}]
    }
    target_role = "Backend Engineer"

    # Mock requirement extraction
    mock_reqs = {
        "required_skills": ["Python", "FastAPI"],
        "core_keywords": ["Docker"],
        "description": "Develop backend APIs in Python.",
        "source": "role_inference"
    }

    # Mock LLM reasoning
    mock_reasoning = {
        "requirements_evaluation": [
            {"requirement": "Python", "type": "skill", "evidence_strength": "strong", "importance": "high", "llm_validation": True},
            {"requirement": "FastAPI", "type": "skill", "evidence_strength": "strong", "importance": "high", "llm_validation": True},
            {"requirement": "Docker", "type": "keyword", "evidence_strength": "strong", "importance": "medium", "llm_validation": True}
        ],
        "structural_deficiencies": [],
        "experience_quality": {
            "responsibility_clarity": "high", "technical_depth": "high", "ownership": "high",
            "measurable_outcomes_quality": "high", "scale": "high", "business_impact": "high"
        },
        "project_quality": {
            "project_relevance": "high", "technical_depth": "high", "problem_complexity": "high",
            "implementation_evidence": "high", "measurable_outcome_quality": "high", "ownership": "high"
        },
        "experience_deficiencies": [],
        "project_deficiencies": [],
        "actionable_improvements": [],
        "career_roadmap": {"immediate_1_2_weeks": [], "short_term_1_2_months": [], "long_term_3_6_months": []}
    }

    # Mock needs to supply side effect values for both calls (total 4 invocations)
    with patch("app.services.ats_analyzer.generate_content_with_routing", AsyncMock(side_effect=[
        json_dumps_mock(mock_reqs), json_dumps_mock(mock_reasoning),
        json_dumps_mock(mock_reqs), json_dumps_mock(mock_reasoning)
    ])):
        res1 = await analyzer.analyze_resume_ats(raw_text, parsed_data, target_role)
        res2 = await analyzer.analyze_resume_ats(raw_text, parsed_data, target_role)
        
        assert res1["overall_ats_score"] == res2["overall_ats_score"]
        assert res1["overall_ats_score"] > 0
        assert res1["overall_ats_score"] <= 100

@pytest.mark.anyio
async def test_llm_unavailable_returns_error_state(analyzer):
    """Verify that if the LLM fails, we return an analysis-unavailable state instead of fake scores."""
    raw_text = "Python developer."
    parsed_data = {}
    
    with patch("app.services.ats_analyzer.generate_content_with_routing", AsyncMock(side_effect=Exception("Connection refused"))):
        res = await analyzer.analyze_resume_ats(raw_text, parsed_data, "Backend Engineer")
        assert res.get("status") == "analysis_unavailable"
        assert "Analysis unavailable" in res.get("executive_summary", "")
        assert res.get("overall_ats_score") is None

@pytest.mark.anyio
async def test_strong_vs_weak_match_scoring(analyzer):
    """Verify that a strong match gets a higher score than a weak match for the same role requirements."""
    parsed_strong = {
        "personal_info": {"name": "Candidate A", "email": "a@c.com", "phone": "123"},
        "work_experience": [{"role": "Eng", "description": "Experienced developer."}],
        "projects": [{"name": "P1", "description": "FastAPI project."}]
    }
    parsed_weak = {
        "personal_info": {"name": "Candidate B", "email": "b@c.com"},
        "work_experience": [],
        "projects": []
    }

    mock_reqs = {
        "required_skills": ["Python", "FastAPI"],
        "core_keywords": ["Docker"],
        "description": "API designer",
        "source": "role_inference"
    }

    mock_reasoning_strong = {
        "requirements_evaluation": [
            {"requirement": "Python", "type": "skill", "evidence_strength": "strong", "importance": "high"},
            {"requirement": "FastAPI", "type": "skill", "evidence_strength": "strong", "importance": "high"},
            {"requirement": "Docker", "type": "keyword", "evidence_strength": "strong", "importance": "medium"}
        ],
        "experience_quality": {"responsibility_clarity": "high", "technical_depth": "high", "ownership": "high"},
        "project_quality": {"project_relevance": "high", "technical_depth": "high", "ownership": "high"}
    }

    mock_reasoning_weak = {
        "requirements_evaluation": [
            {"requirement": "Python", "type": "skill", "evidence_strength": "missing", "importance": "high"},
            {"requirement": "FastAPI", "type": "skill", "evidence_strength": "missing", "importance": "high"},
            {"requirement": "Docker", "type": "keyword", "evidence_strength": "missing", "importance": "medium"}
        ],
        "experience_quality": {"responsibility_clarity": "low", "technical_depth": "low", "ownership": "low"},
        "project_quality": {"project_relevance": "low", "technical_depth": "low", "ownership": "low"}
    }

    with patch("app.services.ats_analyzer.generate_content_with_routing", AsyncMock(side_effect=[
        json_dumps_mock(mock_reqs), json_dumps_mock(mock_reasoning_strong),
        json_dumps_mock(mock_reqs), json_dumps_mock(mock_reasoning_weak)
    ])):
        res_strong = await analyzer.analyze_resume_ats("Python FastAPI Docker developer", parsed_strong, "Backend Engineer")
        res_weak = await analyzer.analyze_resume_ats("No skills", parsed_weak, "Backend Engineer")
        
        assert res_strong["overall_ats_score"] > res_weak["overall_ats_score"]

def json_dumps_mock(data):
    import json
    return json.dumps(data)
