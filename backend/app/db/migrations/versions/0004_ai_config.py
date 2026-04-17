"""add ai_config

Revision ID: 0004_ai_config
Revises: 0003_chat_sessions
Create Date: 2026-04-17

"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "0004_ai_config"
down_revision: str | Sequence[str] | None = "0003_chat_sessions"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "ai_config",
        sa.Column("user_id", sa.Integer(),
                  sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("provider", sa.String(length=16), nullable=True),
        sa.Column("model_briefing", sa.String(length=64), nullable=True),
        sa.Column("model_classifier", sa.String(length=64), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  nullable=False, server_default=sa.text("now()")),
    )


def downgrade() -> None:
    op.drop_table("ai_config")
