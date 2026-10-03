"""Request and response schemas for the `/sessions/{session_id}/messages` endpoints."""
from typing import Literal

from pydantic import BaseModel, Field


class MessageCreate(BaseModel):
    """Body of a send-message request."""

    content: str = Field(min_length=1)


class MessageResponse(BaseModel):
    """Public view of one chat message.

    Only user and assistant text is exposed; tool calls, tool results, and
    system messages stay inside the agent's checkpoint.
    """

    id: str
    role: Literal["user", "assistant"]
    content: str
