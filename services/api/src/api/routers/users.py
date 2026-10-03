"""Endpoints for registering users and managing the logged-in user.

There are no routes taking a user id: a user can only read and change their
own record, identified by the session token. Handlers are plain `def` because
the `core` CRUD functions are blocking; FastAPI runs them in its threadpool
instead of on the event loop.
"""
from fastapi import APIRouter, HTTPException, status
from sqlalchemy.exc import IntegrityError

from api.dependencies import CurrentUser
from api.models.users import UserCreate, UserResponse, UserUpdate
from api.security import hash_password, verify_password
from core.auth import revoke_user_auth_sessions
from core.user import create_user, delete_user, update_user

router = APIRouter(prefix="/users", tags=["Users"])

# The unique constraint also covers soft-deleted users, so a deleted user's
# email stays taken.
_EMAIL_TAKEN = "email already registered"


@router.post(
    "",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
)
def create(body: UserCreate):
    """Create a user account from a name, email, and plaintext password.

    Public, since it is the sign up step; it does not log the user in. The
    password is hashed with Argon2id before it is stored and is never
    returned. Responds with 409 if the email is already registered, including
    by a deleted account, since deleted users keep their email reserved.
    """
    try:
        return create_user(
            firstname=body.firstname,
            lastname=body.lastname,
            email=body.email,
            hashed_password=hash_password(body.password),
        )
    except IntegrityError:
        raise HTTPException(status.HTTP_409_CONFLICT, _EMAIL_TAKEN)


@router.get("/me", response_model=UserResponse, summary="Get the logged-in user")
def read_me(user: CurrentUser):
    """Return the profile of the user who owns the session token."""
    return user


@router.patch("/me", response_model=UserResponse, summary="Update the logged-in user")
def update_me(user: CurrentUser, body: UserUpdate):
    """Partially update the logged-in user's name, email, or password.

    Requires the user's current password, and responds with 403 if it is
    wrong; 403 rather than 401, so clients do not mistake a typo for an
    expired session. Only fields present and non-null in the body are
    changed. A new password is hashed before it is stored, and changing it
    revokes every session of the user, including the current one, so the
    client must log in again. Responds with 409 if the new email is already
    registered.
    """
    if not verify_password(body.current_password, user.hashed_password):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "invalid current password")

    try:
        updated = update_user(
            user.id,
            firstname=body.firstname,
            lastname=body.lastname,
            email=body.email,
            hashed_password=hash_password(body.new_password) if body.new_password else None,
        )
    except IntegrityError:
        raise HTTPException(status.HTTP_409_CONFLICT, _EMAIL_TAKEN)
    if updated is None:
        # Deleted between authentication and the update.
        raise HTTPException(status.HTTP_404_NOT_FOUND, "user not found")
    if body.new_password:
        revoke_user_auth_sessions(user.id)
    return updated


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT, summary="Delete the logged-in user")
def delete_me(user: CurrentUser):
    """Soft-delete the logged-in user.

    The row is kept with `deleted_at` set, so its email stays reserved, and
    the user's chat sessions are not deleted. All of the user's session
    tokens stop working immediately, since token checks skip deleted users.
    """
    delete_user(user.id)
