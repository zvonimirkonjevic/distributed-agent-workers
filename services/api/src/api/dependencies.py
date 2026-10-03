"""Shared request dependencies: resolving the login token to a user.

Next.js server code forwards the httpOnly session cookie as an
`Authorization: Bearer <token>` header (see
`docs/system-design/frontend-backend-integration.md`).
"""
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from core.auth import get_user_by_token
from core.database.models import User

# auto_error=False so a missing header gets the same 401 as a bad token.
_bearer = HTTPBearer(auto_error=False)


def _unauthorized() -> HTTPException:
    return HTTPException(
        status.HTTP_401_UNAUTHORIZED,
        "not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_token(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> str:
    """Extract the raw session token from the Authorization header.

    Raises:
        HTTPException: 401 if the header is missing or not a Bearer token.
    """
    if credentials is None:
        raise _unauthorized()
    return credentials.credentials


def get_current_user(token: Annotated[str, Depends(get_token)]) -> User:
    """Resolve the session token to its user.

    Raises:
        HTTPException: 401 if the token is unknown, revoked, or expired, or
            the user is deleted.
    """
    user = get_user_by_token(token)
    if user is None:
        raise _unauthorized()
    return user


Token = Annotated[str, Depends(get_token)]
CurrentUser = Annotated[User, Depends(get_current_user)]
