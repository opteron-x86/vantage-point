"""AI settings endpoints."""

from fastapi import APIRouter, HTTPException

from app.api.deps import CurrentUser, DbSession
from app.config import settings as app_settings
from app.schemas.ai_settings import AISettingsOut, UpdateAISettingsRequest
from app.services import ai_settings

router = APIRouter()


@router.get("", response_model=AISettingsOut)
def get_ai_settings(db: DbSession, user: CurrentUser) -> AISettingsOut:
    cfg = ai_settings.resolve(db, user_id=user.id)
    return AISettingsOut.model_validate(ai_settings.serialize(cfg))


@router.patch("", response_model=AISettingsOut)
def update_ai_settings(
    body: UpdateAISettingsRequest, db: DbSession, user: CurrentUser
) -> AISettingsOut:
    if body.provider == "anthropic" and not app_settings.anthropic_api_key:
        raise HTTPException(
            status_code=400,
            detail="ANTHROPIC_API_KEY is not configured in the environment",
        )
    if body.provider == "openrouter" and not app_settings.openrouter_api_key:
        raise HTTPException(
            status_code=400,
            detail="OPENROUTER_API_KEY is not configured in the environment",
        )

    ai_settings.update(
        db,
        user_id=user.id,
        provider=body.provider,
        model_briefing=body.model_briefing,
        model_classifier=body.model_classifier,
    )
    cfg = ai_settings.resolve(db, user_id=user.id)
    return AISettingsOut.model_validate(ai_settings.serialize(cfg))
