"""CRUD endpoints for the logged-in user's chat sessions.

The owner always comes from the session token, never from the request.
Sessions owned by someone else get the same 404 as missing ones, so ids of
other users' sessions cannot be probed. Handlers are plain `def` because the
`core` CRUD functions are blocking; FastAPI runs them in its threadpool
instead of on the event loop.
"""
from fastapi import APIRouter, HTTPException, status

from api.dependencies import CurrentUser
from api.models.sessions import SessionCreate, SessionResponse, SessionUpdate
from core.database.models import ChatSession, User
from core.session import (
    create_chat_session,
    delete_chat_session,
    get_chat_session,
    list_chat_sessions,
    update_chat_session,
)

router = APIRouter(prefix="/sessions", tags=["Sessions"])

_SESSION_NOT_FOUND = "session not found"


def _get_owned_session(session_id: str, user: User) -> ChatSession:
    chat_session = get_chat_session(session_id)
    if chat_session is None or chat_session.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, _SESSION_NOT_FOUND)
    return chat_session


@router.post(
    "",
    response_model=SessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a chat session",
)
def create(user: CurrentUser, body: SessionCreate):
    """Start a new, empty chat session owned by the logged-in user."""
    return create_chat_session(user_id=user.id, title=body.title)


@router.get("", response_model=list[SessionResponse], summary="List my chat sessions")
def list_mine(user: CurrentUser):
    """Return every chat session the logged-in user owns, newest first.

    Deleted sessions are excluded.
    """
    return list_chat_sessions(user.id)


@router.get("/{session_id}", response_model=SessionResponse, summary="Get a chat session by id")
def read(user: CurrentUser, session_id: str):
    """Return a single chat session's metadata.

    Responds with 404 if the session does not exist, has been deleted, or
    belongs to another user.
    """
    return _get_owned_session(session_id, user)


@router.patch("/{session_id}", response_model=SessionResponse, summary="Rename a chat session")
def update(user: CurrentUser, session_id: str, body: SessionUpdate):
    """Replace a chat session's title.

    Responds with 404 if the session does not exist, has been deleted, or
    belongs to another user.
    """
    _get_owned_session(session_id, user)
    chat_session = update_chat_session(session_id, title=body.title)
    if chat_session is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, _SESSION_NOT_FOUND)
    return chat_session


@router.delete(
    "/{session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a chat session",
)
def delete(user: CurrentUser, session_id: str):
    """Soft-delete a chat session so it no longer appears in any read.

    The row is kept with `deleted_at` set. Responds with 404 if the session
    does not exist, was already deleted, or belongs to another user.
    """
    _get_owned_session(session_id, user)
    if not delete_chat_session(session_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, _SESSION_NOT_FOUND)
