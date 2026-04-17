"""Watchlist operations: list, add, remove, reorder."""

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.models import WatchlistItem


def list_tickers(db: Session, *, user_id: int) -> list[str]:
    rows = db.execute(
        select(WatchlistItem.ticker)
        .where(WatchlistItem.user_id == user_id)
        .order_by(WatchlistItem.position, WatchlistItem.added_at)
    ).all()
    return [r[0] for r in rows]


def list_items(db: Session, *, user_id: int) -> list[WatchlistItem]:
    return list(
        db.execute(
            select(WatchlistItem)
            .where(WatchlistItem.user_id == user_id)
            .order_by(WatchlistItem.position, WatchlistItem.added_at)
        ).scalars()
    )


def add_ticker(db: Session, *, user_id: int, ticker: str) -> WatchlistItem:
    ticker = ticker.upper().strip()
    # Put new items at the end by default
    max_pos = db.execute(
        select(WatchlistItem.position)
        .where(WatchlistItem.user_id == user_id)
        .order_by(WatchlistItem.position.desc())
        .limit(1)
    ).scalar() or 0

    item = WatchlistItem(user_id=user_id, ticker=ticker, position=max_pos + 1)
    db.add(item)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        # Already in watchlist — return existing
        existing = db.execute(
            select(WatchlistItem).where(
                WatchlistItem.user_id == user_id,
                WatchlistItem.ticker == ticker,
            )
        ).scalar_one()
        return existing
    db.refresh(item)
    return item


def remove_ticker(db: Session, *, user_id: int, ticker: str) -> bool:
    ticker = ticker.upper().strip()
    item = db.execute(
        select(WatchlistItem).where(
            WatchlistItem.user_id == user_id,
            WatchlistItem.ticker == ticker,
        )
    ).scalar_one_or_none()
    if item is None:
        return False
    db.delete(item)
    db.commit()
    return True


def reorder(db: Session, *, user_id: int, ticker_order: list[str]) -> None:
    """Set positions based on the given ordering. Unknown tickers are ignored."""
    items = {i.ticker: i for i in list_items(db, user_id=user_id)}
    for pos, ticker in enumerate(ticker_order):
        t = ticker.upper().strip()
        if t in items:
            items[t].position = pos
    db.commit()
