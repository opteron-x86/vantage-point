"""Interaction log endpoints — for inspecting AI calls and costs."""

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import func, select

from app.api.deps import CurrentUser, DbSession
from app.db.models import Interaction
from app.schemas.logs import (
    CostRow,
    InteractionDetail,
    InteractionSummary,
    SessionSummary,
)

router = APIRouter()


@router.get("", response_model=list[InteractionSummary])
def list_interactions(
    db: DbSession,
    user: CurrentUser,
    purpose: str | None = None,
    session_id: str | None = None,
    limit: int = Query(50, ge=1, le=500),
) -> list[InteractionSummary]:
    stmt = (
        select(Interaction)
        .where(Interaction.user_id == user.id)
        .order_by(Interaction.timestamp.desc())
        .limit(limit)
    )
    if purpose:
        stmt = stmt.where(Interaction.purpose == purpose)
    if session_id:
        stmt = stmt.where(Interaction.session_id == session_id)
    rows = list(db.execute(stmt).scalars())
    return [InteractionSummary.model_validate(r) for r in rows]


@router.get("/{interaction_id}", response_model=InteractionDetail)
def get_interaction(
    interaction_id: str, db: DbSession, user: CurrentUser
) -> InteractionDetail:
    row = db.execute(
        select(Interaction).where(
            Interaction.id == interaction_id,
            Interaction.user_id == user.id,
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Interaction not found")
    return InteractionDetail.model_validate(row)


@router.get("/sessions/list", response_model=list[SessionSummary])
def list_sessions(
    db: DbSession, user: CurrentUser, limit: int = Query(20, ge=1, le=100)
) -> list[SessionSummary]:
    rows = db.execute(
        select(
            Interaction.session_id,
            func.min(Interaction.timestamp).label("started"),
            func.max(Interaction.timestamp).label("ended"),
            func.count().label("turns"),
            func.sum(Interaction.cost_usd).label("total_cost"),
            func.array_agg(func.distinct(Interaction.purpose)).label("purposes"),
        )
        .where(
            Interaction.user_id == user.id,
            Interaction.session_id.isnot(None),
        )
        .group_by(Interaction.session_id)
        .order_by(func.min(Interaction.timestamp).desc())
        .limit(limit)
    ).all()

    return [
        SessionSummary(
            session_id=r.session_id,
            started=r.started,
            ended=r.ended,
            turns=r.turns,
            total_cost=r.total_cost,
            purposes=r.purposes or [],
        )
        for r in rows
    ]


@router.get("/cost/summary", response_model=list[CostRow])
def cost_summary(db: DbSession, user: CurrentUser) -> list[CostRow]:
    rows = db.execute(
        select(
            func.to_char(Interaction.timestamp, "YYYY-MM-DD").label("day"),
            Interaction.purpose,
            Interaction.model,
            func.count().label("calls"),
            func.coalesce(func.sum(Interaction.input_tokens), 0).label("input_tokens"),
            func.coalesce(func.sum(Interaction.output_tokens), 0).label("output_tokens"),
            func.coalesce(func.sum(Interaction.cost_usd), 0.0).label("cost_usd"),
        )
        .where(
            Interaction.user_id == user.id,
            Interaction.cost_usd.isnot(None),
        )
        .group_by("day", Interaction.purpose, Interaction.model)
        .order_by("day", func.sum(Interaction.cost_usd).desc())
    ).all()

    return [
        CostRow(
            day=r.day,
            purpose=r.purpose,
            model=r.model,
            calls=r.calls,
            input_tokens=r.input_tokens,
            output_tokens=r.output_tokens,
            cost_usd=float(r.cost_usd),
        )
        for r in rows
    ]
