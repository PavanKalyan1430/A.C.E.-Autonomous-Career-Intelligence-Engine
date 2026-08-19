import datetime
import enum
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Integer, JSON, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

class ApplicationStatus(str, enum.Enum):
    APPLIED = "applied"
    INTERVIEW = "interview"
    OFFER = "offer"
    REJECTED = "rejected"

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)
    
    profile: Mapped["Profile"] = relationship("Profile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    resumes: Mapped[list["Resume"]] = relationship("Resume", back_populates="user", cascade="all, delete-orphan")
    applications: Mapped[list["Application"]] = relationship("Application", back_populates="user", cascade="all, delete-orphan")
    interviews: Mapped[list["InterviewSession"]] = relationship("InterviewSession", back_populates="user", cascade="all, delete-orphan")
    feedbacks: Mapped[list["InterviewFeedback"]] = relationship("InterviewFeedback", back_populates="user", cascade="all, delete-orphan")
    memories: Mapped[list["UserMemory"]] = relationship("UserMemory", back_populates="user", cascade="all, delete-orphan")
    recommendations: Mapped[list["Recommendation"]] = relationship("Recommendation", back_populates="user", cascade="all, delete-orphan")
    executions: Mapped[list["AgentExecution"]] = relationship("AgentExecution", back_populates="user", cascade="all, delete-orphan")
    chat_sessions: Mapped[list["ChatSession"]] = relationship("ChatSession", back_populates="user", cascade="all, delete-orphan")

class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    full_name: Mapped[str] = mapped_column(String, nullable=True)
    bio: Mapped[str] = mapped_column(String, nullable=True)
    target_role: Mapped[str] = mapped_column(String, nullable=True)
    overall_score: Mapped[int] = mapped_column(Integer, default=0)
    skills_json: Mapped[dict] = mapped_column(JSON, default=dict)  # Extracted skills mapping
    preferences: Mapped[dict] = mapped_column(JSON, default=dict)  # UI, AI, and interview preferences
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    user: Mapped["User"] = relationship("User", back_populates="profile")

class Resume(Base):
    __tablename__ = "resumes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    file_name: Mapped[str] = mapped_column(String, nullable=False)
    raw_text: Mapped[str] = mapped_column(String, nullable=False)
    parsed_data: Mapped[dict] = mapped_column(JSON, nullable=True)  # Structured skills, projects, work exp
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)

    user: Mapped["User"] = relationship("User", back_populates="resumes")

class Skill(Base):
    __tablename__ = "skills"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    category: Mapped[str] = mapped_column(String, nullable=False)  # language, framework, database, tool

class Company(Base):
    __tablename__ = "companies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    industry: Mapped[str] = mapped_column(String, nullable=True)
    website: Mapped[str] = mapped_column(String, nullable=True)
    tech_stack: Mapped[list] = mapped_column(JSON, default=list)
    interview_process: Mapped[str] = mapped_column(String, nullable=True)
    hiring_trends: Mapped[str] = mapped_column(String, nullable=True)
    salary_info: Mapped[dict] = mapped_column(JSON, default=dict)

    jobs: Mapped[list["Job"]] = relationship("Job", back_populates="company", cascade="all, delete-orphan")

class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    company_id: Mapped[int] = mapped_column(Integer, ForeignKey("companies.id"), nullable=False)
    title: Mapped[str] = mapped_column(String, index=True, nullable=False)
    description: Mapped[str] = mapped_column(String, nullable=True)
    requirements: Mapped[list] = mapped_column(JSON, default=list)
    salary_range: Mapped[str] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)

    company: Mapped["Company"] = relationship("Company", back_populates="jobs")

class Application(Base):
    __tablename__ = "applications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    company_name: Mapped[str] = mapped_column(String, nullable=False)
    role_title: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, default="applied")  # applied, interview, offer, rejected
    jd_text: Mapped[str] = mapped_column(String, nullable=True)
    analysis: Mapped[dict] = mapped_column(JSON, nullable=True)  # Match score, skill gaps
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)

    user: Mapped["User"] = relationship("User", back_populates="applications")

class Recommendation(Base):
    __tablename__ = "recommendations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    category: Mapped[str] = mapped_column(String, nullable=False)  # roadmap, learning, fit
    title: Mapped[str] = mapped_column(String, nullable=False)
    recommendation_text: Mapped[str] = mapped_column(String, nullable=False)
    raw_json_data: Mapped[dict] = mapped_column(JSON, default=dict)
    is_accepted: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)

    user: Mapped["User"] = relationship("User", back_populates="recommendations")

class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    role_title: Mapped[str] = mapped_column(String, nullable=False)
    company_name: Mapped[str] = mapped_column(String, nullable=True)
    questions: Mapped[list] = mapped_column(JSON, nullable=True)  # List of questions
    current_question_index: Mapped[int] = mapped_column(Integer, default=0)
    transcript: Mapped[list] = mapped_column(JSON, default=list)  # QA list
    feedback: Mapped[dict] = mapped_column(JSON, nullable=True)  # Overall feedback & score
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)

    user: Mapped["User"] = relationship("User", back_populates="interviews")
    feedbacks: Mapped[list["InterviewFeedback"]] = relationship("InterviewFeedback", back_populates="session", cascade="all, delete-orphan")

class InterviewFeedback(Base):
    __tablename__ = "interview_feedbacks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    session_id: Mapped[int] = mapped_column(Integer, ForeignKey("interview_sessions.id"), nullable=False, unique=True)
    overall_score: Mapped[int] = mapped_column(Integer, default=0)
    strengths: Mapped[str] = mapped_column(String, nullable=True)
    weakness_areas: Mapped[list] = mapped_column(JSON, default=list)
    improvements: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)

    user: Mapped["User"] = relationship("User", back_populates="feedbacks")
    session: Mapped["InterviewSession"] = relationship("InterviewSession", back_populates="feedbacks")

class UserMemory(Base):
    __tablename__ = "user_memories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    category: Mapped[str] = mapped_column(String, nullable=False)  # preference, goal, weak_area, skill
    memory_text: Mapped[str] = mapped_column(String, nullable=False)
    meta_data: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)

    user: Mapped["User"] = relationship("User", back_populates="memories")

class AgentExecution(Base):
    __tablename__ = "agent_executions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    agent_name: Mapped[str] = mapped_column(String, nullable=False)
    input_data: Mapped[dict] = mapped_column(JSON, default=dict)
    output_data: Mapped[dict] = mapped_column(JSON, default=dict)
    latency_ms: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String, default="success")  # success, failure
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)

    user: Mapped["User"] = relationship("User", back_populates="executions")

class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String, default="New Conversation")
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow
    )

    user: Mapped["User"] = relationship("User", back_populates="chat_sessions")
    messages: Mapped[list["ChatMessage"]] = relationship(
        "ChatMessage", back_populates="session", cascade="all, delete-orphan"
    )

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    session_id: Mapped[int] = mapped_column(Integer, ForeignKey("chat_sessions.id"), nullable=False)
    role: Mapped[str] = mapped_column(String, nullable=False)  # "user", "assistant", "system"
    content: Mapped[str] = mapped_column(String, nullable=False)
    agent_name: Mapped[str] = mapped_column(String, default="orchestrator")
    meta_data: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)

    session: Mapped["ChatSession"] = relationship("ChatSession", back_populates="messages")

