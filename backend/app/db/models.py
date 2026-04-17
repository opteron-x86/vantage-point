"""
SQLAlchemy ORM models.

All models inherit from a shared Base. Each table is scoped to its
purpose — no god-objects, no mixing concerns. Relationships are added
explicitly where needed.

Design notes:
  - User-owned data (WatchlistItem) has a user_id FK so we can later
    support multiple users without a schema change.
  - Shared reference data (Bar, Article) is not user-scoped — it's the
    same market data for everyone.
  - Interactions are logged per-user for auditability.
"""

from datetime import UTC, datetime
from typing import Any

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    """Shared declarative base."""


def _utcnow() -> datetime:
    return datetime.now(UTC)


# ---------------------------------------------------------------------------
# Users & auth
# ---------------------------------------------------------------------------

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)

    watchlist: Mapped[list["WatchlistItem"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class WatchlistItem(Base):
    __tablename__ = "watchlist_items"
    __table_args__ = (
        UniqueConstraint("user_id", "ticker", name="uq_watchlist_user_ticker"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    ticker: Mapped[str] = mapped_column(String(10), nullable=False)
    position: Mapped[int] = mapped_column(Integer, default=0, nullable=False)  # display order
    added_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)

    user: Mapped["User"] = relationship(back_populates="watchlist")


# ---------------------------------------------------------------------------
# Market data
# ---------------------------------------------------------------------------

class Bar(Base):
    """Daily OHLCV bar for a ticker. Shared reference data."""
    __tablename__ = "bars"
    __table_args__ = (
        Index("ix_bars_ticker_ts_desc", "ticker", "timestamp"),
    )

    ticker: Mapped[str] = mapped_column(String(10), primary_key=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), primary_key=True)
    open: Mapped[float] = mapped_column(Float, nullable=False)
    high: Mapped[float] = mapped_column(Float, nullable=False)
    low: Mapped[float] = mapped_column(Float, nullable=False)
    close: Mapped[float] = mapped_column(Float, nullable=False)
    volume: Mapped[int] = mapped_column(BigInteger, nullable=False)
    vwap: Mapped[float | None] = mapped_column(Float, nullable=True)
    trade_count: Mapped[int | None] = mapped_column(Integer, nullable=True)


# ---------------------------------------------------------------------------
# News
# ---------------------------------------------------------------------------

class Article(Base):
    """News article from Finnhub (or other source). Shared reference data."""
    __tablename__ = "articles"
    __table_args__ = (
        Index("ix_articles_ticker_published", "ticker", "published_at"),
    )

    id: Mapped[str] = mapped_column(String(128), primary_key=True)  # "{TICKER}:{finnhub_id}"
    ticker: Mapped[str] = mapped_column(String(10), nullable=False)
    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    source: Mapped[str | None] = mapped_column(String(128), nullable=True)
    headline: Mapped[str] = mapped_column(Text, nullable=False)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    url: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str | None] = mapped_column(String(64), nullable=True)
    relevance_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)  # 0=unscored, 1-3


# ---------------------------------------------------------------------------
# AI interactions log
# ---------------------------------------------------------------------------

class Interaction(Base):
    """Every AI call is logged here for auditability and cost tracking."""
    __tablename__ = "interactions"
    __table_args__ = (
        Index("ix_interactions_session_ts", "session_id", "timestamp"),
        Index("ix_interactions_purpose_ts", "purpose", "timestamp"),
        Index("ix_interactions_user_ts", "user_id", "timestamp"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)  # UUID
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    session_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    purpose: Mapped[str] = mapped_column(String(32), nullable=False)  # briefing, chat, relevance_scoring
    provider: Mapped[str] = mapped_column(String(16), nullable=False)
    model: Mapped[str] = mapped_column(String(64), nullable=False)
    system_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    messages: Mapped[list[dict[str, Any]] | None] = mapped_column(JSONB, nullable=True)
    tools: Mapped[list[dict[str, Any]] | None] = mapped_column(JSONB, nullable=True)
    response_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    tool_calls: Mapped[list[dict[str, Any]] | None] = mapped_column(JSONB, nullable=True)
    stop_reason: Mapped[str | None] = mapped_column(String(32), nullable=True)
    input_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    output_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cost_usd: Mapped[float | None] = mapped_column(Float, nullable=True)
    duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)


# ---------------------------------------------------------------------------
# Briefings
# ---------------------------------------------------------------------------

