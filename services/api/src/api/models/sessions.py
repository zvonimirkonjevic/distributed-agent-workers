"""Request and response schemas for the `/sessions` endpoints."""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class SessionCreate(BaseModel):
    """Body of a chat session creation request."""

    title: str = Field(min_length=1)


class SessionUpdate(BaseModel):
    """Body of a chat session rename request."""

    title: str = Field(min_length=1)


class SessionResponse(BaseModel):
    """Public view of a chat session."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    title: str
    created_at: datetime
