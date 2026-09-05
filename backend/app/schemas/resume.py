from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class PersonalInfo(BaseModel):
    name: Optional[str] = Field(None, description="Full name of the candidate")
    email: Optional[str] = Field(None, description="Email address")
    phone: Optional[str] = Field(None, description="Contact number")
    location: Optional[str] = Field(None, description="Location (City, State/Country)")
    links: List[str] = Field(default_factory=list, description="Links to LinkedIn, GitHub, Portfolio etc.")

class WorkExperience(BaseModel):
    company: str = Field(..., description="Name of the company")
    role: str = Field(..., description="Job title / role")
    start_date: Optional[str] = Field(None, description="Start date of employment")
    end_date: Optional[str] = Field(None, description="End date or 'Present'")
    description: List[str] = Field(default_factory=list, description="Bullet points describing responsibilities and achievements")
    technologies: List[str] = Field(default_factory=list, description="Technologies or skills utilized in this role")

class Education(BaseModel):
    institution: str = Field(..., description="Name of school, college, or university")
    degree: Optional[str] = Field(None, description="Degree obtained (e.g. B.S., M.S., B.Tech)")
    field_of_study: Optional[str] = Field(None, description="Major / Field of study")
    graduation_date: Optional[str] = Field(None, description="Graduation date or expected graduation")
    gpa: Optional[str] = Field(None, description="GPA or percentage if available")

class Project(BaseModel):
    title: str = Field(..., description="Project name")
    description: str = Field(..., description="Description of project details")
    technologies: List[str] = Field(default_factory=list, description="Technologies used in the project")
    link: Optional[str] = Field(None, description="Link to code repository or demo")

class ResumeSchema(BaseModel):
    personal_info: PersonalInfo = Field(..., description="Candidate's contact and profile details")
    work_experience: List[WorkExperience] = Field(default_factory=list, description="Work history")
    education: List[Education] = Field(default_factory=list, description="Educational background")
    projects: List[Project] = Field(default_factory=list, description="Key projects")
    skills: List[str] = Field(default_factory=list, description="List of technical and soft skills extracted")
    languages: List[str] = Field(default_factory=list, description="Languages spoken")
    summary: Optional[str] = Field(None, description="Professional summary or bio")

class ATSCategoryScore(BaseModel):
    category_key: str = Field(..., description="Unique category key identifier")
    category_name: str = Field(..., description="Human-readable category name")
    score: Optional[int] = Field(None, description="Category score scaled 0-100")
    weight_percentage: int = Field(..., description="Weight percentage in overall ATS score calculation")
    why_basis: str = Field(..., description="Rationale for score")
    evidence: str = Field(..., description="Evidence extracted from candidate resume")
    deficiencies: List[str] = Field(default_factory=list, description="Specific deficiencies identified")
    provenance_details: Optional[Dict[str, Any]] = Field(None, description="Inputs and variables used to compute this score")
    category_score: Optional[int] = Field(None, description="Category score scaled 0-100")
    weight: Optional[float] = Field(None, description="Category weight (0.0 - 1.0)")
    weighted_contribution: Optional[float] = Field(None, description="Weighted contribution to overall score")
    calculation_inputs: Optional[Dict[str, Any]] = Field(None, description="Inputs checked for score")

class KeywordIntelligenceItem(BaseModel):
    keyword: str = Field(..., description="Keyword name")
    category: str = Field(..., description="matched, missing, or weak")
    priority: str = Field(..., description="high, medium, or low")
    where_it_matters: str = Field(..., description="Context on why this keyword matters for the role")
    source_type: Optional[str] = Field("role_inference", description="Source of requirement: supplied_jd, company_research, or role_inference")

class ActionableImprovementItem(BaseModel):
    problem: str = Field(..., description="Clear problem statement")
    evidence: str = Field(..., description="Evidence extracted from candidate resume")
    why_it_matters: str = Field(..., description="Recruiter/ATS impact rationale")
    recommendation: str = Field(..., description="Concrete improvement action")
    impact: str = Field(..., description="high, medium, or low priority impact")
    potential_pts: Optional[str] = Field("+8 pts", description="Estimated score improvement badge, e.g. +10 pts")

class RoadmapPhaseItem(BaseModel):
    title: str = Field(..., description="Goal title")
    action_item: str = Field(..., description="Actionable step")
    why_recommended: str = Field(..., description="Rationale based on resume gap analysis")
    priority: str = Field(..., description="high, medium, or low")

class CareerRoadmapPlan(BaseModel):
    immediate_1_2_weeks: List[RoadmapPhaseItem] = Field(default_factory=list)
    short_term_1_2_months: List[RoadmapPhaseItem] = Field(default_factory=list)
    long_term_3_6_months: List[RoadmapPhaseItem] = Field(default_factory=list)

class EvidenceMatrixItem(BaseModel):
    requirement: str
    importance: Optional[str] = "normal"
    source_type: Optional[str] = "role_inference"
    evidence_strength: Optional[str] = "missing"
    semantic_similarity: Optional[float] = 0.0
    keyword_match: Optional[bool] = False
    explicit_resume_evidence: Optional[str] = ""
    contextual_evidence: Optional[str] = ""
    explanation: Optional[str] = ""
    supporting_jd_evidence: Optional[str] = ""
    supporting_resume_evidence: Optional[str] = ""
    evidence_reason: Optional[str] = ""
    requirement_score: Optional[float] = 0.0
    normalized_skill: Optional[str] = ""
    category: Optional[str] = "technical_skill"
    requirement_id: Optional[str] = ""

class ATSAnalysisResponse(BaseModel):
    target_role: str
    overall_ats_score: Optional[int] = None
    score_level: str
    executive_summary: str
    key_strengths: List[str]
    categories: List[ATSCategoryScore]
    matched_keywords: List[str]
    missing_keywords: List[KeywordIntelligenceItem]
    weak_keywords: List[str]
    evidence_matrix: List[EvidenceMatrixItem] = Field(default_factory=list)
    actionable_improvements: List[ActionableImprovementItem]
    career_roadmap: CareerRoadmapPlan
    status: Optional[str] = Field("success", description="Analysis status: success or analysis_unavailable")
    penalties: Optional[List[Dict[str, Any]]] = Field(default_factory=list, description="List of penalties applied")
    total_penalty: Optional[int] = Field(0, description="Sum of all penalties applied")
    analyzed_at: Optional[str] = Field(None, description="ISO timestamp of when the analysis was generated")
    previous_score: Optional[int] = Field(None, description="Previous ATS score for this role if re-scanned")
    score_delta: Optional[int] = Field(None, description="Score change since last scan (+X or -X)")


class JDCompareRequest(BaseModel):
    jd_text: str = Field(..., min_length=20, description="Job description text for comparison")


class TriggerATSAnalysisRequest(BaseModel):
    target_role: str = Field(..., min_length=1, description="Target role to analyze the resume against")


