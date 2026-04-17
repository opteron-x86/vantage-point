"""
AI tools the model can call during briefings and chat.

Each tool has an Anthropic-format schema (the OpenRouter client converts
to OpenAI-format on the wire) plus a Python implementation that reads
from the database via services.

The dispatcher opens a short-lived DB session per tool call — tool calls
happen at natural boundaries in the agent loop, so a fresh session per
call keeps ownership simple.
"""

from typing import Any

from app.db.session import SessionLocal
from app.services import (
    journal,
    market_data,
    news,
    settings as settings_service,
    technicals,
    ticker_info,
    watchlist,
)


# ---------------------------------------------------------------------------
# Tool implementations
# ---------------------------------------------------------------------------

def _list_watchlist(user_id: int) -> dict:
    with SessionLocal() as db:
        tickers = watchlist.list_tickers(db, user_id=user_id)
    return {"tickers": tickers}


def _get_price_history(ticker: str, days: int = 30) -> dict:
    with SessionLocal() as db:
        return market_data.get_price_history(db, ticker=ticker, days=days)


def _get_recent_news(ticker: str, limit: int = 10, min_relevance: int = 0) -> dict:
    with SessionLocal() as db:
        return news.get_recent_news(
            db, ticker=ticker, limit=limit, min_relevance=min_relevance
        )


def _calculate_technicals(ticker: str) -> dict:
    with SessionLocal() as db:
        return technicals.calculate(db, ticker=ticker)


def _get_open_positions(user_id: int) -> dict:
    with SessionLocal() as db:
        return journal.summarize_open_positions(db, user_id=user_id)


def _get_journal_entries(
    user_id: int,
    status: str | None = None,
    ticker: str | None = None,
) -> dict:
    with SessionLocal() as db:
        entries = journal.list_entries(db, user_id=user_id, status=status)
        if ticker:
            t = ticker.upper().strip()
            entries = [e for e in entries if e.ticker == t]
        return {
            "count": len(entries),
            "entries": [journal.serialize(db, e) for e in entries],
        }


def _get_account_context(user_id: int) -> dict:
    with SessionLocal() as db:
        return settings_service.get_account_context(db, user_id=user_id)


def _get_ticker_info(ticker: str) -> dict:
    with SessionLocal() as db:
        t = ticker.upper().strip()
        row = ticker_info.get(db, t)
        if row is None or not row.name:
            row = ticker_info.fetch_and_store(db, t)
        return ticker_info.serialize(row) if row else {"ticker": t}


# ---------------------------------------------------------------------------
# Schemas (Anthropic format; OpenRouter client converts as needed)
# ---------------------------------------------------------------------------

TOOL_SCHEMAS: list[dict[str, Any]] = [
    {
        "name": "list_watchlist",
        "description": "Return the user's tracked tickers.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "get_ticker_info",
        "description": (
            "Get company metadata for a ticker: full company name, sector, "
            "industry, exchange, country, market cap. Call this when first "
            "discussing any ticker so you can refer to it by name "
            "(e.g. 'Apple (AAPL)' instead of just 'AAPL')."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "ticker": {"type": "string", "description": "Stock ticker symbol"},
            },
            "required": ["ticker"],
        },
    },
    {
        "name": "get_price_history",
        "description": (
            "Get recent daily OHLCV bars for a ticker, plus summary stats "
            "like period change. Use this to see recent price action."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "ticker": {"type": "string", "description": "Stock ticker symbol, e.g. 'AAPL'"},
                "days": {"type": "integer", "description": "Calendar days to look back (default 30)", "default": 30},
            },
            "required": ["ticker"],
        },
    },
    {
        "name": "get_recent_news",
        "description": (
            "Get recent news articles for a ticker. Use min_relevance=3 to "
            "filter to primary-subject articles only; 2 also returns sector/peer "
            "pieces; 0 (default) returns everything including market recaps."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "ticker": {"type": "string"},
                "limit": {"type": "integer", "default": 10},
                "min_relevance": {"type": "integer", "description": "0-3", "default": 0},
            },
            "required": ["ticker"],
        },
    },
    {
        "name": "calculate_technicals",
        "description": (
            "Compute basic technical indicators: SMA(5/10/20), RSI(14), "
            "volume vs 20-day average, period high/low."
        ),
        "input_schema": {
            "type": "object",
            "properties": {"ticker": {"type": "string"}},
            "required": ["ticker"],
        },
    },
    {
        "name": "get_open_positions",
        "description": (
            "Return the user's current open positions from their trade journal, "
            "with cost basis, current market value, unrealized P&L, and portfolio "
            "aggregates. Use this when the user asks about their holdings, "
            "position sizing, or what to do about a specific position they own."
        ),
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "get_journal_entries",
        "description": (
            "List journal entries for the user. Filter by status ('open' or 'closed') "
            "and/or ticker. Includes thesis, stop loss, target, and current P&L where "
            "applicable. Use this to understand the user's trading history and context."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "status": {
                    "type": "string",
                    "enum": ["open", "closed"],
                    "description": "Filter to open or closed entries (default: all)",
                },
                "ticker": {
                    "type": "string",
                    "description": "Filter to a specific ticker",
                },
            },
        },
    },
    {
        "name": "get_account_context",
        "description": (
            "Return the user's brokerage account context: available cash and risk "
            "profile note (if they've set them). Scoped to their trading account only "
            "— does NOT include 401k, IRA, or broader financial picture. Use this "
            "BEFORE giving position-sizing advice, so you know what's realistic."
        ),
        "input_schema": {"type": "object", "properties": {}},
    },
]


# ---------------------------------------------------------------------------
# Dispatcher
# ---------------------------------------------------------------------------

def dispatch_tool(name: str, tool_input: dict, *, user_id: int) -> dict:
    """
    Execute a tool by name. `user_id` is injected by the caller (not exposed
    to the model) so user-scoped tools only see the current user's data.
    """
    try:
        if name == "list_watchlist":
            return _list_watchlist(user_id=user_id)
        if name == "get_ticker_info":
            return _get_ticker_info(**tool_input)
        if name == "get_price_history":
            return _get_price_history(**tool_input)
        if name == "get_recent_news":
            return _get_recent_news(**tool_input)
        if name == "calculate_technicals":
            return _calculate_technicals(**tool_input)
        if name == "get_open_positions":
            return _get_open_positions(user_id=user_id)
        if name == "get_journal_entries":
            return _get_journal_entries(user_id=user_id, **tool_input)
        if name == "get_account_context":
            return _get_account_context(user_id=user_id)
        return {"error": f"Unknown tool: {name}"}
    except TypeError as e:
        return {"error": f"Bad arguments to {name}: {e}"}
    except Exception as e:
        return {"error": f"Tool {name} failed: {e.__class__.__name__}: {e}"}
