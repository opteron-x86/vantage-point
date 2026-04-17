"""
Journal service.

CRUD for trade journal entries, plus derived fields the UI and AI care about:
  - price_per_share: cost_basis / shares
  - current_price: latest close from bars table
  - unrealized_pnl: for open positions, (current - cost_per_share) * shares
  - realized_pnl:   for closed positions, (exit - entry) * shares
  - pct_change:     signed % move vs cost basis
"""

from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Bar, JournalEntry


VALID_STATUSES = {"open", "closed"}
VALID_PRECISIONS = {"exact", "approximate", "backfilled"}


# ---------------------------------------------------------------------------
# Queries
# ---------------------------------------------------------------------------

def list_entries(
    db: Session,
    *,
    user_id: int,
    status: str | None = None,
) -> list[JournalEntry]:
    stmt = (
        select(JournalEntry)
        .where(JournalEntry.user_id == user_id)
        .order_by(JournalEntry.status.asc(), JournalEntry.created_at.desc())
    )
    if status:
        stmt = stmt.where(JournalEntry.status == status)
    return list(db.execute(stmt).scalars())


def get_entry(db: Session, *, user_id: int, entry_id: int) -> JournalEntry | None:
    return db.execute(
        select(JournalEntry).where(
            JournalEntry.id == entry_id,
            JournalEntry.user_id == user_id,
        )
    ).scalar_one_or_none()


def _latest_close(db: Session, ticker: str) -> float | None:
    """Most recent stored close price for a ticker."""
    row = db.execute(
        select(Bar.close)
        .where(Bar.ticker == ticker.upper())
        .order_by(Bar.timestamp.desc())
        .limit(1)
    ).scalar_one_or_none()
    return float(row) if row is not None else None


# ---------------------------------------------------------------------------
# Serialization with derived fields
# ---------------------------------------------------------------------------

def serialize(db: Session, entry: JournalEntry) -> dict[str, Any]:
    """Return a dict with derived pricing fields joined in."""
    price_per_share = entry.cost_basis / entry.shares if entry.shares else None

    result: dict[str, Any] = {
        "id": entry.id,
        "ticker": entry.ticker,
        "shares": entry.shares,
        "cost_basis": entry.cost_basis,
        "price_per_share": round(price_per_share, 4) if price_per_share else None,
        "entry_date": entry.entry_date.isoformat() if entry.entry_date else None,
        "entry_precision": entry.entry_precision,
        "thesis": entry.thesis,
        "stop_loss": entry.stop_loss,
        "target_price": entry.target_price,
        "time_horizon": entry.time_horizon,
        "status": entry.status,
        "exit_date": entry.exit_date.isoformat() if entry.exit_date else None,
        "exit_price": entry.exit_price,
        "exit_notes": entry.exit_notes,
        "notes": entry.notes,
        "created_at": entry.created_at.isoformat(),
        "updated_at": entry.updated_at.isoformat(),
    }

    if entry.status == "open":
        current = _latest_close(db, entry.ticker)
        result["current_price"] = current
        if current is not None and price_per_share:
            market_value = current * entry.shares
            unrealized = market_value - entry.cost_basis
            result["market_value"] = round(market_value, 2)
            result["unrealized_pnl"] = round(unrealized, 2)
            result["pct_change"] = round((current - price_per_share) / price_per_share * 100, 2)
    else:
        # Closed: realized P&L
        if entry.exit_price is not None and price_per_share:
            realized = (entry.exit_price - price_per_share) * entry.shares
            result["realized_pnl"] = round(realized, 2)
            result["pct_change"] = round((entry.exit_price - price_per_share) / price_per_share * 100, 2)

    return result


# ---------------------------------------------------------------------------
# Mutations
# ---------------------------------------------------------------------------

def create_entry(
    db: Session,
    *,
    user_id: int,
    ticker: str,
    shares: float,
    cost_basis: float,
    entry_date: datetime | None = None,
    entry_precision: str = "exact",
    thesis: str | None = None,
    stop_loss: float | None = None,
    target_price: float | None = None,
    time_horizon: str | None = None,
    notes: str | None = None,
) -> JournalEntry:
    if entry_precision not in VALID_PRECISIONS:
        raise ValueError(f"entry_precision must be one of {VALID_PRECISIONS}")
    if shares <= 0:
        raise ValueError("shares must be positive")
    if cost_basis <= 0:
        raise ValueError("cost_basis must be positive")

    entry = JournalEntry(
        user_id=user_id,
        ticker=ticker.upper().strip(),
        shares=shares,
        cost_basis=cost_basis,
        entry_date=entry_date,
        entry_precision=entry_precision,
        thesis=thesis,
        stop_loss=stop_loss,
        target_price=target_price,
        time_horizon=time_horizon,
        notes=notes,
        status="open",
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def update_entry(
    db: Session,
    *,
    user_id: int,
    entry_id: int,
    updates: dict[str, Any],
) -> JournalEntry | None:
    entry = get_entry(db, user_id=user_id, entry_id=entry_id)
    if entry is None:
        return None

    # Allowed fields; status transitions handled separately
    allowed = {
        "shares", "cost_basis", "entry_date", "entry_precision",
        "thesis", "stop_loss", "target_price", "time_horizon", "notes",
    }
    for key, value in updates.items():
        if key in allowed:
            setattr(entry, key, value)

    db.commit()
    db.refresh(entry)
    return entry


def close_entry(
    db: Session,
    *,
    user_id: int,
    entry_id: int,
    exit_price: float,
    exit_date: datetime | None = None,
    exit_notes: str | None = None,
) -> JournalEntry | None:
    entry = get_entry(db, user_id=user_id, entry_id=entry_id)
    if entry is None:
        return None
    if entry.status == "closed":
        raise ValueError("Entry already closed")

    entry.status = "closed"
    entry.exit_price = exit_price
    entry.exit_date = exit_date or datetime.now(UTC)
    if exit_notes is not None:
        entry.exit_notes = exit_notes
    db.commit()
    db.refresh(entry)
    return entry


def delete_entry(db: Session, *, user_id: int, entry_id: int) -> bool:
    entry = get_entry(db, user_id=user_id, entry_id=entry_id)
    if entry is None:
        return False
    db.delete(entry)
    db.commit()
    return True


# ---------------------------------------------------------------------------
# Aggregate context (for AI tools)
# ---------------------------------------------------------------------------

def summarize_open_positions(db: Session, *, user_id: int) -> dict[str, Any]:
    """
    Compact summary of open positions — designed for the AI to ingest.
    Includes per-position pricing plus portfolio-level aggregates.
    """
    open_entries = list_entries(db, user_id=user_id, status="open")
    positions: list[dict[str, Any]] = []
    total_cost = 0.0
    total_value = 0.0
    total_with_current = 0

    for e in open_entries:
        s = serialize(db, e)
        positions.append(s)
        total_cost += e.cost_basis
        if s.get("market_value") is not None:
            total_value += s["market_value"]
            total_with_current += 1

    # Only include aggregates if we have current prices for all positions
    aggregates: dict[str, Any] = {
        "count": len(open_entries),
        "total_cost_basis": round(total_cost, 2),
    }
    if total_with_current == len(open_entries) and open_entries:
        aggregates["total_market_value"] = round(total_value, 2)
        aggregates["unrealized_pnl"] = round(total_value - total_cost, 2)
        aggregates["pct_change"] = (
            round((total_value - total_cost) / total_cost * 100, 2) if total_cost else None
        )

    return {"positions": positions, "aggregates": aggregates}
