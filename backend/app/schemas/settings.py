"""User settings schemas."""

from datetime import datetime

from pydantic import BaseModel, Field


class SettingsOut(BaseModel):
    brokerage_cash: float | None = None
    risk_profile_note: str | None = None
    updated_at: datetime


class UpdateSettingsRequest(BaseModel):
    brokerage_cash: float | None = Field(default=None, ge=0)
    risk_profile_note: str | None = Field(default=None, max_length=500)
