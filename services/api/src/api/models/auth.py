"""Request and response schemas for the `/auth` endpoints."""
from datetime import datetime

from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    """Body of a login request."""

    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    """A new session token and when it expires."""

    token: str
    # Lets the caller give the cookie the same lifetime as the session.
    expires_at: datetime
