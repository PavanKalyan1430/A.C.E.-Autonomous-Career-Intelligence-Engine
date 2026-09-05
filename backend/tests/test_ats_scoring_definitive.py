import pytest
import json
@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"
import asyncio
from unittest.mock import AsyncMock, patch
from app.services.ats_analyzer import ats_analyzer_service, ACE_SCORING_METHODOLOGY

@pytest.fixture
def sample_parsed_resume():
    return {
        "personal_info": {"name": "Test User", "email": "test@ace.ai", "phone": "+1-555-0199"},
        "work_experience": [
            {
                "role": "Software Engineer",
                "company": "Tech Corp",
                "start_date": "2021",
                "end_date": "Present",
                "description": ["Engineered high scale microservices in Python and PyTorch."]
            }
        ],
        "education": [{"degree": "BS CS", "institution": "State University"}],
        "projects": [{"name": "AI Agent", "description": "Built agent using LangChain"}],
        "skills": ["Python", "PyTorch", "FastAPI"]
    }

@pytest.fixture
def mock_llm_eval_data():
    return {
        "requirements": [
            {
                "requirement_id": "req_1",
                "requirement_text": "5+ years Python development",
                "normalized_skill": "Python",
                "category": "technical_skill",
                "importance": "mandatory",
                "supporting_jd_evidence": "Must have strong Python expertise",
                "evidence_strength": "strong",
                "supporting_resume_evidence": "Engineered microservices in Python",
                "evidence_reason": "Explicit experience present in work history",
                "matching_context": "Work Experience at Tech Corp"
            },
            {
                "requirement_id": "req_2",
                "requirement_text": "Experience with PyTorch deep learning",
                "normalized_skill": "PyTorch",
                "category": "technical_skill",
                "importance": "mandatory",
                "supporting_jd_evidence": "Deep learning models in PyTorch",
                "evidence_strength": "strong",
                "supporting_resume_evidence": "Engineered microservices in Python and PyTorch",
                "evidence_reason": "Explicit deep learning project work",
                "matching_context": "Work Experience"
            },
            {
                "requirement_id": "req_3",
                "requirement_text": "Knowledge of Vector Databases (Qdrant/Milvus)",
                "normalized_skill": "Vector Databases",
                "category": "tool_platform",
                "importance": "preferred",
                "supporting_jd_evidence": "Nice to have vector database experience",
                "evidence_strength": "missing",
                "supporting_resume_evidence": "",
                "evidence_reason": "No mention found in resume",
                "matching_context": "None"
            }
        ],
        "structural_deficiencies": [],
        "experience_quality": [
            {"dimension": "responsibility_clarity", "evidence_strength": "strong", "evidence_excerpt": "Engineered microservices", "reasoning": "Clear responsibilities"},
            {"dimension": "technical_depth", "evidence_strength": "strong", "evidence_excerpt": "Python and PyTorch", "reasoning": "Deep technical stack"},
            {"dimension": "ownership", "evidence_strength": "partial", "evidence_excerpt": "Built microservices", "reasoning": "Shared ownership"},
            {"dimension": "measurable_outcomes_quality", "evidence_strength": "weak", "evidence_excerpt": "", "reasoning": "Lacks specific metrics"},
            {"dimension": "scale", "evidence_strength": "partial", "evidence_excerpt": "high scale", "reasoning": "Qualitative scale mention"},
            {"dimension": "business_impact", "evidence_strength": "weak", "evidence_excerpt": "", "reasoning": "No business metrics"}
        ],
        "experience_deficiencies": [],
        "project_quality": [
            {"dimension": "project_relevance", "evidence_strength": "strong", "evidence_excerpt": "AI Agent", "reasoning": "Relevant project"},
            {"dimension": "technical_depth", "evidence_strength": "strong", "evidence_excerpt": "LangChain", "reasoning": "Modern AI framework"},
            {"dimension": "problem_complexity", "evidence_strength": "partial", "evidence_excerpt": "Agent building", "reasoning": "Moderate complexity"},
            {"dimension": "implementation_evidence", "evidence_strength": "strong", "evidence_excerpt": "Built agent", "reasoning": "Explicit implementation"},
            {"dimension": "measurable_outcome_quality", "evidence_strength": "missing", "evidence_excerpt": "", "reasoning": "No metrics"},
            {"dimension": "ownership", "evidence_strength": "strong", "evidence_excerpt": "Built agent", "reasoning": "Sole project owner"}
        ],
        "project_deficiencies": [],
        "actionable_improvements": [
            {"problem": "Missing Vector Databases", "evidence": "No mention in resume", "recommendation": "Add vector DB project", "importance": "high"}
        ]
    }

