"""
Market data service.

- `fetch_and_store`: pulls daily bars from Alpaca, upserts into `bars`
- `get_price_history`: queries stored bars with summary stats (used by AI tool)
- `get_bars`: raw bars for API/chart consumption
"""

from datetime import UTC, datetime, timedelta
from typing import Any

from alpaca.data.historical import StockHistoricalDataClient
from alpaca.data.requests import StockBarsRequest
from alpaca.data.timeframe import TimeFrame
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.config import settings
from app.db.models import Bar


# ---------------------------------------------------------------------------
# Fetch (Alpaca -> DB)
# ---------------------------------------------------------------------------

def _alpaca_client() -> StockHistoricalDataClient:
    if not (settings.alpaca_api_key and settings.alpaca_secret_key):
        raise RuntimeError("Alpaca credentials not set")
    return StockHistoricalDataClient(settings.alpaca_api_key, settings.alpaca_secret_key)


def fetch_and_store(
    db: Session,
    *,
    tickers: list[str],
    days: int = 30,
) -> dict[str, int]:
    """Fetch daily bars and upsert into the DB. Returns counts per ticker."""
    if not tickers:
        return {}

    client = _alpaca_client()
    end = datetime.now(UTC) - timedelta(minutes=20)  # IEX delay safety
    start = end - timedelta(days=days)

    request = StockBarsRequest(
        symbol_or_symbols=tickers,
        timeframe=TimeFrame.Day,
        start=start,
        end=end,
    )
    response = client.get_stock_bars(request)

    counts: dict[str, int] = {}
    for ticker in tickers:
        bars = response.data.get(ticker, [])
        if not bars:
            counts[ticker] = 0
            continue

        rows = [
            {
                "ticker": ticker,
                "timestamp": bar.timestamp,
                "open": float(bar.open),
                "high": float(bar.high),
                "low": float(bar.low),
                "close": float(bar.close),
                "volume": int(bar.volume),
                "vwap": float(bar.vwap) if bar.vwap is not None else None,
                "trade_count": int(bar.trade_count) if bar.trade_count is not None else None,
            }
            for bar in bars
        ]
        stmt = pg_insert(Bar).values(rows)
        stmt = stmt.on_conflict_do_update(
            index_elements=["ticker", "timestamp"],
            set_={
                "open": stmt.excluded.open,
                "high": stmt.excluded.high,
                "low": stmt.excluded.low,
                "close": stmt.excluded.close,
                "volume": stmt.excluded.volume,
                "vwap": stmt.excluded.vwap,
                "trade_count": stmt.excluded.trade_count,
            },
        )
        db.execute(stmt)
        counts[ticker] = len(rows)

    db.commit()
    return counts


# ---------------------------------------------------------------------------
# Query
# ---------------------------------------------------------------------------

def get_bars(db: Session, *, ticker: str, days: int = 30) -> list[Bar]:
    ticker = ticker.upper()
    cutoff = datetime.now(UTC) - timedelta(days=days)
    rows = db.execute(
        select(Bar)
        .where(Bar.ticker == ticker, Bar.timestamp >= cutoff)
        .order_by(Bar.timestamp.asc())
    ).scalars()
    return list(rows)


def get_price_history(db: Session, *, ticker: str, days: int = 30) -> dict[str, Any]:
    """Formatted for AI tool consumption — includes summary stats."""
    bars = get_bars(db, ticker=ticker, days=days)
    if not bars:
        return {"ticker": ticker.upper(), "bars": [], "note": "No data available"}

    bar_dicts = [
        {
            "date": b.timestamp.date().isoformat(),
            "open": round(b.open, 2),
            "high": round(b.high, 2),
            "low": round(b.low, 2),
            "close": round(b.close, 2),
            "volume": b.volume,
        }
        for b in bars
    ]
    first, last = bar_dicts[0], bar_dicts[-1]
    pct_change = ((last["close"] - first["close"]) / first["close"]) * 100

    return {
        "ticker": ticker.upper(),
        "bar_count": len(bar_dicts),
        "period_start": first["date"],
        "period_end": last["date"],
        "period_change_pct": round(pct_change, 2),
        "latest_close": last["close"],
        "bars": bar_dicts,
    }
