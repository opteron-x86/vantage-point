"""AI settings schemas."""

from typing import Literal

from pydantic import BaseModel, Field


ProviderLiteral = Literal["anthropic", "openrouter"]


class EffectiveBlock(BaseModel):
    provider: ProviderLiteral
    model_briefing: str
    model_classifier: str


class OverridesBlock(BaseModel):
    provider: ProviderLiteral | None = None
    model_briefing: str | None = None
    model_classifier: str | None = None


class EnvBlock(BaseModel):
    anthropic_key_configured: bool
    openrouter_key_configured: bool


class DefaultsBlock(BaseModel):
    anthropic: dict[str, str]
    openrouter: dict[str, str]


class AISettingsOut(BaseModel):
    effective: EffectiveBlock
    overrides: OverridesBlock
    env: EnvBlock
    defaults: DefaultsBlock


class UpdateAISettingsRequest(BaseModel):
    provider: ProviderLiteral | None = None
    model_briefing: str | None = Field(default=None, max_length=64)
    model_classifier: str | None = Field(default=None, max_length=64)