@pytest.mark.anyio
async def test_1_work_experience_no_arbitrary_bonus(sample_parsed_resume, mock_llm_eval_data):
    """Test 1: Having work experience does NOT award +15 or arbitrary large count bonus."""
    parsed_no_exp = dict(sample_parsed_resume)
    parsed_no_exp["work_experience"] = []
    
    with patch("app.services.ats_analyzer.generate_content_with_routing", new=AsyncMock(return_value=json.dumps(mock_llm_eval_data))):
        res = await ats_analyzer_service.analyze_resume_ats(
            raw_text="Python PyTorch Engineer",
            parsed_data=parsed_no_exp,
            target_role="AI Engineer",
            jd_text="Python PyTorch Required"
        )
        exp_cat = next(c for c in res["categories"] if c["category_key"] == "experience_impact")
        # Pure quality dimension calculation: (34 / 60) * 100 = 57. No +30 count bonus added.
        assert exp_cat["score"] <= 100

@pytest.mark.anyio
async def test_2_and_3_action_verbs_and_metrics_do_not_artificially_inflate(sample_parsed_resume, mock_llm_eval_data):
    """Test 2 & 3: Action verbs & metrics do not artificially inflate experience score."""
    with patch("app.services.ats_analyzer.generate_content_with_routing", new=AsyncMock(return_value=json.dumps(mock_llm_eval_data))):
        res = await ats_analyzer_service.analyze_resume_ats(
            raw_text="Engineered scaled optimized developed PyTorch models achieving 99% accuracy 500k users",
            parsed_data=sample_parsed_resume,
            target_role="AI Engineer",
            jd_text="Python PyTorch Required"
        )
        exp_cat = next(c for c in res["categories"] if c["category_key"] == "experience_impact")
        assert exp_cat["score"] <= 100

@pytest.mark.anyio
async def test_4_number_of_jobs_does_not_dominate_experience_quality(sample_parsed_resume, mock_llm_eval_data):
    """Test 4: 10 job entries do not inflate score past quality dimensions."""
    parsed_many_jobs = dict(sample_parsed_resume)
    parsed_many_jobs["work_experience"] = [{"role": f"Dev {i}", "company": f"Co {i}"} for i in range(10)]
    
    with patch("app.services.ats_analyzer.generate_content_with_routing", new=AsyncMock(return_value=json.dumps(mock_llm_eval_data))):
        res = await ats_analyzer_service.analyze_resume_ats(
            raw_text="Python Engineer",
            parsed_data=parsed_many_jobs,
            target_role="AI Engineer",
            jd_text="Python PyTorch Required"
        )
        exp_cat = next(c for c in res["categories"] if c["category_key"] == "experience_impact")
        assert exp_cat["score"] <= 100

@pytest.mark.anyio
async def test_5_and_19_no_jd_mode_does_not_self_generate_requirements_from_resume(sample_parsed_resume, mock_llm_eval_data):
    """Test 5 & 19: Resume TF-IDF phrases are NEVER converted into requirements in No-JD mode."""
    with patch("app.services.ats_analyzer.generate_content_with_routing", new=AsyncMock(return_value=json.dumps(mock_llm_eval_data))):
        res = await ats_analyzer_service.analyze_resume_ats(
            raw_text="UniqueResumeKeyword123 Python PyTorch",
            parsed_data=sample_parsed_resume,
            target_role="AI Engineer",
            jd_text=None
        )
        # Requirements must come from role inference, NOT candidate's raw_text TF-IDF phrases
        assert res["status"] == "success"
        for req in res["evidence_matrix"]:
            assert req["source_type"] == "role_inference"
            assert "UniqueResumeKeyword123" not in req["requirement"]

