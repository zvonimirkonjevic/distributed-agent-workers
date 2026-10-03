"""Login and logout endpoints issuing opaque session tokens.

See `docs/system-design/authentication.md` for why tokens are opaque rather
than JWTs. Handlers are plain `def` because hashing and the `core` functions
block; FastAPI runs them in its threadpool.
"""
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, status

from api.dependencies import Token
from api.models.auth import LoginRequest, LoginResponse
from api.security import verify_password
from core.auth import create_auth_session, revoke_auth_session
from core.user import get_user_by_email

router = APIRouter(prefix="/auth", tags=["Auth"])

SESSION_LIFETIME = timedelta(days=7)


@router.post("/login", response_model=LoginResponse, summary="Log in with email and password")
def login(body: LoginRequest):
    """Verify credentials and start a new session.

    Returns an opaque session token for the caller to store in an httpOnly
    cookie and send back as `Authorization: Bearer <token>`. An unknown email
    and a wrong password both get the same 401, so responses do not reveal
    which emails are registered.
    """
    user = get_user_by_email(body.email)
    if not verify_password(body.password, user.hashed_password if user else None):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid email or password")

    expires_at = datetime.now(timezone.utc) + SESSION_LIFETIME
    token = create_auth_session(user.id, expires_in=SESSION_LIFETIME)
    return LoginResponse(token=token, expires_at=expires_at)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT, summary="Log out")
def logout(token: Token):
    """Revoke the session that sent this request.

    Idempotent: an unknown, expired, or already revoked token still gets 204,
    since the caller ends up logged out either way.
    """
    revoke_auth_session(token)
