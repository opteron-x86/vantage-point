"""Watchlist endpoints."""

from fastapi import APIRouter, BackgroundTasks, HTTPException, status

from app.api.deps import CurrentUser, DbSession
from app.schemas.watchlist import AddTickerRequest, ReorderRequest, WatchlistItemOut
from app.services import watchlist
from app.services.background import refresh_ticker_background

router = APIRouter()


@router.get("", response_model=list[WatchlistItemOut])
def list_watchlist(db: DbSession, user: CurrentUser) -> list[WatchlistItemOut]:
    items = watchlist.list_items(db, user_id=user.id)
    return [WatchlistItemOut.model_validate(i) for i in items]


@router.post("", response_model=WatchlistItemOut, status_code=status.HTTP_201_CREATED)
def add_ticker(
    body: AddTickerRequest,
    db: DbSession,
    user: CurrentUser,
    background: BackgroundTasks,
) -> WatchlistItemOut:
    item = watchlist.add_ticker(db, user_id=user.id, ticker=body.ticker)
    # Kick off a background fetch so prices/news are ready shortly.
    # Safe to run even if the ticker was already in the watchlist — upserts are idempotent.
    background.add_task(refresh_ticker_background, item.ticker)
    return WatchlistItemOut.model_validate(item)


@router.delete("/{ticker}", status_code=status.HTTP_204_NO_CONTENT)
def remove_ticker(ticker: str, db: DbSession, user: CurrentUser) -> None:
    removed = watchlist.remove_ticker(db, user_id=user.id, ticker=ticker)
    if not removed:
        raise HTTPException(status_code=404, detail=f"{ticker.upper()} not in watchlist")


@router.post("/reorder", status_code=status.HTTP_204_NO_CONTENT)
def reorder(body: ReorderRequest, db: DbSession, user: CurrentUser) -> None:
    watchlist.reorder(db, user_id=user.id, ticker_order=body.tickers)
