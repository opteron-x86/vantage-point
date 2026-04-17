"""
User settings service.

Small, optional account context the AI can reference:
  - brokerage_cash: how much dry powder is available
  - risk_profile_note: freeform text like "taxable account, play money"

Both are scoped to the trading/brokerage context only. We deliberately
don't model 401k/IRA/net worth — those are not actionable for this app.
"""

from typing import Any

from sqlalchemy.orm import Session

from app.db.models import UserSettings


def get_or_create(db: Session, *, user_id: int) -> UserSettings:
    settings = db.get(UserSettings, user_id)
    if settings is None:
        settings = UserSettings(user_id=user_id)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


def update(
    db: Session,
    *,
    user_id: int,
    brokerage_cash: float | None = None,
    risk_profile_note: str | None = None,
) -> UserSettings:
    settings = get_or_create(db, user_id=user_id)
    # Use explicit sentinel distinction: None means "don't touch",
    # but we also want to support clearing. For v1, we treat None
    # as "no change" and let the caller send explicit empty values.
    if brokerage_cash is not None:
        settings.brokerage_cash = brokerage_cash
    if risk_profile_note is not None:
        settings.risk_profile_note = risk_profile_note
    db.commit()
    db.refresh(settings)
    return settings


def serialize(settings: UserSettings) -> dict[str, Any]:
    return {
        "brokerage_cash": settings.brokerage_cash,
        "risk_profile_note": settings.risk_profile_note,
        "updated_at": settings.updated_at.isoformat(),
    }


def get_account_context(db: Session, *, user_id: int) -> dict[str, Any]:
    """
    Snapshot for the AI — includes cash, risk profile, and a note on what's
    in scope. The AI should read this before giving position-sizing advice.
    """
    settings = db.get(UserSettings, user_id)
    return {
        "brokerage_cash": settings.brokerage_cash if settings else None,
        "risk_profile_note": settings.risk_profile_note if settings else None,
        "note": (
            "This context covers the user's brokerage/trading account only. "
            "It does NOT include 401k, IRA, or broader financial picture. "
            "If a field is null, the user hasn't set it — ask them or acknowledge the gap."
        ),
    }
