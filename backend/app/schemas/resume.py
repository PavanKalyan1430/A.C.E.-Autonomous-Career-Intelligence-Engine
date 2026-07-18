from typing import List, Optional
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
