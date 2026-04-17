"""Briefing schemas."""

from datetime import datetime

from pydantic import BaseModel


class BriefingOut(BaseModel):
    id: int
    date: datetime
    session_id: str | None
    content_markdown: str
    model: str

    class Config:
        from_attributes = True


class BriefingSummary(BaseModel):
    """Lightweight list entry (no full content)."""
    id: int
    date: datetime
    model: str

    class Config:
        from_attributes = True


class GenerateBriefingResult(BaseModel):
    id: int
    session_id: str
    content_markdown: str
    model: str
    date: str
    tool_calls: list[dict] = []
