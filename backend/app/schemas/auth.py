from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, field_validator


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=6, max_length=72)

    @field_validator("password")
    @classmethod
    def strong_password(cls, value: str) -> str:
        if not value.isascii() or not value.isalnum():
            raise ValueError("Password must contain only A-Z, a-z, and 0-9")
        return value


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ProfileUpdateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr | None = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6, max_length=72)

    @field_validator("new_password")
    @classmethod
    def valid_new_password(cls, value: str) -> str:
        if not value.isascii() or not value.isalnum():
            raise ValueError("Password must contain only A-Z, a-z, and 0-9")
        return value


class UserStatusRequest(BaseModel):
    is_active: bool


class LogoutRequest(BaseModel):
    refresh_token: str | None = None


class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: str
    is_active: bool
    created_at: datetime
    last_login_at: datetime | None = None
    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse
