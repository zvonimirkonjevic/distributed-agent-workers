"""CRUD endpoints for chat sessions.

The app runs locally for a single user, so there is no authentication and no
ownership: every session is visible to every caller. Handlers are plain `def`
because the `core` CRUD functions are blocking; FastAPI runs them in its
threadpool instead of on the event loop.
"""
from fastapi import APIRouter, HTTPException, status

from api.models.sessions import SessionCreate, SessionResponse, SessionUpdate
from core.session import (
    create_chat_session,
    delete_chat_session,
    get_chat_session,
    list_chat_sessions,
    update_chat_session,
)

router = APIRouter(prefix="/sessions", tags=["Sessions"])

_SESSION_NOT_FOUND = "session not found"


@router.post(
    "",
    response_model=SessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a chat session",
)
def create(body: SessionCreate):
    """Start a new, empty chat session."""
    return create_chat_session(title=body.title)


@router.get("", response_model=list[SessionResponse], summary="List chat sessions")
def list_all():
    """Return every chat session, newest first.

    Deleted sessions are excluded.
    """
    return list_chat_sessions()


@router.get("/{session_id}", response_model=SessionResponse, summary="Get a chat session by id")
def read(session_id: str):
    """Return a single chat session's metadata.

    Responds with 404 if the session does not exist or has been deleted.
    """
    chat_session = get_chat_session(session_id)
    if chat_session is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, _SESSION_NOT_FOUND)
    return chat_session


@router.patch("/{session_id}", response_model=SessionResponse, summary="Rename a chat session")
def update(session_id: str, body: SessionUpdate):
    """Replace a chat session's title.

    Responds with 404 if the session does not exist or has been deleted.
    """
    chat_session = update_chat_session(session_id, title=body.title)
    if chat_session is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, _SESSION_NOT_FOUND)
    return chat_session


@router.delete(
    "/{session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a chat session",
)
def delete(session_id: str):
    """Soft-delete a chat session so it no longer appears in any read.

    The row is kept with `deleted_at` set. Responds with 404 if the session
    does not exist or was already deleted.
    """
    if not delete_chat_session(session_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, _SESSION_NOT_FOUND)
