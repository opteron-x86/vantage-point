"""User settings endpoints."""

from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.schemas.settings import SettingsOut, UpdateSettingsRequest
from app.services import settings as settings_service

router = APIRouter()


@router.get("", response_model=SettingsOut)
def get_settings(db: DbSession, user: CurrentUser) -> SettingsOut:
    settings = settings_service.get_or_create(db, user_id=user.id)
    return SettingsOut.model_validate(settings_service.serialize(settings))


@router.patch("", response_model=SettingsOut)
def update_settings(
    body: UpdateSettingsRequest, db: DbSession, user: CurrentUser
) -> SettingsOut:
    settings = settings_service.update(
        db,
        user_id=user.id,
        brokerage_cash=body.brokerage_cash,
        risk_profile_note=body.risk_profile_note,
    )
    return SettingsOut.model_validate(settings_service.serialize(settings))
