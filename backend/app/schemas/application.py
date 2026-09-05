import datetime
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List
from app.models.user import ApplicationStatus

class ApplicationAnalysis(BaseModel):
    match_percentage: float = Field(..., description="Calculated matching percentage (0-100)")
    cosine_score: float = Field(..., description="Cosine similarity score from NLP model")
    required_keyphrases: List[str] = Field(default_factory=list, description="Extracted keywords from job description")

class ApplicationCreate(BaseModel):
    company_name: str = Field(..., min_length=1, max_length=100, description="Company name e.g. 'Google'")
    role_title: str = Field(..., min_length=1, max_length=100, description="Role title e.g. 'Senior Backend Engineer'")
    status: Optional[ApplicationStatus] = Field(default=ApplicationStatus.TRACKED, description="Application status enum")
    jd_text: Optional[str] = Field(default=None, max_length=10000, description="Target job description text")
    external_apply_url: Optional[str] = Field(default=None, description="External application URL")
    location: Optional[str] = Field(default=None, description="Job location")

class ApplicationUpdate(BaseModel):
    status: Optional[ApplicationStatus] = None
    company_name: Optional[str] = Field(None, min_length=1, max_length=100)
    role_title: Optional[str] = Field(None, min_length=1, max_length=100)
    jd_text: Optional[str] = Field(None, max_length=10000)
    external_apply_url: Optional[str] = None
    location: Optional[str] = None
    applied_at: Optional[datetime.datetime] = None
    application_source: Optional[str] = None

class ApplicationResponse(BaseModel):
    id: int
    user_id: int
    company_name: str
    role_title: str
    status: ApplicationStatus
    jd_text: Optional[str] = None
    analysis: Optional[ApplicationAnalysis] = None
    external_apply_url: Optional[str] = None
    location: Optional[str] = None
    applied_at: Optional[datetime.datetime] = None
    application_source: Optional[str] = None
    external_application_opened_at: Optional[datetime.datetime] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True
