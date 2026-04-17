"""
AI settings service.

Resolves the effective AI configuration by layering, in order:
  1. DB overrides (the user's ai_config row, if present)
  2. Environment variables (app.config.settings)
  3. Hardcoded defaults (app.ai.pricing.DEFAULT_MODELS)
"""

from dataclasses import dataclass
from typing import Any

from sqlalchemy.orm import Session

from app.ai.pricing import DEFAULT_MODELS
from app.config import Provider, settings
from app.db.models import AIConfig


VALID_PROVIDERS: tuple[Provider, ...] = ("anthropic", "openrouter")


@dataclass
class EffectiveAIConfig:
    provider: Provider
    model_briefing: str
    model_classifier: str
    db_provider: Provider | None
    db_model_briefing: str | None
    db_model_classifier: str | None
    anthropic_key_configured: bool
    openrouter_key_configured: bool


def _get_row(db: Session, user_id: int) -> AIConfig | None:
    return db.get(AIConfig, user_id)


def resolve(db: Session, *, user_id: int) -> EffectiveAIConfig:
    row = _get_row(db, user_id)

    db_provider: Provider | None = None
    if row and row.provider in VALID_PROVIDERS:
        db_provider = row.provider  # type: ignore[assignment]
    effective_provider: Provider = db_provider or settings.ai_provider

    db_briefing = row.model_briefing if row else None
    db_classifier = row.model_classifier if row else None

    model_briefing = (
        db_briefing
        or settings.model_briefing
        or DEFAULT_MODELS[effective_provider]["briefing"]
    )
    model_classifier = (
        db_classifier
        or settings.model_classifier
        or DEFAULT_MODELS[effective_provider]["classifier"]
    )

    return EffectiveAIConfig(
        provider=effective_provider,
        model_briefing=model_briefing,
        model_classifier=model_classifier,
        db_provider=db_provider,
        db_model_briefing=db_briefing,
        db_model_classifier=db_classifier,
        anthropic_key_configured=bool(settings.anthropic_api_key),
        openrouter_key_configured=bool(settings.openrouter_api_key),
    )


def update(
    db: Session,
    *,
    user_id: int,
    provider: Provider | None,
    model_briefing: str | None,
    model_classifier: str | None,
) -> AIConfig:
    row = _get_row(db, user_id)
    if row is None:
        row = AIConfig(user_id=user_id)
        db.add(row)

    row.provider = provider
    row.model_briefing = model_briefing
    row.model_classifier = model_classifier

    db.commit()
    db.refresh(row)
    return row


def serialize(cfg: EffectiveAIConfig) -> dict[str, Any]:
    return {
        "effective": {
            "provider": cfg.provider,
            "model_briefing": cfg.model_briefing,
            "model_classifier": cfg.model_classifier,
        },
        "overrides": {
            "provider": cfg.db_provider,
            "model_briefing": cfg.db_model_briefing,
            "model_classifier": cfg.db_model_classifier,
        },
        "env": {
            "anthropic_key_configured": cfg.anthropic_key_configured,
            "openrouter_key_configured": cfg.openrouter_key_configured,
        },
        "defaults": {
            "anthropic": DEFAULT_MODELS["anthropic"],
            "openrouter": DEFAULT_MODELS["openrouter"],
        },
    }
