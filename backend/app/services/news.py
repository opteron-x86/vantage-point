"""
News service.

- `fetch_and_store`: pulls company news from Finnhub, upserts into `articles`
- `get_recent_news`: queries stored news with optional relevance filter
"""

import time
from datetime import UTC, date, datetime, timedelta
from typing import Any

import finnhub
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.config import settings
from app.db.models import Article


REQUEST_DELAY_SECONDS = 0.2  # Polite pacing for Finnhub free tier (60/min)


def _finnhub_client() -> finnhub.Client:
    if not settings.finnhub_api_key:
        raise RuntimeError("FINNHUB_API_KEY not set")
    return finnhub.Client(api_key=settings.finnhub_api_key)


# ---------------------------------------------------------------------------
# Fetch
# ---------------------------------------------------------------------------

def fetch_and_store(
    db: Session,
    *,
    tickers: list[str],
    days: int = 7,
) -> dict[str, int]:
    if not tickers:
        return {}

    client = _finnhub_client()
    today = date.today()
    start = (today - timedelta(days=days)).isoformat()
    end = today.isoformat()

    counts: dict[str, int] = {}
    for ticker in tickers:
        try:
            articles = client.company_news(ticker, _from=start, to=end)
        except (finnhub.FinnhubAPIException, finnhub.FinnhubRequestException) as e:
            print(f"[news] {ticker}: {e}")
            counts[ticker] = 0
            continue

        rows = []
        for art in articles:
            ts = art.get("datetime")
            if not ts:
                continue
            rows.append({
                "id": f"{ticker}:{art.get('id')}",
                "ticker": ticker,
                "published_at": datetime.fromtimestamp(ts, tz=UTC),
                "source": art.get("source"),
                "headline": (art.get("headline") or "").strip(),
                "summary": (art.get("summary") or "").strip() or None,
                "url": art.get("url"),
                "category": art.get("category"),
                "relevance_score": 0,
            })

        if rows:
            stmt = pg_insert(Article).values(rows)
            # Don't overwrite an existing relevance_score on conflict
            stmt = stmt.on_conflict_do_update(
                index_elements=["id"],
                set_={
                    "headline": stmt.excluded.headline,
                    "summary": stmt.excluded.summary,
                    "url": stmt.excluded.url,
                    "source": stmt.excluded.source,
                    "category": stmt.excluded.category,
                },
            )
            db.execute(stmt)

        counts[ticker] = len(rows)
        time.sleep(REQUEST_DELAY_SECONDS)

    db.commit()
    return counts


# ---------------------------------------------------------------------------
# Query
# ---------------------------------------------------------------------------

def get_recent_news(
    db: Session,
    *,
    ticker: str,
    limit: int = 10,
    min_relevance: int = 0,
) -> dict[str, Any]:
    ticker = ticker.upper()
    stmt = (
        select(Article)
        .where(Article.ticker == ticker)
        .order_by(Article.published_at.desc())
        .limit(limit)
    )
    if min_relevance > 0:
        stmt = stmt.where(Article.relevance_score >= min_relevance)

    articles = list(db.execute(stmt).scalars())

    return {
        "ticker": ticker,
        "article_count": len(articles),
        "articles": [
            {
                "id": a.id,
                "published": a.published_at.isoformat(),
                "source": a.source,
                "headline": a.headline,
                "summary": a.summary,
                "url": a.url,
                "relevance": a.relevance_score,
            }
            for a in articles
        ],
    }


def list_unscored(db: Session, limit: int | None = None) -> list[Article]:
    stmt = (
        select(Article)
        .where(Article.relevance_score == 0)
        .order_by(Article.published_at.desc())
    )
    if limit:
        stmt = stmt.limit(limit)
    return list(db.execute(stmt).scalars())


def apply_relevance_scores(db: Session, updates: list[tuple[str, int]]) -> int:
    """Bulk update relevance_score. `updates` is [(article_id, score), ...]."""
    if not updates:
        return 0
    # Use a single UPDATE statement via SQLAlchemy's bulk update pattern
    for article_id, score in updates:
        db.execute(
            Article.__table__.update()
            .where(Article.id == article_id)
            .values(relevance_score=score)
        )
    db.commit()
    return len(updates)
