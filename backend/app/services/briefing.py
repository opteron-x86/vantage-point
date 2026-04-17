"""
Briefing service.

Generates a morning briefing by running the agent loop with the briefing
system prompt, then persists the final markdown to the `briefings` table.
"""

from datetime import UTC, date, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.client import default_model
from app.ai.logged_client import LoggedAIClient, new_session_id
from app.db.models import Briefing
from app.services.agent_loop import run_agent_loop


SYSTEM_PROMPT = """You are a trading assistant producing a morning briefing for a hobby trader.

You have access to tools for:
  - The user's watchlist (tickers they track)
  - Company metadata (full name, sector, industry) for any ticker
  - Price history, technicals, and news for any ticker
  - The user's OPEN POSITIONS from their trade journal (tickers they actually own, \
with cost basis, current P&L, stop loss, thesis)

Workflow:
  1. Call list_watchlist and get_open_positions in parallel.
  2. Call get_ticker_info for each ticker so you know the company names.
  3. For each watchlist ticker, gather price history, technicals, and HIGH-relevance \
news (min_relevance=3; fall back to 2 if nothing returns).
  4. For open positions, also flag anything notable — crossed a stop level, hit a \
target, significant news since entry, no stop/target set despite large unrealized gain.
  5. Produce the final briefing.

Ticker formatting in prose: on FIRST mention of a ticker in a section, write it as \
"Company Name (TICKER)" — e.g., "Advanced Micro Devices (AMD)". Subsequent mentions \
in the same section use just the ticker. Section headers can use bare tickers.

OUTPUT FORMAT — begin your response DIRECTLY with the markdown briefing below.
NO preamble. Do NOT start with "Here's", "Perfect", "I now have", "Based on the data", \
or any conversational opener. The first characters of your response must be "## Market Summary".
NO closing pleasantries. Do NOT end with "Let me know if", "Hope this helps", \
"End of briefing", or similar. End with the last question in "Questions to Consider".

## Market Summary
Brief overall take — what stands out across the watchlist today.

## Per-Ticker Highlights
For each ticker, a short paragraph covering recent price action, key news catalysts, and \
anything notable about volume or momentum. If the user has an open position in the ticker, \
reference it naturally ("your position is up X%").

## Open Positions Check
Only include this section if the user has open positions. For each position, one line:
what's the current status, and is there anything specifically to think about (stop hit, \
target approaching, thesis validated/broken, missing stop-loss, etc.).
If no open positions, omit the section entirely.

## Worth a Closer Look
1-3 setups that deserve the trader's review today. For each:
  - **Ticker and thesis** in one sentence
  - **What you're seeing** (the specific signals)
  - **What would invalidate this view** (always include it)

## Questions to Consider
2-3 educational, situation-specific questions the trader should think about today.

Guidelines:
  - Be direct and concise. No filler.
  - When you reference numbers, they must come from tool calls, not your memory.
  - If data is thin or unavailable, say so — don't paper over gaps.
  - Never recommend a specific buy/sell action. Your role is to surface and explain.
  - Always include what would change your interpretation."""


def generate_briefing(
    db: Session,
    client: LoggedAIClient,
    *,
    user_id: int,
) -> dict[str, Any]:
    """Run the agent loop, persist the briefing, return the result."""
    today = date.today().isoformat()
    session_id = new_session_id(prefix="briefing")
    model = default_model("briefing", db=db, user_id=user_id)

    messages: list[dict] = [{
        "role": "user",
        "content": (
            f"Today is {today}. Generate my morning briefing for the watchlist. "
            f"Use the tools to pull fresh data — don't assume anything."
        ),
    }]

    final_text = ""
    tool_calls_summary: list[dict] = []
    error: str | None = None

    for event in run_agent_loop(
        client,
        model=model,
        system=SYSTEM_PROMPT,
        messages=messages,
        user_id=user_id,
        session_id=session_id,
        purpose="briefing",
    ):
        if event.kind == "tool_call":
            tool_calls_summary.append({"name": event.data["name"], "input": event.data["input"]})
        elif event.kind == "done":
            final_text = event.data["final_text"]
        elif event.kind == "error":
            error = event.data["message"]

    if error and not final_text:
        return {"error": error, "session_id": session_id}

    briefing = Briefing(
        user_id=user_id,
        date=datetime.now(UTC),
        session_id=session_id,
        content_markdown=final_text,
        model=model,
    )
    db.add(briefing)
    db.commit()
    db.refresh(briefing)

    return {
        "id": briefing.id,
        "session_id": session_id,
        "content_markdown": final_text,
        "model": model,
        "date": briefing.date.isoformat(),
        "tool_calls": tool_calls_summary,
    }


def list_briefings(db: Session, *, user_id: int, limit: int = 30) -> list[Briefing]:
    return list(db.execute(
        select(Briefing)
        .where(Briefing.user_id == user_id)
        .order_by(Briefing.date.desc())
        .limit(limit)
    ).scalars())


def get_briefing(db: Session, *, user_id: int, briefing_id: int) -> Briefing | None:
    return db.execute(
        select(Briefing).where(
            Briefing.id == briefing_id,
            Briefing.user_id == user_id,
        )
    ).scalar_one_or_none()
