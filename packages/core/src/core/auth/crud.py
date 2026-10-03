"""Operations on the `auth_sessions` table (`AuthSession` model).

The raw token is returned to the caller exactly once, at creation, and is
never stored; rows hold only its SHA-256 hash. A session is valid while it is
unrevoked, unexpired, and its user is not soft-deleted. Each function runs in
its own `session_scope` transaction.
"""
import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, update

from core.database import session_scope
from core.database.models import AuthSession, User


def _hash_token(token: str) -> str:
    # A fast unsalted hash is enough: the token is 256 random bits, so unlike a
    # password it cannot be brute-forced, and lookups must stay a single index hit.
    return hashlib.sha256(token.encode()).hexdigest()


def create_auth_session(user_id: str, *, expires_in: timedelta) -> str:
    """Start a login session for a user.

    Args:
        user_id: Id of the user who logged in.
        expires_in: Lifetime of the session from now.

    Returns:
        The raw session token, to be sent to the client. It cannot be
        recovered later.

    Raises:
        sqlalchemy.exc.IntegrityError: If `user_id` does not reference an
            existing user.
    """
    token = secrets.token_urlsafe(32)
    auth_session = AuthSession(
        user_id=user_id,
        token_hash=_hash_token(token),
        expires_at=datetime.now(timezone.utc) + expires_in,
    )
    with session_scope() as db:
        db.add(auth_session)
    return token


def get_user_by_token(token: str) -> User | None:
    """Resolve a session token to its user.

    Args:
        token: Raw session token from the client.

    Returns:
        The user, or None if the token is unknown, revoked, or expired, or
        the user is soft-deleted.
    """
    stmt = (
        select(User)
        .join(AuthSession, AuthSession.user_id == User.id)
        .where(
            AuthSession.token_hash == _hash_token(token),
            AuthSession.revoked_at.is_(None),
            AuthSession.expires_at > datetime.now(timezone.utc),
            User.deleted_at.is_(None),
        )
    )
    with session_scope() as db:
        return db.scalars(stmt).one_or_none()


def revoke_auth_session(token: str) -> bool:
    """Revoke one session, e.g. on logout.

    Args:
        token: Raw session token from the client.

    Returns:
        True if an active session was revoked, False if the token is unknown
        or was already revoked.
    """
    stmt = (
        update(AuthSession)
        .where(
            AuthSession.token_hash == _hash_token(token),
            AuthSession.revoked_at.is_(None),
        )
        .values(revoked_at=datetime.now(timezone.utc))
    )
    with session_scope() as db:
        return db.execute(stmt).rowcount > 0


def revoke_user_auth_sessions(user_id: str) -> int:
    """Revoke every active session of a user, e.g. on password change.

    Args:
        user_id: User id.

    Returns:
        The number of sessions revoked.
    """
    stmt = (
        update(AuthSession)
        .where(AuthSession.user_id == user_id, AuthSession.revoked_at.is_(None))
        .values(revoked_at=datetime.now(timezone.utc))
    )
    with session_scope() as db:
        return db.execute(stmt).rowcount
