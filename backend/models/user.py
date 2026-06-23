"""
models/user.py — Pydantic schemas for user-related requests/responses.
"""
from pydantic import BaseModel, EmailStr, field_validator
import re


class SignupRequest(BaseModel):
    email: EmailStr                      # validates format automatically
    password: str

    @field_validator("email")
    @classmethod
    def normalise_email(cls, v: str) -> str:
        return v.strip().lower()         # consistent storage format

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if len(v) > 128:
            raise ValueError("Password must be under 128 characters")
        if not re.search(r"[A-Za-z]", v):
            raise ValueError("Password must contain at least one letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one number")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str

    @field_validator("email")
    @classmethod
    def normalise_email(cls, v: str) -> str:
        return v.strip().lower()

    @field_validator("password")
    @classmethod
    def cap_password_length(cls, v: str) -> str:
        # Prevent bcrypt DoS via extremely long passwords
        if len(v) > 128:
            raise ValueError("Invalid credentials")
        return v


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