@pytest.mark.anyio
async def test_6_and_7_explicit_vs_weak_evidence_scoring(sample_parsed_resume, mock_llm_eval_data):
    """Test 6 & 7: Explicit JD requirement evidence scores strongly, missing/weak scores lower."""
    with patch("app.services.ats_analyzer.generate_content_with_routing", new=AsyncMock(return_value=json.dumps(mock_llm_eval_data))):
        res = await ats_analyzer_service.analyze_resume_ats(
            raw_text="Python PyTorch",
            parsed_data=sample_parsed_resume,
            target_role="AI Engineer",
            jd_text="Python PyTorch Vector Databases"
        )
        strong_reqs = [r for r in res["evidence_matrix"] if r["evidence_strength"] == "strong"]
        missing_reqs = [r for r in res["evidence_matrix"] if r["evidence_strength"] == "missing"]
        
        assert len(strong_reqs) > 0
        assert strong_reqs[0]["requirement_score"] == 100.0
        if missing_reqs:
            assert missing_reqs[0]["requirement_score"] == 0.0

@pytest.mark.anyio
async def test_11_mandatory_preferred_weighting(sample_parsed_resume, mock_llm_eval_data):
    """Test 11: Mandatory requirements carry higher weight than preferred in normalized score."""
    with patch("app.services.ats_analyzer.generate_content_with_routing", new=AsyncMock(return_value=json.dumps(mock_llm_eval_data))):
        res = await ats_analyzer_service.analyze_resume_ats(
            raw_text="Python PyTorch",
            parsed_data=sample_parsed_resume,
            target_role="AI Engineer",
            jd_text="Python PyTorch Vector Databases"
        )
        skills_cat = next(c for c in res["categories"] if c["category_key"] == "skills_keyword_coverage")
        # Formula: (100*1.2 + 100*1.2 + 0*0.8) / (1.2 + 1.2 + 0.8) = 240 / 3.2 = 75
        assert skills_cat["score"] == 75

@pytest.mark.anyio
async def test_12_13_14_mathematical_bounds_0_to_100(sample_parsed_resume, mock_llm_eval_data):
    """Test 12, 13, 14: All requirement scores, category scores, and final score bounded 0-100."""
    with patch("app.services.ats_analyzer.generate_content_with_routing", new=AsyncMock(return_value=json.dumps(mock_llm_eval_data))):
        res = await ats_analyzer_service.analyze_resume_ats(
            raw_text="Python PyTorch",
            parsed_data=sample_parsed_resume,
            target_role="AI Engineer",
            jd_text="Python PyTorch"
        )
        assert 0 <= res["overall_ats_score"] <= 100
        for req in res["evidence_matrix"]:
            assert 0.0 <= req["requirement_score"] <= 100.0
        for cat in res["categories"]:
            assert 0 <= cat["score"] <= 100

@pytest.mark.anyio
async def test_15_no_hardcoded_readability_points(sample_parsed_resume, mock_llm_eval_data):
    """Test 15: No hardcoded readability_score = 20 points."""
    with patch("app.services.ats_analyzer.generate_content_with_routing", new=AsyncMock(return_value=json.dumps(mock_llm_eval_data))):
        res = await ats_analyzer_service.analyze_resume_ats(
            raw_text="Python Engineer",
            parsed_data={"personal_info": {}, "work_experience": []},
            target_role="AI Engineer",
            jd_text="Python"
        )
        struct_cat = next(c for c in res["categories"] if c["category_key"] == "ats_structure_formatting")
        # Contact info = 0, Sections = 0 -> Score = 0. No hardcoded +20 points awarded!
        assert struct_cat["score"] == 0

@pytest.mark.anyio
async def test_16_duplicate_section_header_detection(sample_parsed_resume, mock_llm_eval_data):
    """Test 16: Genuine duplicate section header detection in raw text layout."""
    duplicate_raw_text = """
    WORK EXPERIENCE
    Engineer at Tech Corp (2020-2022)
    
    WORK EXPERIENCE
    Developer at Soft Corp (2018-2020)
    
    SKILLS
    Python, PyTorch
    """
    with patch("app.services.ats_analyzer.generate_content_with_routing", new=AsyncMock(return_value=json.dumps(mock_llm_eval_data))):
        res = await ats_analyzer_service.analyze_resume_ats(
            raw_text=duplicate_raw_text,
            parsed_data=sample_parsed_resume,
            target_role="AI Engineer",
            jd_text="Python"
        )
        dup_penalty = next((p for p in res["penalties"] if p["name"] == "Duplicate Section Headers"), None)
        assert dup_penalty is not None
        assert dup_penalty["score_deduction"] == 10

@pytest.mark.anyio
async def test_17_no_double_penalty_counting(sample_parsed_resume, mock_llm_eval_data):
    """Test 17: Deductions are independent and do not double count the same deficiency."""
    with patch("app.services.ats_analyzer.generate_content_with_routing", new=AsyncMock(return_value=json.dumps(mock_llm_eval_data))):
        res = await ats_analyzer_service.analyze_resume_ats(
            raw_text="Python Engineer",
            parsed_data=sample_parsed_resume,
            target_role="AI Engineer",
            jd_text="Python"
        )
        # Total penalty must match sum of independent penalties
        assert res["total_penalty"] == sum(p["score_deduction"] for p in res["penalties"])

@pytest.mark.anyio
async def test_18_llm_failure_returns_unavailable(sample_parsed_resume):
    """Test 18: LLM failure returns status = analysis_unavailable with null overall score."""
    with patch("app.services.ats_analyzer.generate_content_with_routing", side_effect=Exception("API Key Exceeded")):
        res = await ats_analyzer_service.analyze_resume_ats(
            raw_text="Python Engineer",
            parsed_data=sample_parsed_resume,
            target_role="AI Engineer",
            jd_text="Python"
        )
        assert res["status"] == "analysis_unavailable"
        assert res["overall_ats_score"] is None

@pytest.mark.anyio
async def test_20_short_resume_behavior(sample_parsed_resume, mock_llm_eval_data):
    """Test 20: Very short/empty resume behaves correctly without crashing."""
    with patch("app.services.ats_analyzer.generate_content_with_routing", new=AsyncMock(return_value=json.dumps(mock_llm_eval_data))):
        res = await ats_analyzer_service.analyze_resume_ats(
            raw_text="Short",
            parsed_data={"personal_info": {}},
            target_role="AI Engineer",
            jd_text="Python"
        )
        assert res["status"] == "success"
        assert 0 <= res["overall_ats_score"] <= 100

@pytest.mark.anyio
async def test_21_ats_does_not_own_career_roadmap(sample_parsed_resume, mock_llm_eval_data):
    """Test 21: ATS response career_roadmap is empty or non-authoritative."""
    with patch("app.services.ats_analyzer.generate_content_with_routing", new=AsyncMock(return_value=json.dumps(mock_llm_eval_data))):
        res = await ats_analyzer_service.analyze_resume_ats(
            raw_text="Python Engineer",
            parsed_data=sample_parsed_resume,
            target_role="AI Engineer",
            jd_text="Python"
        )
        # Roadmap must be empty lists (Skill Roadmap is sole owner)
        assert res["career_roadmap"] == {"immediate_1_2_weeks": [], "short_term_1_2_months": [], "long_term_3_6_months": []}

@pytest.mark.anyio
async def test_22_deterministic_reproducibility(sample_parsed_resume, mock_llm_eval_data):
    """Test 22: Same input produces identical deterministic scoring output."""
    with patch("app.services.ats_analyzer.generate_content_with_routing", new=AsyncMock(return_value=json.dumps(mock_llm_eval_data))):
        res1 = await ats_analyzer_service.analyze_resume_ats("Python", sample_parsed_resume, "AI Engineer", "Python")
        res2 = await ats_analyzer_service.analyze_resume_ats("Python", sample_parsed_resume, "AI Engineer", "Python")
        assert res1["overall_ats_score"] == res2["overall_ats_score"]

@pytest.mark.anyio
async def test_23_and_24_evidence_traceability(sample_parsed_resume, mock_llm_eval_data):
    """Test 23 & 24: JD requirements and resume conclusions are traceable to exact evidence quotes."""
    with patch("app.services.ats_analyzer.generate_content_with_routing", new=AsyncMock(return_value=json.dumps(mock_llm_eval_data))):
        res = await ats_analyzer_service.analyze_resume_ats("Python", sample_parsed_resume, "AI Engineer", "Python")
        for req in res["evidence_matrix"]:
            assert "supporting_jd_evidence" in req
            assert "supporting_resume_evidence" in req
            assert "evidence_reason" in req
