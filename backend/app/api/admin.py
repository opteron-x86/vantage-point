"""
Data management endpoints.

These trigger the same work as the CLI scripts (fetch_data, score_news)
but from the UI so users don't have to drop to the terminal.

Refreshes are synchronous for now — the time cost is bounded (seconds for
bars/news on a small watchlist, up to a minute for a full relevance pass).
If this grows, consider moving to a background task queue.
"""

from fastapi import APIRouter, Query
from pydantic import BaseModel

from app.ai.logged_client import get_logged_client
from app.api.deps import CurrentUser, DbSession
from app.services import market_data, news, relevance, watchlist

router = APIRouter()


class RefreshResult(BaseModel):
    bars_fetched: dict[str, int] | None = None
    news_fetched: dict[str, int] | None = None


class ScoreResult(BaseModel):
    total: int
    scored: int
    failed: int
    session_id: str | None = None


@router.post("/refresh", response_model=RefreshResult)
def refresh_data(
    db: DbSession,
    user: CurrentUser,
    bars: bool = Query(True, description="Fetch OHLCV bars"),
    news_items: bool = Query(True, alias="news", description="Fetch news articles"),
    days_bars: int = Query(30, ge=1, le=90),
    days_news: int = Query(7, ge=1, le=30),
) -> RefreshResult:
    """Refresh market data and/or news for the user's entire watchlist."""
    tickers = watchlist.list_tickers(db, user_id=user.id)
    if not tickers:
        return RefreshResult()

    result = RefreshResult()
    if bars:
        result.bars_fetched = market_data.fetch_and_store(db, tickers=tickers, days=days_bars)
    if news_items:
        result.news_fetched = news.fetch_and_store(db, tickers=tickers, days=days_news)
    return result


@router.post("/refresh/{ticker}", response_model=RefreshResult)
def refresh_ticker(
    ticker: str,
    db: DbSession,
    _: CurrentUser,
    days_bars: int = Query(30, ge=1, le=3650),
    days_news: int = Query(7, ge=1, le=30),
) -> RefreshResult:
    """Refresh market data and news for a single ticker."""
    ticker = ticker.upper().strip()
    return RefreshResult(
        bars_fetched=market_data.fetch_and_store(db, tickers=[ticker], days=days_bars),
        news_fetched=news.fetch_and_store(db, tickers=[ticker], days=days_news),
    )


@router.post("/score-news", response_model=ScoreResult)
def score_news(db: DbSession, user: CurrentUser) -> ScoreResult:
    """Classify unscored news articles by relevance. Uses the classifier model."""
    client = get_logged_client(db=db, user_id=user.id)
    result = relevance.score_unscored(db, client, user_id=user.id)
    return ScoreResult(**result)
