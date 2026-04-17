"""Journal endpoints."""

from typing import Literal

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import CurrentUser, DbSession
from app.schemas.journal import (
    CloseEntryRequest,
    CreateEntryRequest,
    JournalEntryOut,
    OpenPositionsOut,
    UpdateEntryRequest,
)
from app.services import journal

router = APIRouter()


@router.get("", response_model=list[JournalEntryOut])
def list_entries(
    db: DbSession,
    user: CurrentUser,
    entry_status: Literal["open", "closed"] | None = Query(None, alias="status"),
) -> list[JournalEntryOut]:
    entries = journal.list_entries(db, user_id=user.id, status=entry_status)
    return [JournalEntryOut.model_validate(journal.serialize(db, e)) for e in entries]


@router.get("/open-positions", response_model=OpenPositionsOut)
def open_positions(db: DbSession, user: CurrentUser) -> OpenPositionsOut:
    data = journal.summarize_open_positions(db, user_id=user.id)
    return OpenPositionsOut.model_validate(data)


@router.get("/{entry_id}", response_model=JournalEntryOut)
def get_entry(
    entry_id: int, db: DbSession, user: CurrentUser
) -> JournalEntryOut:
    entry = journal.get_entry(db, user_id=user.id, entry_id=entry_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Entry not found")
    return JournalEntryOut.model_validate(journal.serialize(db, entry))


@router.post("", response_model=JournalEntryOut, status_code=status.HTTP_201_CREATED)
def create_entry(
    body: CreateEntryRequest, db: DbSession, user: CurrentUser
) -> JournalEntryOut:
    try:
        entry = journal.create_entry(
            db,
            user_id=user.id,
            ticker=body.ticker,
            shares=body.shares,
            cost_basis=body.cost_basis,
            entry_date=body.entry_date,
            entry_precision=body.entry_precision,
            thesis=body.thesis,
            stop_loss=body.stop_loss,
            target_price=body.target_price,
            time_horizon=body.time_horizon,
            notes=body.notes,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return JournalEntryOut.model_validate(journal.serialize(db, entry))


@router.patch("/{entry_id}", response_model=JournalEntryOut)
def update_entry(
    entry_id: int,
    body: UpdateEntryRequest,
    db: DbSession,
    user: CurrentUser,
) -> JournalEntryOut:
    # Strip None values so we only touch fields the caller actually sent
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    entry = journal.update_entry(
        db, user_id=user.id, entry_id=entry_id, updates=updates
    )
    if entry is None:
        raise HTTPException(status_code=404, detail="Entry not found")
    return JournalEntryOut.model_validate(journal.serialize(db, entry))


@router.post("/{entry_id}/close", response_model=JournalEntryOut)
def close_entry(
    entry_id: int,
    body: CloseEntryRequest,
    db: DbSession,
    user: CurrentUser,
) -> JournalEntryOut:
    try:
        entry = journal.close_entry(
            db,
            user_id=user.id,
            entry_id=entry_id,
            exit_price=body.exit_price,
            exit_date=body.exit_date,
            exit_notes=body.exit_notes,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    if entry is None:
        raise HTTPException(status_code=404, detail="Entry not found")
    return JournalEntryOut.model_validate(journal.serialize(db, entry))


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_entry(entry_id: int, db: DbSession, user: CurrentUser) -> None:
    removed = journal.delete_entry(db, user_id=user.id, entry_id=entry_id)
    if not removed:
        raise HTTPException(status_code=404, detail="Entry not found")
