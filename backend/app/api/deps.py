"""
Shared FastAPI dependencies: DB session and current-user auth.

Use these via `Depends(get_db)` / `Depends(get_current_user)` in route signatures.
"""

from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.auth.tokens import TokenError, decode_access_token
from app.db.models import User
from app.db.session import get_db
from app.services import users


# OAuth2PasswordBearer exists purely to extract "Authorization: Bearer <token>"
# and show a proper auth button in Swagger UI. We aren't using the OAuth2 flow.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=True)


def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_access_token(token)
    except TokenError:
        raise credentials_error from None

    user_id_raw = payload.get("sub")
    if user_id_raw is None:
        raise credentials_error
    try:
        user_id = int(user_id_raw)
    except (TypeError, ValueError):
        raise credentials_error from None

    user = users.get_by_id(db, user_id)
    if user is None or not user.is_active:
        raise credentials_error
    return user


DbSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]
