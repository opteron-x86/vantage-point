"""
Ticker info service.

Company-level metadata keyed by ticker: name, sector, industry, etc.
Sourced from Finnhub's /stock/profile2 endpoint, cached in the ticker_info
table. Free-tier Finnhub covers US tickers; returns an empty object for
symbols it doesn't know.
"""

from typing import Any

import httpx
from sqlalchemy.orm import Session

from app.config import settings
from app.db.models import TickerInfo


FINNHUB_PROFILE_URL = "https://finnhub.io/api/v1/stock/profile2"


def get(db: Session, ticker: str) -> TickerInfo | None:
    return db.get(TickerInfo, ticker.upper().strip())


def list_many(db: Session, tickers: list[str]) -> dict[str, TickerInfo]:
    if not tickers:
        return {}
    upper = [t.upper().strip() for t in tickers]
    rows = db.query(TickerInfo).filter(TickerInfo.ticker.in_(upper)).all()
    return {r.ticker: r for r in rows}


def _fetch_from_finnhub(ticker: str) -> dict[str, Any]:
    if not settings.finnhub_api_key:
        return {}
    try:
        resp = httpx.get(
            FINNHUB_PROFILE_URL,
            params={"symbol": ticker, "token": settings.finnhub_api_key},
            timeout=10.0,
        )
        resp.raise_for_status()
        return resp.json() or {}
    except (httpx.HTTPError, ValueError) as e:
        print(f"[ticker_info] Finnhub profile fetch failed for {ticker}: {e}")
        return {}


def fetch_and_store(db: Session, ticker: str, *, force: bool = False) -> TickerInfo | None:
    """Fetch Finnhub profile for a ticker and upsert into ticker_info."""
    ticker = ticker.upper().strip()

    existing = db.get(TickerInfo, ticker)
    if existing and not force and existing.name:
        return existing

    data = _fetch_from_finnhub(ticker)
    if not data:
        return existing

    row = existing or TickerInfo(ticker=ticker)
    row.name = data.get("name") or row.name
    row.exchange = data.get("exchange") or row.exchange
    row.sector = data.get("finnhubIndustry") or row.sector
    row.industry = data.get("finnhubIndustry") or row.industry
    row.country = data.get("country") or row.country
    row.currency = data.get("currency") or row.currency
    row.logo_url = data.get("logo") or row.logo_url
    row.weburl = data.get("weburl") or row.weburl

    cap = data.get("marketCapitalization")
    if cap is not None:
        try:
            # Finnhub returns market cap in millions
            row.market_cap_usd = float(cap) * 1_000_000
        except (TypeError, ValueError):
            pass

    if existing is None:
        db.add(row)
    db.commit()
    db.refresh(row)
    return row


def serialize(row: TickerInfo | None) -> dict[str, Any]:
    if row is None:
        return {}
    return {
        "ticker": row.ticker,
        "name": row.name,
        "exchange": row.exchange,
        "sector": row.sector,
        "industry": row.industry,
        "country": row.country,
        "currency": row.currency,
        "logo_url": row.logo_url,
        "weburl": row.weburl,
        "market_cap_usd": row.market_cap_usd,
    }