class Briefing(Base):
    """A generated morning briefing."""
    __tablename__ = "briefings"
    __table_args__ = (
        Index("ix_briefings_user_date", "user_id", "date"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)
    session_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    content_markdown: Mapped[str] = mapped_column(Text, nullable=False)
    model: Mapped[str] = mapped_column(String(64), nullable=False)


# ---------------------------------------------------------------------------
# Journal entries (trade log)
# ---------------------------------------------------------------------------

class JournalEntry(Base):
    """
    A record of a trade — real or hypothetical.

    Two entry modes, distinguished by `entry_precision`:
      - "exact":       known entry_date and price_per_share
      - "approximate": known date range, price derived from cost_basis / shares
      - "backfilled":  pre-existing position with unknown date; cost_basis known

    Status transitions: open -> closed (set exit_* fields). We don't support
    multi-lot entries for v1 — each buy is its own entry.
    """
    __tablename__ = "journal_entries"
    __table_args__ = (
        Index("ix_journal_user_status", "user_id", "status"),
        Index("ix_journal_user_ticker", "user_id", "ticker"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    ticker: Mapped[str] = mapped_column(String(10), nullable=False)

    # Entry
    shares: Mapped[float] = mapped_column(Float, nullable=False)
    cost_basis: Mapped[float] = mapped_column(Float, nullable=False)  # total $ spent
    entry_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    entry_precision: Mapped[str] = mapped_column(String(16), default="exact", nullable=False)

    # Thesis & plan
    thesis: Mapped[str | None] = mapped_column(Text, nullable=True)
    stop_loss: Mapped[float | None] = mapped_column(Float, nullable=True)
    target_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    time_horizon: Mapped[str | None] = mapped_column(String(32), nullable=True)  # "swing", "long-term", etc

    # Status & exit
    status: Mapped[str] = mapped_column(String(16), default="open", nullable=False)  # open / closed
    exit_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    exit_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    exit_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Meta
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False,
    )


# ---------------------------------------------------------------------------
# User settings (account context for the AI)
# ---------------------------------------------------------------------------

class UserSettings(Base):
    """
    Small, user-editable context the AI can reference.
    Scoped to the brokerage/trading side only — not broader financial picture.
    """
    __tablename__ = "user_settings"

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True,
    )
    brokerage_cash: Mapped[float | None] = mapped_column(Float, nullable=True)
    risk_profile_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False,
    )


# ---------------------------------------------------------------------------
# Chat sessions
# ---------------------------------------------------------------------------

class ChatSession(Base):
    """
    Metadata for a saved chat conversation. Title, pinned flag, timestamps.
    The conversation turns themselves live in the `interactions` table,
    keyed by `session_id`.
    """
    __tablename__ = "chat_sessions"
    __table_args__ = (
        Index("ix_chat_sessions_user_updated", "user_id", "updated_at"),
    )

    session_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False,
    )
    title: Mapped[str | None] = mapped_column(String(120), nullable=True)
    pinned: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False,
    )


# ---------------------------------------------------------------------------
# AI config (runtime overrides for provider and model selection)
# ---------------------------------------------------------------------------

class AIConfig(Base):
    """
    User-controlled overrides for AI provider and model IDs.

    Resolution order at call sites: this row → environment variables → defaults.
    A null column means fall through to the next layer.
    API keys are never stored here — they stay in the environment.
    """
    __tablename__ = "ai_config"

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True,
    )
    provider: Mapped[str | None] = mapped_column(String(16), nullable=True)
    model_briefing: Mapped[str | None] = mapped_column(String(64), nullable=True)
    model_classifier: Mapped[str | None] = mapped_column(String(64), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False,
    )


# ---------------------------------------------------------------------------
# Ticker metadata (company name, sector, industry)
# ---------------------------------------------------------------------------

class TickerInfo(Base):
    """
    Company-level metadata for a ticker. Populated from Finnhub's stock
    profile endpoint on first watchlist-add and cached indefinitely.
    """
    __tablename__ = "ticker_info"

    ticker: Mapped[str] = mapped_column(String(10), primary_key=True)
    name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    exchange: Mapped[str | None] = mapped_column(String(32), nullable=True)
    sector: Mapped[str | None] = mapped_column(String(64), nullable=True)
    industry: Mapped[str | None] = mapped_column(String(128), nullable=True)
    country: Mapped[str | None] = mapped_column(String(4), nullable=True)
    currency: Mapped[str | None] = mapped_column(String(4), nullable=True)
    logo_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    weburl: Mapped[str | None] = mapped_column(String(512), nullable=True)
    market_cap_usd: Mapped[float | None] = mapped_column(Float, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False,
    )
