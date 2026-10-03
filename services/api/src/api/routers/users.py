"""CRUD endpoints for users.

Handlers are plain `def` because the `core` CRUD functions are blocking;
FastAPI runs them in its threadpool instead of on the event loop.
"""
from fastapi import APIRouter, HTTPException, status
from sqlalchemy.exc import IntegrityError

from api.models.users import UserCreate, UserResponse, UserUpdate
from api.security import hash_password
from core.user import create_user, delete_user, get_user, update_user

router = APIRouter(prefix="/users", tags=["Users"])

_USER_NOT_FOUND = "user not found"
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

    The password is hashed with Argon2id before it is stored and is never
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


@router.get("/{user_id}", response_model=UserResponse, summary="Get a user by id")
def read(user_id: str):
    """Return the public profile of a single user.

    Responds with 404 if the user does not exist or has been deleted.
    """
    user = get_user(user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, _USER_NOT_FOUND)
    return user


@router.patch("/{user_id}", response_model=UserResponse, summary="Update a user")
def update(user_id: str, body: UserUpdate):
    """Partially update a user's name, email, or password.

    Only fields present and non-null in the body are changed. A new password
    is hashed before it is stored. Responds with 404 if the user does not
    exist or has been deleted, and with 409 if the new email is already
    registered.
    """
    try:
        user = update_user(
            user_id,
            firstname=body.firstname,
            lastname=body.lastname,
            email=body.email,
            hashed_password=hash_password(body.password) if body.password else None,
        )
    except IntegrityError:
        raise HTTPException(status.HTTP_409_CONFLICT, _EMAIL_TAKEN)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, _USER_NOT_FOUND)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a user")
def delete(user_id: str):
    """Soft-delete a user so it no longer appears in any read.

    The row is kept with `deleted_at` set, so its email stays reserved. The
    user's chat sessions are not deleted. Responds with 404 if the user does
    not exist or was already deleted.
    """
    if not delete_user(user_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, _USER_NOT_FOUND)
