from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class CanonicalCandidateProfile(BaseModel):
    user_id: int
    email: str
    target_role: str
    target_company: Optional[str] = None
    verified_skills: List[str]
    experience_summary: List[Dict[str, Any]]
    weak_areas: List[str]
    interview_history_count: int
    average_interview_score: float

class SkillAlignment(BaseModel):
    target_role: str
    target_company: Optional[str] = None
    matched_skills: List[str]
    missing_skills: List[str]
    coverage_percentage: float

class PrioritizedSkillGap(BaseModel):
    skill: str
    priority: str  # "high", "medium", "low"
    reason: str
    evidence_sources: List[str]  # ["resume_gap", "company_requirement", "interview_weakness"]

class LearningRoadmapNode(BaseModel):
    id: str
    name: str
    status: str  # "completed", "focus", "recommended", "blocked"
    impact: str  # "high", "medium"
    prerequisites: List[Any]
    reason: str
    estimated_effort_hours: int

class RecommendationProvenanceItem(BaseModel):
    title: str
    priority: str  # "high", "medium", "low"
    reason: str
    source_metrics: List[str]
    recommended_action: str

class CareerIntelligenceResponse(BaseModel):
    profile: CanonicalCandidateProfile
    skill_alignment: SkillAlignment
    prioritized_gaps: List[PrioritizedSkillGap]
    learning_roadmap: List[LearningRoadmapNode]
    recommendations: List[RecommendationProvenanceItem]
    ai_synthesis: Optional[str] = None
