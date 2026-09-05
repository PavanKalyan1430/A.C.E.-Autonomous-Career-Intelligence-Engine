from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class KPIOverview(BaseModel):
    career_score: Optional[int] = None
    job_match_percentage: Optional[int] = None
    interview_score: Optional[float] = None
    total_interviews: int
    completed_interviews: int
    latest_interview_score: Optional[float] = None
    active_applications: int

class ScoreTrendPoint(BaseModel):
    session_id: int
    date: str
    score: float
    role: str

class QuestionPerformanceItem(BaseModel):
    question: str
    score: int
    category: str

class InterviewAnalyticsSection(BaseModel):
    total_sessions: int
    completed_sessions: int
    average_score: Optional[float] = None
    latest_score: Optional[float] = None
    highest_score: Optional[float] = None
    score_trend: List[ScoreTrendPoint]
    question_performance: List[QuestionPerformanceItem]
    weak_areas: List[str]

class CommunicationAnalyticsSection(BaseModel):
    avg_wpm: float
    filler_word_ratio: float
    filler_word_count: int
    action_verbs_used: List[str]
    quantifiable_metrics_used: List[str]

class SkillProgressItem(BaseModel):
    skill: str
    val: int
    badge: Optional[str] = None
    ai: bool = False

class SkillAnalyticsSection(BaseModel):
    verified_skills: List[str]
    missing_skills: List[str]
    topological_learning_order: List[str]
    skill_progress: List[SkillProgressItem]

class JobMatchItem(BaseModel):
    company: str
    role: str
    location: str
    initial: str
    bg: str
    match: int

class CompanyAnalyticsSection(BaseModel):
    companies_researched_count: int
    target_companies: List[str]
    top_job_matches: List[JobMatchItem]

class AIInsightItem(BaseModel):
    text: str
    category: str

class RecommendationItem(BaseModel):
    title: str
    reason: str
    priority: str
    source_metric: str

class DynamicRecommendation(BaseModel):
    title: str
    explanation: str
    supporting_reasons: List[str]
    expected_benefit: str
    route: str

class ActivityItem(BaseModel):
    desc: str
    time: str
    category: str

class DashboardMetricsResponse(BaseModel):
    overview: KPIOverview
    funnel: Dict[str, int]
    average_interview_score: Optional[float] = None
    total_sessions: int
    interview_analytics: InterviewAnalyticsSection
    communication_analytics: CommunicationAnalyticsSection
    skill_analytics: SkillAnalyticsSection
    company_analytics: CompanyAnalyticsSection
    insights: List[AIInsightItem]
    recommendations: List[RecommendationItem]
    dynamic_recommendation: Optional[DynamicRecommendation] = None
    recent_activity: List[ActivityItem]
    activity_timeline: List[Dict[str, Any]]

class AIInsightsRequest(BaseModel):
    force_refresh: bool = False

class AIInsightsResponse(BaseModel):
    insights: List[AIInsightItem]
    recommendations: List[RecommendationItem]
    generated_at: str
