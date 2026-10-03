"""CRUD operations for the `sessions` table (`ChatSession` model).

Each function runs in its own `session_scope` transaction and returns detached
objects, which stay readable because the session factory disables
`expire_on_commit`. Deletes are soft: they set `deleted_at`, and reads skip
soft-deleted rows.
"""
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from core.database import session_scope
from core.database.models import ChatSession


def _get_active_chat_session(db: Session, session_id: str) -> ChatSession | None:
    stmt = select(ChatSession).where(
        ChatSession.id == session_id,
        ChatSession.deleted_at.is_(None),
    )
    return db.scalars(stmt).one_or_none()


def create_chat_session(*, user_id: str, title: str) -> ChatSession:
    """Insert a new chat session for a user.

    Args:
        user_id: Id of the owning user.
        title: Session title.

    Returns:
        The new chat session, with `id` and `created_at` populated.

    Raises:
        sqlalchemy.exc.IntegrityError: If `user_id` does not reference an
            existing user.
    """
    chat_session = ChatSession(user_id=user_id, title=title)
    with session_scope() as db:
        db.add(chat_session)
    return chat_session


def get_chat_session(session_id: str) -> ChatSession | None:
    """Fetch a non-deleted chat session by id.

    Args:
        session_id: Chat session id.

    Returns:
        The chat session, or None if it does not exist or is soft-deleted.
    """
    with session_scope() as db:
        return _get_active_chat_session(db, session_id)


def list_chat_sessions(user_id: str) -> list[ChatSession]:
    """List a user's non-deleted chat sessions, newest first.

    Args:
        user_id: Id of the owning user.

    Returns:
        The user's chat sessions; empty if there are none.
    """
    stmt = (
        select(ChatSession)
        .where(ChatSession.user_id == user_id, ChatSession.deleted_at.is_(None))
        .order_by(ChatSession.created_at.desc())
    )
    with session_scope() as db:
        return list(db.scalars(stmt))


def update_chat_session(session_id: str, *, title: str) -> ChatSession | None:
    """Rename a non-deleted chat session.

    Args:
        session_id: Chat session id.
        title: New session title.

    Returns:
        The updated chat session, or None if it does not exist or is
        soft-deleted.
    """
    with session_scope() as db:
        chat_session = _get_active_chat_session(db, session_id)
        if chat_session is None:
            return None

        chat_session.title = title
        return chat_session


def delete_chat_session(session_id: str) -> bool:
    """Soft-delete a chat session by setting `deleted_at`.

    Args:
        session_id: Chat session id.

    Returns:
        True if the chat session was deleted, False if it does not exist or
        was already soft-deleted.
    """
    with session_scope() as db:
        chat_session = _get_active_chat_session(db, session_id)
        if chat_session is None:
            return False

        chat_session.deleted_at = datetime.now(timezone.utc)
        return True
