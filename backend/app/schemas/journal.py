"""Journal schemas."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator


EntryPrecision = Literal["exact", "approximate", "backfilled"]
EntryStatus = Literal["open", "closed"]


class JournalEntryOut(BaseModel):
    id: int
    ticker: str
    shares: float
    cost_basis: float
    price_per_share: float | None = None

    entry_date: datetime | None = None
    entry_precision: EntryPrecision

    thesis: str | None = None
    stop_loss: float | None = None
    target_price: float | None = None
    time_horizon: str | None = None

    status: EntryStatus
    exit_date: datetime | None = None
    exit_price: float | None = None
    exit_notes: str | None = None

    notes: str | None = None
    created_at: datetime
    updated_at: datetime

    # Derived fields (populated for open/closed positions respectively)
    current_price: float | None = None
    market_value: float | None = None
    unrealized_pnl: float | None = None
    realized_pnl: float | None = None
    pct_change: float | None = None


class JournalAggregates(BaseModel):
    count: int
    total_cost_basis: float
    total_market_value: float | None = None
    unrealized_pnl: float | None = None
    pct_change: float | None = None


class OpenPositionsOut(BaseModel):
    positions: list[JournalEntryOut]
    aggregates: JournalAggregates


class CreateEntryRequest(BaseModel):
    ticker: str = Field(min_length=1, max_length=10)
    shares: float = Field(gt=0)
    cost_basis: float = Field(gt=0)
    entry_date: datetime | None = None
    entry_precision: EntryPrecision = "exact"
    thesis: str | None = None
    stop_loss: float | None = Field(default=None, gt=0)
    target_price: float | None = Field(default=None, gt=0)
    time_horizon: str | None = None
    notes: str | None = None

    @field_validator("ticker")
    @classmethod
    def _upper(cls, v: str) -> str:
        return v.strip().upper()


class UpdateEntryRequest(BaseModel):
    shares: float | None = Field(default=None, gt=0)
    cost_basis: float | None = Field(default=None, gt=0)
    entry_date: datetime | None = None
    entry_precision: EntryPrecision | None = None
    thesis: str | None = None
    stop_loss: float | None = None
    target_price: float | None = None
    time_horizon: str | None = None
    notes: str | None = None


class CloseEntryRequest(BaseModel):
    exit_price: float = Field(gt=0)
    exit_date: datetime | None = None
    exit_notes: str | None = None
