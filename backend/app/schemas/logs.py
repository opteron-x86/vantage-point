"""Interaction log schemas."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel


class InteractionSummary(BaseModel):
    id: str
    timestamp: datetime
    session_id: str | None
    purpose: str
    provider: str
    model: str
    input_tokens: int | None
    output_tokens: int | None
    cost_usd: float | None
    duration_ms: int | None
    stop_reason: str | None
    error: str | None

    class Config:
        from_attributes = True


class InteractionDetail(InteractionSummary):
    system_prompt: str | None
    messages: list[dict[str, Any]] | None
    tools: list[dict[str, Any]] | None
    response_text: str | None
    tool_calls: list[dict[str, Any]] | None


class SessionSummary(BaseModel):
    session_id: str
    started: datetime
    ended: datetime
    turns: int
    total_cost: float | None
    purposes: list[str]


class CostRow(BaseModel):
    day: str
    purpose: str
    model: str
    calls: int
    input_tokens: int
    output_tokens: int
    cost_usd: float
