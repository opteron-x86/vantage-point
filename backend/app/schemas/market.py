"""Market data, news, and technicals schemas."""

from datetime import datetime

from pydantic import BaseModel


# ---- Bars ----

class BarOut(BaseModel):
    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    volume: int
    vwap: float | None = None

    class Config:
        from_attributes = True


class PriceHistoryOut(BaseModel):
    ticker: str
    bars: list[BarOut]
    bar_count: int
    period_start: str | None = None
    period_end: str | None = None
    period_change_pct: float | None = None
    latest_close: float | None = None


# ---- News ----

class ArticleOut(BaseModel):
    id: str
    ticker: str
    published_at: datetime
    source: str | None = None
    headline: str
    summary: str | None = None
    url: str | None = None
    relevance_score: int = 0

    class Config:
        from_attributes = True


class NewsListOut(BaseModel):
    ticker: str
    article_count: int
    articles: list[ArticleOut]


# ---- Technicals ----

class TechnicalsOut(BaseModel):
    ticker: str
    latest_close: float | None = None
    sma_5: float | None = None
    sma_10: float | None = None
    sma_20: float | None = None
    rsi_14: float | None = None
    latest_volume: int | None = None
    avg_volume_20: int | None = None
    volume_vs_avg_pct: float | None = None
    period_high: float | None = None
    period_low: float | None = None
    bars_analyzed: int | None = None
    error: str | None = None
