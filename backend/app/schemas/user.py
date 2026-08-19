import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long.")
        if len(v) > 128:
            raise ValueError("Password must be at most 128 characters long.")
        return v

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    password: Optional[str] = None

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            if len(v) < 8:
                raise ValueError("Password must be at least 8 characters long.")
            if len(v) > 128:
                raise ValueError("Password must be at most 128 characters long.")
        return v

class ProfileBase(BaseModel):
    full_name: Optional[str] = None
    target_role: Optional[str] = None
    bio: Optional[str] = None
    preferences: Optional[dict] = None

class ProfileUpdate(ProfileBase):
    pass

class ProfileResponse(ProfileBase):
    id: int
    user_id: int
    overall_score: int = 0
    skills_json: dict = {}
    updated_at: datetime.datetime

    class Config:
        from_attributes = True

class UserResponse(UserBase):
    id: int
    is_active: bool
    is_superuser: bool
    created_at: datetime.datetime
    profile: Optional[ProfileResponse] = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenPayload(BaseModel):
    sub: Optional[str] = None

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_new_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long.")
        if len(v) > 128:
            raise ValueError("Password must be at most 128 characters long.")
        return v
