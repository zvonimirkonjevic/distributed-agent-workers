"""CRUD operations for the `users` table.

Each function runs in its own `session_scope` transaction and returns detached
objects, which stay readable because the session factory disables
`expire_on_commit`. Deletes are soft: they set `deleted_at`, and reads skip
soft-deleted rows.
"""
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from core.database import session_scope
from core.database.models import User


def _get_active_user(db: Session, user_id: str) -> User | None:
    stmt = select(User).where(User.id == user_id, User.deleted_at.is_(None))
    return db.scalars(stmt).one_or_none()


def create_user(
    *,
    firstname: str,
    lastname: str,
    email: str,
    hashed_password: str,
) -> User:
    """Insert a new user.

    Args:
        firstname: User's first name.
        lastname: User's last name.
        email: Unique email address.
        hashed_password: Already hashed password; hashing is the caller's job.

    Returns:
        The new user, with `id` and `created_at` populated.

    Raises:
        sqlalchemy.exc.IntegrityError: If the email is already taken.
    """
    user = User(
        firstname=firstname,
        lastname=lastname,
        email=email,
        hashed_password=hashed_password,
    )
    with session_scope() as db:
        db.add(user)
    return user


def get_user(user_id: str) -> User | None:
    """Fetch a non-deleted user by id.

    Args:
        user_id: User id.

    Returns:
        The user, or None if it does not exist or is soft-deleted.
    """
    with session_scope() as db:
        return _get_active_user(db, user_id)


def get_user_by_email(email: str) -> User | None:
    """Fetch a non-deleted user by email.

    Args:
        email: Email address.

    Returns:
        The user, or None if it does not exist or is soft-deleted.
    """
    stmt = select(User).where(User.email == email, User.deleted_at.is_(None))
    with session_scope() as db:
        return db.scalars(stmt).one_or_none()


def update_user(
    user_id: str,
    *,
    firstname: str | None = None,
    lastname: str | None = None,
    email: str | None = None,
    hashed_password: str | None = None,
) -> User | None:
    """Update the given fields of a non-deleted user.

    Fields left as None are not changed.

    Args:
        user_id: User id.
        firstname: New first name.
        lastname: New last name.
        email: New email address.
        hashed_password: New, already hashed password.

    Returns:
        The updated user, or None if it does not exist or is soft-deleted.

    Raises:
        sqlalchemy.exc.IntegrityError: If the new email is already taken.
    """
    with session_scope() as db:
        user = _get_active_user(db, user_id)
        if user is None:
            return None

        if firstname is not None:
            user.firstname = firstname
        if lastname is not None:
            user.lastname = lastname
        if email is not None:
            user.email = email
        if hashed_password is not None:
            user.hashed_password = hashed_password
        return user


def delete_user(user_id: str) -> bool:
    """Soft-delete a user by setting `deleted_at`.

    The user's chat sessions are left untouched.

    Args:
        user_id: User id.

    Returns:
        True if the user was deleted, False if it does not exist or was
        already soft-deleted.
    """
    with session_scope() as db:
        user = _get_active_user(db, user_id)
        if user is None:
            return False

        user.deleted_at = datetime.now(timezone.utc)
        return True
