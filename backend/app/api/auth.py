"""Authentication endpoints."""

import secrets

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.api.deps import CurrentUser, DbSession
from app.auth.tokens import create_access_token
from app.config import settings
from app.schemas.auth import LoginRequest, TokenResponse, UserInfo
from app.services import users

router = APIRouter()


class BootstrapStatus(BaseModel):
    available: bool
    reason: str | None = None


class BootstrapRequest(BaseModel):
    token: str
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=8, max_length=256)


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: DbSession) -> TokenResponse:
    user = users.authenticate(db, username=body.username, password=body.password)
    if user is None:
        # Same 401 regardless of which part failed — don't leak user enumeration
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )
    token = create_access_token(subject=user.id, extra={"username": user.username})
    return TokenResponse(
        access_token=token,
        expires_in=settings.jwt_expire_hours * 3600,
    )


@router.get("/me", response_model=UserInfo)
def me(user: CurrentUser) -> UserInfo:
    return UserInfo.model_validate(user)


@router.get("/bootstrap/status", response_model=BootstrapStatus)
def bootstrap_status(db: DbSession) -> BootstrapStatus:
    """
    Tells the frontend whether the /setup page should be reachable.
    Available only when BOOTSTRAP_TOKEN is set AND no users exist.
    """
    if not settings.bootstrap_token:
        return BootstrapStatus(available=False, reason="BOOTSTRAP_TOKEN not set")
    if users.count_users(db) > 0:
        return BootstrapStatus(available=False, reason="Users already exist")
    return BootstrapStatus(available=True)


@router.post("/bootstrap", response_model=TokenResponse)
def bootstrap(body: BootstrapRequest, db: DbSession) -> TokenResponse:
    """
    Create the first user using the one-time BOOTSTRAP_TOKEN.
    Rejects once any user exists.
    """
    if not settings.bootstrap_token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bootstrap flow is not enabled",
        )
    if not secrets.compare_digest(body.token, settings.bootstrap_token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid bootstrap token",
        )
    if users.count_users(db) > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account already exists. Disable BOOTSTRAP_TOKEN.",
        )
    if len(body.password.encode("utf-8")) > 72:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be 72 bytes or fewer",
        )

    user = users.create_user(db, username=body.username, password=body.password)
    access_token = create_access_token(
        subject=user.id, extra={"username": user.username}
    )
    return TokenResponse(
        access_token=access_token,
        expires_in=settings.jwt_expire_hours * 3600,
    )
