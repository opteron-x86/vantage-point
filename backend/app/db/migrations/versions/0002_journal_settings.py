"""add journal entries and user settings

Revision ID: 0002_journal_settings
Revises: 0001_initial
Create Date: 2026-04-17

"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "0002_journal_settings"
down_revision: str | Sequence[str] | None = "0001_initial"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # ---- journal_entries ----
    op.create_table(
        "journal_entries",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(),
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("ticker", sa.String(length=10), nullable=False),

        sa.Column("shares", sa.Float(), nullable=False),
        sa.Column("cost_basis", sa.Float(), nullable=False),
        sa.Column("entry_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("entry_precision", sa.String(length=16),
                  nullable=False, server_default="exact"),

        sa.Column("thesis", sa.Text(), nullable=True),
        sa.Column("stop_loss", sa.Float(), nullable=True),
        sa.Column("target_price", sa.Float(), nullable=True),
        sa.Column("time_horizon", sa.String(length=32), nullable=True),

        sa.Column("status", sa.String(length=16), nullable=False, server_default="open"),
        sa.Column("exit_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("exit_price", sa.Float(), nullable=True),
        sa.Column("exit_notes", sa.Text(), nullable=True),

        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_journal_user_status", "journal_entries", ["user_id", "status"])
    op.create_index("ix_journal_user_ticker", "journal_entries", ["user_id", "ticker"])

    # ---- user_settings ----
    op.create_table(
        "user_settings",
        sa.Column("user_id", sa.Integer(),
                  sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("brokerage_cash", sa.Float(), nullable=True),
        sa.Column("risk_profile_note", sa.Text(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  nullable=False, server_default=sa.text("now()")),
    )


def downgrade() -> None:
    op.drop_table("user_settings")
    op.drop_index("ix_journal_user_ticker", table_name="journal_entries")
    op.drop_index("ix_journal_user_status", table_name="journal_entries")
    op.drop_table("journal_entries")
