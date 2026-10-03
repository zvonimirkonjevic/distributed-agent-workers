"""Request and response schemas for the `/users` endpoints."""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserCreate(BaseModel):
    """Body of a user creation request."""

    firstname: str = Field(min_length=1)
    lastname: str = Field(min_length=1)
    email: EmailStr
    password: str = Field(min_length=8)


class UserUpdate(BaseModel):
    """Body of a partial user update; omitted or null fields are not changed."""

    firstname: str | None = Field(default=None, min_length=1)
    lastname: str | None = Field(default=None, min_length=1)
    email: EmailStr | None = None
    password: str | None = Field(default=None, min_length=8)


class UserResponse(BaseModel):
    """Public view of a user; never exposes the password hash."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    firstname: str
    lastname: str
    email: EmailStr
    created_at: datetime
