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

def mock_llm_response(evidence_strength="strong", deficiencies=None, exp_deficiencies=None, proj_deficiencies=None):
    return {
        "requirements_evaluation": [
            {
                "requirement": "Python",
                "type": "skill",
                "evidence_strength": evidence_strength,
                "explicit_resume_evidence": "Python developer",
                "contextual_evidence": "wrote python code",
                "llm_validation": True,
                "explanation": "Verified",
                "priority": "high"
            }
        ],
        "structural_deficiencies": deficiencies or [],
        "experience_quality": [
            {"dimension": "responsibility_clarity", "evidence_excerpt": "led team", "evidence_strength": evidence_strength, "reasoning": "verified"},
            {"dimension": "technical_depth", "evidence_excerpt": "python developer", "evidence_strength": evidence_strength, "reasoning": "verified"},
            {"dimension": "ownership", "evidence_excerpt": "owned backend", "evidence_strength": evidence_strength, "reasoning": "verified"},
            {"dimension": "measurable_outcomes_quality", "evidence_excerpt": "saved 20%", "evidence_strength": evidence_strength, "reasoning": "verified"},
            {"dimension": "scale", "evidence_excerpt": "1M users", "evidence_strength": evidence_strength, "reasoning": "verified"},
            {"dimension": "business_impact", "evidence_excerpt": "revenue growth", "evidence_strength": evidence_strength, "reasoning": "verified"}
        ],
        "experience_deficiencies": exp_deficiencies or [],
        "project_quality": [
            {"dimension": "project_relevance", "evidence_excerpt": "django app", "evidence_strength": evidence_strength, "reasoning": "verified"},
            {"dimension": "technical_depth", "evidence_excerpt": "redis cache", "evidence_strength": evidence_strength, "reasoning": "verified"},
            {"dimension": "problem_complexity", "evidence_excerpt": "distributed system", "evidence_strength": evidence_strength, "reasoning": "verified"},
            {"dimension": "implementation_evidence", "evidence_excerpt": "github code", "evidence_strength": evidence_strength, "reasoning": "verified"},
            {"dimension": "measurable_outcome_quality", "evidence_excerpt": "50ms response", "evidence_strength": evidence_strength, "reasoning": "verified"},
            {"dimension": "ownership", "evidence_excerpt": "sole contributor", "evidence_strength": evidence_strength, "reasoning": "verified"}
        ],
        "project_deficiencies": proj_deficiencies or [],
        "actionable_improvements": [],
        "career_roadmap": {"immediate_1_2_weeks": [], "short_term_1_2_months": [], "long_term_3_6_months": []}
    }

@pytest.mark.anyio
async def test_score_arithmetic_exact_sum(analyzer):
    """Verify that overall score = round(sum(category_score * weight)) - total_penalty (capped 0-100)."""
    raw_text = "Jane Doe. Email: jane@doe.com. Phone: 123-456-7890. Experience: Python Dev."
    parsed_data = {
        "personal_info": {"name": "Jane Doe", "email": "jane@doe.com", "phone": "123-456-7890"},
        "work_experience": [{"role": "Dev", "description": "Python Dev"}],
        "projects": [{"title": "FastAPI App", "description": "FastAPI project"}],
        "skills": ["Python"]
    }
    
    mock_reqs = {
        "required_skills": ["Python"],
        "core_keywords": [],
        "description": "Python Developer",
        "source": "role_inference"
    }

    # Injecting structural deficiencies (length > 2000 words + structural defects + experience deficiencies)
    # To force penalties to apply
    long_raw_text = " ".join(["word"] * 2500)
    mock_reasoning = mock_llm_response(
        evidence_strength="strong",
        deficiencies=["Bad spacing", "Missing links"],
        exp_deficiencies=["Short description"],
        proj_deficiencies=["No code link"]
    )

    with patch("app.services.ats_analyzer.generate_content_with_routing", AsyncMock(side_effect=[
        json.dumps(mock_reqs), json.dumps(mock_reasoning)
    ])):
        res = await analyzer.analyze_resume_ats(long_raw_text, parsed_data, "Python Developer")
        
        overall = res["overall_ats_score"]
        categories = res["categories"]
        penalties = res["penalties"]
        total_penalty = res["total_penalty"]

        # Calculate expected sum of weighted contributions
        expected_weighted_sum = sum(cat["category_score"] * cat["weight"] for cat in categories)
        expected_overall_uncapped = round(expected_weighted_sum) - total_penalty
        expected_overall = min(max(expected_overall_uncapped, 0), 100)

        # Assert mathematical alignment
        assert total_penalty == sum(p["score_deduction"] for p in penalties)
        assert overall == expected_overall
        
        # Verify schema field assignments
        for cat in categories:
            assert cat["category_score"] == cat["score"]
            assert cat["weighted_contribution"] == round(cat["category_score"] * cat["weight"], 2)
            assert cat["calculation_inputs"] is not None
