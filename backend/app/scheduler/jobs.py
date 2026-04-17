"""
Scheduled background jobs.

Runs inside the FastAPI process via APScheduler's AsyncIOScheduler so
lifecycle matches the app. For heavier deployments we'd split this into
a dedicated worker; for a hobby app, in-process is simpler and fine.

Jobs (times in local server time):
  - 06:30  Refresh market data (Alpaca bars) for all users' watchlists
  - 06:45  Refresh news (Finnhub) for all users' watchlists
  - 06:50  Score newly-added articles for relevance
  - 07:00  Generate morning briefings for all users

All jobs are idempotent and safe to re-run.
"""

from __future__ import annotations

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.logged_client import get_logged_client
from app.db.models import User, WatchlistItem
from app.db.session import SessionLocal
from app.services import briefing as briefing_service
from app.services import market_data, news, relevance


_scheduler: AsyncIOScheduler | None = None


# ---- Helpers ---------------------------------------------------------------

def _all_user_tickers(db: Session) -> dict[int, list[str]]:
    """Return { user_id: [tickers...] } across all active users."""
    rows = db.execute(
        select(WatchlistItem.user_id, WatchlistItem.ticker)
        .join(User, User.id == WatchlistItem.user_id)
        .where(User.is_active.is_(True))
        .order_by(WatchlistItem.user_id, WatchlistItem.position)
    ).all()
    result: dict[int, list[str]] = {}
    for user_id, ticker in rows:
        result.setdefault(user_id, []).append(ticker)
    return result


def _union_tickers(by_user: dict[int, list[str]]) -> list[str]:
    seen: set[str] = set()
    for tickers in by_user.values():
        seen.update(tickers)
    return sorted(seen)


# ---- Jobs ------------------------------------------------------------------

def refresh_market_data() -> None:
    with SessionLocal() as db:
        by_user = _all_user_tickers(db)
        tickers = _union_tickers(by_user)
        if not tickers:
            return
        counts = market_data.fetch_and_store(db, tickers=tickers, days=7)
        print(f"[scheduler] market data: {sum(counts.values())} rows across {len(counts)} tickers")


def refresh_news() -> None:
    with SessionLocal() as db:
        by_user = _all_user_tickers(db)
        tickers = _union_tickers(by_user)
        if not tickers:
            return
        counts = news.fetch_and_store(db, tickers=tickers, days=2)
        print(f"[scheduler] news: {sum(counts.values())} articles across {len(counts)} tickers")


def score_new_articles() -> None:
    with SessionLocal() as db:
        client = get_logged_client(db=db)
        result = relevance.score_unscored(db, client, limit=500)
        print(f"[scheduler] relevance: {result}")


def generate_daily_briefings() -> None:
    with SessionLocal() as db:
        by_user = _all_user_tickers(db)
        if not by_user:
            return
        for user_id in by_user:
            try:
                client = get_logged_client(db=db, user_id=user_id)
                briefing_service.generate_briefing(db, client, user_id=user_id)
                print(f"[scheduler] briefing generated for user {user_id}")
            except Exception as e:
                print(f"[scheduler] briefing failed for user {user_id}: {e}")


# ---- Lifecycle -------------------------------------------------------------

def start_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        return
    sched = AsyncIOScheduler()
    sched.add_job(refresh_market_data,      CronTrigger(hour=6, minute=30), id="refresh_market_data")
    sched.add_job(refresh_news,             CronTrigger(hour=6, minute=45), id="refresh_news")
    sched.add_job(score_new_articles,       CronTrigger(hour=6, minute=50), id="score_new_articles")
    sched.add_job(generate_daily_briefings, CronTrigger(hour=7, minute=0),  id="generate_daily_briefings")
    sched.start()
    _scheduler = sched
    print("[scheduler] started")


def stop_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
        print("[scheduler] stopped")
