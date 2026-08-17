import datetime
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Literal

class ChatMessageCreate(BaseModel):
    role: Literal["user"]  # Clients can only generate "user" role messages to prevent impersonating "assistant" or "system"
    content: str = Field(..., min_length=1, max_length=5000)
    agent_name: Optional[str] = "orchestrator"
    meta_data: Optional[Dict[str, Any]] = None

class ChatMessageResponse(BaseModel):
    id: int
    session_id: int
    role: Literal["user", "assistant", "system"]
    content: str
    agent_name: str
    meta_data: Dict[str, Any]
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class ChatSessionCreate(BaseModel):
    title: Optional[str] = "New Conversation"

class ChatSessionResponse(BaseModel):
    id: int
    user_id: int
    title: str
    created_at: datetime.datetime
    updated_at: datetime.datetime
    messages: List[ChatMessageResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True

class ChatSessionHeaderResponse(BaseModel):
    id: int
    user_id: int
    title: str
    created_at: datetime.datetime
    updated_at: datetime.datetime

    class Config:
        from_attributes = True
