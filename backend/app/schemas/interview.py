import datetime
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class InterviewStartRequest(BaseModel):
    role_title: str = Field(description="Target job role e.g. 'Backend Engineer'")
    company_name: Optional[str] = Field(default=None, description="Optional target company name e.g. 'Google'")
    tech_stack_or_jd: Optional[str] = Field(default=None, description="Optional tech stack or full job description text")

class InterviewStartResponse(BaseModel):
    session_id: int
    role_title: str
    company_name: Optional[str]
    questions: List[str]
    created_at: datetime.datetime

class AnswerSubmitRequest(BaseModel):
    session_id: int
    question_index: int
    question: str
    user_answer: str
    speech_duration_seconds: Optional[float] = Field(default=None, description="Duration of spoken audio in seconds if recorded")

class AnswerSubmitResponse(BaseModel):
    session_id: int
    question_index: int
    evaluation_score: float
    action_verbs_detected: List[str]
    quantifiable_metrics: List[str]
    filler_words_detected: List[str]
    filler_word_ratio: float
    wpm_speech_pace: Optional[float]
    suggestions: List[str]

class InterviewFinishRequest(BaseModel):
    session_id: int

class InterviewFinishResponse(BaseModel):
    session_id: int
    overall_score: float
    strengths: str
    areas_for_improvement: List[str]
    is_completed: bool
