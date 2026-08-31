import os
from typing import List, Union
from pydantic import AnyHttpUrl, BeforeValidator, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing_extensions import Annotated

def parse_cors(v: Union[str, List[str]]) -> List[str]:
    if isinstance(v, str) and not v.startswith("["):
        return [i.strip() for i in v.split(",")]
    elif isinstance(v, (list, str)):
        return v
    raise ValueError(v)

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_ignore_empty=True, extra="ignore"
    )
    
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "A.C.E. (Autonomous Career Intelligence Engine)"
    
    # Security
    SECRET_KEY: str = "SUPER_SECRET_SECURITY_KEY_CHANGE_ME_IN_PRODUCTION"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        env = os.environ.get("ENVIRONMENT", "development").lower()
        if env == "production" or os.environ.get("NODE_ENV") == "production":
            if not v or v == "SUPER_SECRET_SECURITY_KEY_CHANGE_ME_IN_PRODUCTION":
                raise ValueError("SECRET_KEY must be changed in a production environment!")
        return v
    
    # CORS
    BACKEND_CORS_ORIGINS: Annotated[
        List[str], BeforeValidator(parse_cors)
    ] = ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000"]

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/ace"
    
    # AI Keys
    GEMINI_API_KEY: str = ""
    # Primary Groq key (backward-compat).
    # Keys 1-4 are additional keys for round-robin rotation.
    GROQ_API_KEY: str = ""
    GROQ_API_KEY_1: str = ""
    GROQ_API_KEY_2: str = ""
    GROQ_API_KEY_3: str = ""
    GROQ_API_KEY_4: str = ""
    TAVILY_API_KEY: str = ""

    # Adzuna API keys
    ADZUNA_APP_ID: str = ""
    ADZUNA_APP_KEY: str = ""
    ADZUNA_COUNTRY: str = "in"

    @property
    def groq_api_keys(self) -> list:
        """Return all configured Groq API keys as a deduplicated, ordered list.
        GROQ_API_KEY always comes first, followed by keys 1-4.
        Empty strings are excluded automatically.
        """
        candidates = [
            self.GROQ_API_KEY,
            self.GROQ_API_KEY_1,
            self.GROQ_API_KEY_2,
            self.GROQ_API_KEY_3,
            self.GROQ_API_KEY_4,
        ]
        seen = set()
        keys = []
        for k in candidates:
            stripped = k.strip()
            if stripped and stripped not in seen:
                seen.add(stripped)
                keys.append(stripped)
        return keys

    # Resume upload constraints
    MAX_RESUME_SIZE_BYTES: int = 5 * 1024 * 1024  # 5 MB hard limit
    ALLOWED_RESUME_EXTENSIONS: set = {".pdf", ".docx", ".txt"}

    # Phase 11 Hardening Constraints
    LLM_EVALUATION_TIMEOUT: float = 45.0
    LLM_QUESTION_TIMEOUT: float = 30.0
    LLM_SUMMARY_TIMEOUT: float = 35.0
    STT_TIMEOUT: float = 40.0
    INTERVIEW_PROCESSING_TIMEOUT: float = 60.0
    RATE_LIMIT_ENABLED: bool = True

    MAX_AUDIO_SIZE_BYTES: int = 15 * 1024 * 1024  # 15 MB limit
    ALLOWED_AUDIO_EXTENSIONS: set = {".mp3", ".wav", ".webm", ".m4a", ".ogg"}
    MAX_AUDIO_DURATION_SECONDS: float = 600.0  # 10 mins

    # Phase 12 Bounded Agent Execution Settings
    AGENT_MAX_ITERATIONS: int = 12
    AGENT_MAX_TOOL_CALLS: int = 8
    AGENT_EXECUTION_TIMEOUT: float = 50.0

settings = Settings()

import contextvars
tool_calls_counter: contextvars.ContextVar[dict] = contextvars.ContextVar("tool_calls_counter", default=None)


