"""initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-04-16

"""
from collections.abc import Sequence
from datetime import datetime

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "0001_initial"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # ---- users ----
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("username", sa.String(length=64), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
    )
    op.create_index("ix_users_username", "users", ["username"], unique=True)

    # ---- watchlist_items ----
    op.create_table(
        "watchlist_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(),
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("ticker", sa.String(length=10), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("added_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
        sa.UniqueConstraint("user_id", "ticker", name="uq_watchlist_user_ticker"),
    )
    op.create_index("ix_watchlist_items_user_id", "watchlist_items", ["user_id"])

    # ---- bars ----
    op.create_table(
        "bars",
        sa.Column("ticker", sa.String(length=10), primary_key=True),
        sa.Column("timestamp", sa.DateTime(timezone=True), primary_key=True),
        sa.Column("open", sa.Float(), nullable=False),
        sa.Column("high", sa.Float(), nullable=False),
        sa.Column("low", sa.Float(), nullable=False),
        sa.Column("close", sa.Float(), nullable=False),
        sa.Column("volume", sa.BigInteger(), nullable=False),
        sa.Column("vwap", sa.Float(), nullable=True),
        sa.Column("trade_count", sa.Integer(), nullable=True),
    )
    op.create_index("ix_bars_ticker_ts_desc", "bars", ["ticker", "timestamp"])

    # ---- articles ----
    op.create_table(
        "articles",
        sa.Column("id", sa.String(length=128), primary_key=True),
        sa.Column("ticker", sa.String(length=10), nullable=False),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("source", sa.String(length=128), nullable=True),
        sa.Column("headline", sa.Text(), nullable=False),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("url", sa.Text(), nullable=True),
        sa.Column("category", sa.String(length=64), nullable=True),
        sa.Column("relevance_score", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_index("ix_articles_ticker_published", "articles", ["ticker", "published_at"])

    # ---- interactions ----
    op.create_table(
        "interactions",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
        sa.Column("user_id", sa.Integer(),
                  sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("session_id", sa.String(length=64), nullable=True),
        sa.Column("purpose", sa.String(length=32), nullable=False),
        sa.Column("provider", sa.String(length=16), nullable=False),
        sa.Column("model", sa.String(length=64), nullable=False),
        sa.Column("system_prompt", sa.Text(), nullable=True),
        sa.Column("messages", postgresql.JSONB(), nullable=True),
        sa.Column("tools", postgresql.JSONB(), nullable=True),
        sa.Column("response_text", sa.Text(), nullable=True),
        sa.Column("tool_calls", postgresql.JSONB(), nullable=True),
        sa.Column("stop_reason", sa.String(length=32), nullable=True),
        sa.Column("input_tokens", sa.Integer(), nullable=True),
        sa.Column("output_tokens", sa.Integer(), nullable=True),
        sa.Column("cost_usd", sa.Float(), nullable=True),
        sa.Column("duration_ms", sa.Integer(), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
    )
    op.create_index("ix_interactions_session_ts", "interactions", ["session_id", "timestamp"])
    op.create_index("ix_interactions_purpose_ts", "interactions", ["purpose", "timestamp"])
    op.create_index("ix_interactions_user_ts", "interactions", ["user_id", "timestamp"])

    # ---- briefings ----
    op.create_table(
        "briefings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(),
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("date", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
        sa.Column("session_id", sa.String(length=64), nullable=True),
        sa.Column("content_markdown", sa.Text(), nullable=False),
        sa.Column("model", sa.String(length=64), nullable=False),
    )
    op.create_index("ix_briefings_user_date", "briefings", ["user_id", "date"])


def downgrade() -> None:
    op.drop_index("ix_briefings_user_date", table_name="briefings")
    op.drop_table("briefings")

    op.drop_index("ix_interactions_user_ts", table_name="interactions")
    op.drop_index("ix_interactions_purpose_ts", table_name="interactions")
    op.drop_index("ix_interactions_session_ts", table_name="interactions")
    op.drop_table("interactions")

    op.drop_index("ix_articles_ticker_published", table_name="articles")
    op.drop_table("articles")

    op.drop_index("ix_bars_ticker_ts_desc", table_name="bars")
    op.drop_table("bars")

    op.drop_index("ix_watchlist_items_user_id", table_name="watchlist_items")
    op.drop_table("watchlist_items")

    op.drop_index("ix_users_username", table_name="users")
    op.drop_table("users")
