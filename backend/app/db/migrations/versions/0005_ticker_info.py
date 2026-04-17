"""add ticker_info

Revision ID: 0005_ticker_info
Revises: 0004_ai_config
Create Date: 2026-04-17

"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "0005_ticker_info"
down_revision: str | Sequence[str] | None = "0004_ai_config"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "ticker_info",
        sa.Column("ticker", sa.String(length=10), primary_key=True),
        sa.Column("name", sa.String(length=200), nullable=True),
        sa.Column("exchange", sa.String(length=32), nullable=True),
        sa.Column("sector", sa.String(length=64), nullable=True),
        sa.Column("industry", sa.String(length=128), nullable=True),
        sa.Column("country", sa.String(length=4), nullable=True),
        sa.Column("currency", sa.String(length=4), nullable=True),
        sa.Column("logo_url", sa.String(length=512), nullable=True),
        sa.Column("weburl", sa.String(length=512), nullable=True),
        sa.Column("market_cap_usd", sa.Float(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  nullable=False, server_default=sa.text("now()")),
    )


def downgrade() -> None:
    op.drop_table("ticker_info")
