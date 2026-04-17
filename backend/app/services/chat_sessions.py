"""
Chat session service.

Session metadata (title, pinned, timestamps) lives in `chat_sessions`.
Conversation content lives in the `interactions` table — `reconstruct_messages`
replays the latest interaction's messages list for a given session_id to
rebuild the full conversation state.

First user message triggers a classifier-model call to generate a short title.
On failure, the fallback is a truncated copy of the message.
"""

from datetime import UTC, datetime
from typing import Any

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.ai.client import default_model
from app.ai.logged_client import LoggedAIClient
from app.db.models import ChatSession, Interaction
from app.db.session import SessionLocal


TITLE_SYSTEM_PROMPT = """You generate very short titles for chat conversations.

Given the user's first message in a trading-assistant chat, produce a 3-6 word \
title that captures the topic. No punctuation at the end. No quotes. No prefix \
like "Title:". Just the title.

Examples:
  Input: "what should i do with my NVDA? up 100%"
  Output: NVDA position review

  Input: "Walk me through TSLA's setup right now"
  Output: TSLA setup walkthrough

  Input: "Explain RSI in the context of AAPL"
  Output: RSI explained with AAPL"""


# ---------------------------------------------------------------------------
# Session metadata CRUD
# ---------------------------------------------------------------------------

def get_or_create_session(
    db: Session,
    *,
    session_id: str,
    user_id: int,
) -> ChatSession:
    """Get an existing session or create a new row for it."""
    session = db.get(ChatSession, session_id)
    if session is None:
        session = ChatSession(session_id=session_id, user_id=user_id)
        db.add(session)
        db.commit()
        db.refresh(session)
    return session


def list_sessions(
    db: Session,
    *,
    user_id: int,
    limit: int = 100,
) -> list[ChatSession]:
    """List a user's chat sessions, pinned first, then most-recent first."""
    rows = db.execute(
        select(ChatSession)
        .where(ChatSession.user_id == user_id)
        .order_by(desc(ChatSession.pinned), desc(ChatSession.updated_at))
        .limit(limit)
    ).scalars()
    return list(rows)


def get_session(
    db: Session,
    *,
    user_id: int,
    session_id: str,
) -> ChatSession | None:
    session = db.get(ChatSession, session_id)
    if session is None or session.user_id != user_id:
        return None
    return session


def update_session(
    db: Session,
    *,
    user_id: int,
    session_id: str,
    title: str | None = None,
    pinned: bool | None = None,
) -> ChatSession | None:
    session = get_session(db, user_id=user_id, session_id=session_id)
    if session is None:
        return None
    if title is not None:
        session.title = title[:120]
    if pinned is not None:
        session.pinned = pinned
    db.commit()
    db.refresh(session)
    return session


def delete_session(
    db: Session,
    *,
    user_id: int,
    session_id: str,
) -> bool:
    """Delete session metadata. Interaction rows are left for audit."""
    session = get_session(db, user_id=user_id, session_id=session_id)
    if session is None:
        return False
    db.delete(session)
    db.commit()
    return True


def touch_session(
    db: Session,
    *,
    session_id: str,
    user_id: int,
) -> None:
    """Bump updated_at on the session so recency sort reflects activity."""
    session = get_or_create_session(db, session_id=session_id, user_id=user_id)
    session.updated_at = datetime.now(UTC)
    db.commit()


# ---------------------------------------------------------------------------
# Message reconstruction
# ---------------------------------------------------------------------------

def reconstruct_messages(
    db: Session,
    *,
    user_id: int,
    session_id: str,
) -> list[dict[str, Any]]:
    """
    Reconstruct the full conversation state for a session.

    We read the latest interaction for this session+user and return the
    messages list that was present when that call was made, PLUS the
    assistant response from that same interaction. That gives us the
    complete post-turn state.
    """
    last = db.execute(
        select(Interaction)
        .where(
            Interaction.session_id == session_id,
            Interaction.user_id == user_id,
            Interaction.purpose == "chat",
        )
        .order_by(Interaction.timestamp.desc())
        .limit(1)
    ).scalar_one_or_none()

    if last is None:
        return []

    messages: list[dict[str, Any]] = list(last.messages or [])

    # Append the assistant response from this turn, if any
    assistant_content: list[dict[str, Any]] = []
    if last.response_text:
        assistant_content.append({"type": "text", "text": last.response_text})
    if last.tool_calls:
        for call in last.tool_calls:
            assistant_content.append({
                "type": "tool_use",
                "id": call.get("id"),
                "name": call.get("name"),
                "input": call.get("input", {}),
            })

    if assistant_content:
        # Reduce to a simple string if only text, matching the chat service's pattern
        if len(assistant_content) == 1 and assistant_content[0]["type"] == "text":
            messages.append({"role": "assistant", "content": assistant_content[0]["text"]})
        else:
            messages.append({"role": "assistant", "content": assistant_content})

    return messages


