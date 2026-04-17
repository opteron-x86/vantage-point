"""Watchlist endpoints."""

from fastapi import APIRouter, BackgroundTasks, HTTPException, status

from app.api.deps import CurrentUser, DbSession
from app.schemas.watchlist import AddTickerRequest, ReorderRequest, WatchlistItemOut
from app.services import ticker_info, watchlist
from app.services.background import refresh_ticker_background

router = APIRouter()


def _enrich(item, info_by_ticker: dict) -> WatchlistItemOut:
    info = info_by_ticker.get(item.ticker)
    return WatchlistItemOut(
        ticker=item.ticker,
        position=item.position,
        added_at=item.added_at,
        name=info.name if info else None,
        sector=info.sector if info else None,
        industry=info.industry if info else None,
    )


@router.get("", response_model=list[WatchlistItemOut])
def list_watchlist(db: DbSession, user: CurrentUser) -> list[WatchlistItemOut]:
    items = watchlist.list_items(db, user_id=user.id)
    info = ticker_info.list_many(db, [i.ticker for i in items])
    return [_enrich(i, info) for i in items]


@router.post("", response_model=WatchlistItemOut, status_code=status.HTTP_201_CREATED)
def add_ticker(
    body: AddTickerRequest,
    db: DbSession,
    user: CurrentUser,
    background: BackgroundTasks,
) -> WatchlistItemOut:
    item = watchlist.add_ticker(db, user_id=user.id, ticker=body.ticker)
    background.add_task(refresh_ticker_background, item.ticker)
    info = ticker_info.list_many(db, [item.ticker])
    return _enrich(item, info)


@router.delete("/{ticker}", status_code=status.HTTP_204_NO_CONTENT)
def remove_ticker(ticker: str, db: DbSession, user: CurrentUser) -> None:
    removed = watchlist.remove_ticker(db, user_id=user.id, ticker=ticker)
    if not removed:
        raise HTTPException(status_code=404, detail=f"{ticker.upper()} not in watchlist")


@router.post("/reorder", status_code=status.HTTP_204_NO_CONTENT)
def reorder(body: ReorderRequest, db: DbSession, user: CurrentUser) -> None:
    watchlist.reorder(db, user_id=user.id, ticker_order=body.tickers)
