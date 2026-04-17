"""
Chat service.

Handles a single user turn: appends the user message to the conversation,
runs the agent loop, yields events for streaming. The WebSocket handler
forwards these events to the frontend.

Session metadata is persisted via chat_sessions service — we touch the
session on each turn and auto-generate a title when the first message arrives.
"""

from collections.abc import Iterator

from app.ai.client import default_model
from app.ai.logged_client import LoggedAIClient
from app.db.session import SessionLocal
from app.services import chat_sessions
from app.services.agent_loop import AgentEvent, run_agent_loop


SYSTEM_PROMPT = """You are an interactive trading assistant helping a hobby trader think \
through their watchlist, specific setups, and trading concepts.

You have access to tools that pull live data from the user's database:
  - list_watchlist: what tickers they're tracking
  - get_price_history: daily OHLCV bars
  - get_recent_news: news with optional relevance filter (min_relevance 0-3)
  - calculate_technicals: SMA, RSI, volume vs avg
  - get_open_positions: the user's current holdings from their trade journal \
(cost basis, P&L, stop loss, thesis)
  - get_journal_entries: historical trades (open or closed) with full context
  - get_account_context: available brokerage cash and risk profile note

When to use the journal/account tools:
  - If the user asks about a stock they own ("what should I do with my NVDA?"), \
call get_open_positions or get_journal_entries FIRST. Their cost basis, \
existing thesis, and current P&L change the answer.
  - If the user asks about position sizing or "should I add," call \
get_account_context to see their cash and risk profile.
  - If you don't call these tools when they're relevant, you'll give \
generic advice instead of advice grounded in the user's actual situation.

Ground rules:
  - Use tools proactively. Don't guess at prices, RSI values, or news content.
  - Be direct and conversational. Match the user's tone. Skip conversational \
openers like "Great question" or "Let me think" — go straight to substance.
  - When discussing setups, always name what would invalidate your view.
  - When you don't know something, say so.
  - Never recommend a specific buy/sell action or position size. Your role is to \
surface information and help the user reason — not decide.
  - Teach when it's useful. If the user seems to be learning a concept, give a clear \
plain-English explanation alongside the analysis.
  - Keep initial responses focused. Start with the most relevant data, expand if asked."""


def handle_turn(
    client: LoggedAIClient,
    *,
    messages: list[dict],
    user_message: str,
    user_id: int,
    session_id: str,
    max_turns: int = 10,
) -> Iterator[AgentEvent]:
    """
    Append the user message, run the agent loop, yield events.
    Mutates `messages` in place so the caller keeps conversation history.

    Also manages session metadata: creates a row on first turn, generates a
    title from the first user message, touches updated_at on every turn.
    """
    is_first_turn = len(messages) == 0

    messages.append({"role": "user", "content": user_message})

    # Persist session metadata so the sidebar can show it even before
    # the assistant replies.
    if is_first_turn:
        with SessionLocal() as db:
            chat_sessions.get_or_create_session(
                db, session_id=session_id, user_id=user_id,
            )

    with SessionLocal() as db:
        model = default_model("briefing", db=db, user_id=user_id)

    yield from run_agent_loop(
        client,
        model=model,
        system=SYSTEM_PROMPT,
        messages=messages,
        user_id=user_id,
        session_id=session_id,
        purpose="chat",
        max_turns=max_turns,
    )

    # Post-turn: touch updated_at, and generate a title if we don't have one yet
    with SessionLocal() as db:
        session = chat_sessions.get_or_create_session(
            db, session_id=session_id, user_id=user_id,
        )
        needs_title = not session.title
        chat_sessions.touch_session(db, session_id=session_id, user_id=user_id)

    if is_first_turn and needs_title:
        title = chat_sessions.generate_title(
            client,
            user_message=user_message,
            user_id=user_id,
            session_id=session_id,
        )
        if title:
            with SessionLocal() as db:
                chat_sessions.update_session(
                    db, user_id=user_id, session_id=session_id, title=title,
                )
            # Emit a title-updated event so the frontend can show it immediately
            yield AgentEvent("title", {"title": title})
