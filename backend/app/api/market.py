"""Market data endpoints: bars, news, technicals, ticker profile."""

from fastapi import APIRouter, Query

from app.api.deps import CurrentUser, DbSession
from app.schemas.market import (
    ArticleOut,
    BarOut,
    NewsListOut,
    PriceHistoryOut,
    TechnicalsOut,
    TickerInfoOut,
)
from app.services import market_data, news, technicals, ticker_info

router = APIRouter()


@router.get("/info/{ticker}", response_model=TickerInfoOut)
def get_ticker_info(
    ticker: str, db: DbSession, _: CurrentUser
) -> TickerInfoOut:
    """Company profile. Fetched lazily if missing."""
    t = ticker.upper().strip()
    row = ticker_info.get(db, t)
    if row is None or not row.name:
        row = ticker_info.fetch_and_store(db, t)
    if row is None:
        return TickerInfoOut(ticker=t)
    return TickerInfoOut(**ticker_info.serialize(row))


@router.get("/bars/{ticker}", response_model=PriceHistoryOut)
def get_bars(
    ticker: str,
    db: DbSession,
    _: CurrentUser,
    days: int = Query(30, ge=1, le=365),
) -> PriceHistoryOut:
    bars = market_data.get_bars(db, ticker=ticker, days=days)
    bar_out = [BarOut.model_validate(b) for b in bars]

    if not bar_out:
        return PriceHistoryOut(ticker=ticker.upper(), bars=[], bar_count=0)

    first, last = bars[0], bars[-1]
    pct_change = ((last.close - first.close) / first.close) * 100
    return PriceHistoryOut(
        ticker=ticker.upper(),
        bars=bar_out,
        bar_count=len(bars),
        period_start=first.timestamp.date().isoformat(),
        period_end=last.timestamp.date().isoformat(),
        period_change_pct=round(pct_change, 2),
        latest_close=round(last.close, 2),
    )


@router.get("/news/{ticker}", response_model=NewsListOut)
def get_news(
    ticker: str,
    db: DbSession,
    _: CurrentUser,
    limit: int = Query(20, ge=1, le=100),
    min_relevance: int = Query(0, ge=0, le=3),
) -> NewsListOut:
    result = news.get_recent_news(
        db, ticker=ticker, limit=limit, min_relevance=min_relevance
    )
    return NewsListOut(
        ticker=result["ticker"],
        article_count=result["article_count"],
        articles=[
            ArticleOut(
                id=a["id"],
                ticker=result["ticker"],
                published_at=a["published"],
                source=a["source"],
                headline=a["headline"],
                summary=a["summary"],
                url=a["url"],
                relevance_score=a.get("relevance", 0) or 0,
            )
            for a in result["articles"]
        ],
    )


@router.get("/technicals/{ticker}", response_model=TechnicalsOut)
def get_technicals(
    ticker: str, db: DbSession, _: CurrentUser
) -> TechnicalsOut:
    data = technicals.calculate(db, ticker=ticker)
    return TechnicalsOut(**data)
