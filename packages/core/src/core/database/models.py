"""SQLAlchemy ORM models."""
from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import DateTime
from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    mapped_column,
)


class Base(DeclarativeBase):
    """Single declarative base for all models."""

    pass


class ChatSession(Base):
    """Chat session model."""

    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(primary_key=True, default=lambda: str(uuid4()))
    title: Mapped[str] = mapped_column(nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

