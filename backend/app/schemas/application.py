import datetime
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional
from app.models.user import ApplicationStatus

class ApplicationCreate(BaseModel):
    company_name: str = Field(description="Company name e.g. 'Google'")
    role_title: str = Field(description="Role title e.g. 'Senior Backend Engineer'")
    status: Optional[ApplicationStatus] = Field(default=ApplicationStatus.APPLIED, description="Application status enum")
    jd_text: Optional[str] = Field(default=None, description="Target job description text")

class ApplicationUpdate(BaseModel):
    status: Optional[ApplicationStatus] = None
    company_name: Optional[str] = None
    role_title: Optional[str] = None
    jd_text: Optional[str] = None

class ApplicationResponse(BaseModel):
    id: int
    user_id: int
    company_name: str
    role_title: str
    status: ApplicationStatus
    jd_text: Optional[str]
    analysis: Optional[Dict[str, Any]]
    created_at: datetime.datetime

    class Config:
        from_attributes = True
