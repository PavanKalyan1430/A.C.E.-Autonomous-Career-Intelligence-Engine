import datetime
from pydantic import BaseModel, Field, field_validator
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
    question_index: int = Field(..., ge=0, description="0-based index of the question being answered")
    user_answer: str = Field(..., min_length=1, max_length=10000, description="The text response from the candidate")
    speech_duration_seconds: Optional[float] = Field(default=None, description="Duration of spoken audio in seconds if recorded")

    @field_validator("user_answer")
    @classmethod
    def validate_answer_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("user_answer must not be empty or whitespace only.")
        return v

    @field_validator("speech_duration_seconds", mode="before")
    @classmethod
    def validate_speech_duration_before(cls, v: Any) -> Any:
        if v is not None:
            if isinstance(v, str):
                if v.strip().lower() in ["nan", "inf", "infinity", "-inf", "-infinity"]:
                    raise ValueError("speech_duration_seconds must be a finite number.")
            else:
                import math
                try:
                    if math.isnan(float(v)) or math.isinf(float(v)):
                        raise ValueError("speech_duration_seconds must be a finite number.")
                except (ValueError, TypeError):
                    pass
        return v

    @field_validator("speech_duration_seconds")
    @classmethod
    def validate_speech_duration(cls, v: Optional[float]) -> Optional[float]:
        if v is not None:
            if v <= 0:
                raise ValueError("speech_duration_seconds must be a positive, finite number.")
        return v

class AnswerSubmitResponse(BaseModel):
    session_id: int
    question_index: int
    evaluation_score: Optional[float]
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
