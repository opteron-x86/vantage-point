"""Watchlist schemas."""

from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class WatchlistItemOut(BaseModel):
    ticker: str
    position: int
    added_at: datetime
    name: str | None = None
    sector: str | None = None
    industry: str | None = None

    class Config:
        from_attributes = True


class AddTickerRequest(BaseModel):
    ticker: str = Field(min_length=1, max_length=10)

    @field_validator("ticker")
    @classmethod
    def _upper(cls, v: str) -> str:
        return v.strip().upper()


class ReorderRequest(BaseModel):
    tickers: list[str] = Field(min_length=1)

    @field_validator("tickers")
    @classmethod
    def _upper_all(cls, v: list[str]) -> list[str]:
        return [t.strip().upper() for t in v]