def reconstruct_turns_for_ui(
    db: Session,
    *,
    user_id: int,
    session_id: str,
) -> list[dict[str, Any]]:
    """
    UI-shaped reconstruction: returns a list of {id, role, text, toolCalls}
    turns suitable for feeding directly into the chat panel.

    This diverges from `reconstruct_messages` in that we collapse the
    model's internal representation (text blocks, tool_use blocks, tool_result
    messages) back into user-visible turns.
    """
    # Pull the full interaction history for this session, ordered ascending
    rows = db.execute(
        select(Interaction)
        .where(
            Interaction.session_id == session_id,
            Interaction.user_id == user_id,
            Interaction.purpose == "chat",
        )
        .order_by(Interaction.timestamp.asc())
    ).scalars()
    interactions = list(rows)
    if not interactions:
        return []

    turns: list[dict[str, Any]] = []
    seen_user_turns: set[int] = set()  # by index within messages list

    # Walk messages from the LATEST interaction (it has the full conversation)
    # plus the assistant response from that same call
    last = interactions[-1]
    messages: list[dict[str, Any]] = list(last.messages or [])

    current_assistant: dict[str, Any] | None = None

    def flush_assistant() -> None:
        nonlocal current_assistant
        if current_assistant is not None:
            turns.append(current_assistant)
            current_assistant = None

    for msg in messages:
        role = msg.get("role")
        content = msg.get("content")

        if role == "user":
            flush_assistant()
            if isinstance(content, str):
                turns.append({
                    "id": f"t{len(turns)}",
                    "role": "user",
                    "text": content,
                })
            elif isinstance(content, list):
                # This is a user turn carrying tool_result blocks — merge into
                # the preceding assistant turn's tool calls
                for block in content:
                    if block.get("type") == "tool_result":
                        # Find the most recent assistant turn that has this tool call id
                        tool_id = block.get("tool_use_id")
                        result_content = block.get("content", "")
                        try:
                            import json
                            result = json.loads(result_content) if isinstance(result_content, str) else result_content
                        except (json.JSONDecodeError, TypeError):
                            result = {"raw": result_content}
                        for turn in reversed(turns):
                            if turn["role"] == "assistant" and turn.get("toolCalls"):
                                for tc in turn["toolCalls"]:
                                    if tc["id"] == tool_id:
                                        tc["result"] = result
                                        break
                                break

        elif role == "assistant":
            # Start or continue the current assistant turn
            if current_assistant is None:
                current_assistant = {
                    "id": f"t{len(turns)}",
                    "role": "assistant",
                    "text": "",
                    "toolCalls": [],
                }
            if isinstance(content, str):
                current_assistant["text"] = (
                    (current_assistant["text"] + "\n\n" + content).strip()
                    if current_assistant["text"]
                    else content
                )
            elif isinstance(content, list):
                for block in content:
                    btype = block.get("type")
                    if btype == "text":
                        current_assistant["text"] = (
                            (current_assistant["text"] + "\n\n" + block.get("text", "")).strip()
                            if current_assistant["text"]
                            else block.get("text", "")
                        )
                    elif btype == "tool_use":
                        current_assistant["toolCalls"].append({
                            "id": block.get("id"),
                            "name": block.get("name"),
                            "input": block.get("input", {}),
                        })

    # Append the last interaction's assistant response (not yet in messages list)
    if current_assistant is None:
        current_assistant = {
            "id": f"t{len(turns)}",
            "role": "assistant",
            "text": last.response_text or "",
            "toolCalls": [],
        }
    else:
        if last.response_text:
            current_assistant["text"] = (
                (current_assistant["text"] + "\n\n" + last.response_text).strip()
                if current_assistant["text"]
                else last.response_text
            )

    flush_assistant()

    # Drop any empty trailing assistant turn
    if turns and turns[-1]["role"] == "assistant" and not turns[-1]["text"] and not turns[-1].get("toolCalls"):
        turns.pop()

    # Clean up empty toolCalls arrays
    for turn in turns:
        if turn["role"] == "assistant" and not turn.get("toolCalls"):
            turn.pop("toolCalls", None)

    return turns


# ---------------------------------------------------------------------------
# Title generation
# ---------------------------------------------------------------------------

def generate_title(
    client: LoggedAIClient,
    *,
    user_message: str,
    user_id: int,
    session_id: str,
) -> str | None:
    """Use the classifier model to generate a short title."""
    trimmed = user_message.strip()
    if not trimmed:
        return None
    try:
        with SessionLocal() as db:
            model = default_model("classifier", db=db, user_id=user_id)
        response = client.complete(
            model=model,
            system=TITLE_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": trimmed[:500]}],
            max_tokens=30,
            temperature=0.3,
            purpose="chat_title",
            session_id=session_id,
            user_id=user_id,
        )
        if response.text_blocks:
            title = response.text_blocks[0].strip().strip('"').strip("'")
            return title[:120] if title else None
    except Exception as e:
        print(f"[chat_sessions.generate_title] failed: {e}")

    return trimmed[:60] + ("…" if len(trimmed) > 60 else "")