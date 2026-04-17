"""
Background data-refresh helpers.

These run outside of a request context (from BackgroundTasks, the scheduler,
or manual scripts) so they open their own short-lived DB sessions.
"""

from app.db.session import SessionLocal
from app.services import market_data, news, ticker_info


def refresh_ticker_background(ticker: str, days_bars: int = 30, days_news: int = 7) -> None:
    """Fetch bars, news, and profile for a single ticker."""
    ticker = ticker.upper().strip()
    with SessionLocal() as db:
        try:
            ticker_info.fetch_and_store(db, ticker)
        except Exception as e:
            print(f"[background.refresh_ticker] {ticker} profile: {e}")
        try:
            market_data.fetch_and_store(db, tickers=[ticker], days=days_bars)
        except Exception as e:
            print(f"[background.refresh_ticker] {ticker} bars: {e}")
        try:
            news.fetch_and_store(db, tickers=[ticker], days=days_news)
        except Exception as e:
            print(f"[background.refresh_ticker] {ticker} news: {e}")
