"""
Chat endpoints.

REST endpoints for session management:
  GET    /api/chat/sessions             list the user's chat sessions
  GET    /api/chat/sessions/{id}/messages  reconstruct turns from interactions
  PATCH  /api/chat/sessions/{id}        rename / pin
  DELETE /api/chat/sessions/{id}

WebSocket protocol:
  Client connects to /api/chat/ws?token=<jwt>

  Server immediately sends { kind: "session", session_id, title }.
  Client can send:
    { kind: "user_message", text }
    { kind: "new" }                           # start a fresh session
    { kind: "resume", session_id: "..." }     # load an existing one

  Server streams: text -> tool_call -> tool_result -> ... -> done
  Plus { kind: "title", title } when auto-generated on first turn.
"""

import asyncio
import json

from fastapi import APIRouter, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy.orm import Session

from app.ai.logged_client import get_logged_client, new_session_id
from app.api.deps import CurrentUser, DbSession
from app.auth.tokens import TokenError, decode_access_token
from app.db.session import SessionLocal
from app.schemas.chat import (
    ChatSessionOut,
    SessionMessagesOut,
    ServerDone,
    ServerError,
    ServerSession,
    ServerText,
    ServerTitle,
    ServerToolCall,
    ServerToolResult,
    UpdateSessionRequest,
)
from app.services import chat as chat_service
from app.services import chat_sessions as sessions_service
from app.services import users

router = APIRouter()


# ---------------------------------------------------------------------------
# REST — session management
# ---------------------------------------------------------------------------

@router.get("/sessions", response_model=list[ChatSessionOut])
def list_chat_sessions(
    db: DbSession, user: CurrentUser, limit: int = Query(100, ge=1, le=500)
) -> list[ChatSessionOut]:
    items = sessions_service.list_sessions(db, user_id=user.id, limit=limit)
    return [ChatSessionOut.model_validate(s) for s in items]


@router.get("/sessions/{session_id}/messages", response_model=SessionMessagesOut)
def get_session_messages(
    session_id: str, db: DbSession, user: CurrentUser
) -> SessionMessagesOut:
    session = sessions_service.get_session(db, user_id=user.id, session_id=session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    turns = sessions_service.reconstruct_turns_for_ui(
        db, user_id=user.id, session_id=session_id,
    )
    return SessionMessagesOut(session_id=session_id, turns=turns)


@router.patch("/sessions/{session_id}", response_model=ChatSessionOut)
def update_chat_session(
    session_id: str,
    body: UpdateSessionRequest,
    db: DbSession,
    user: CurrentUser,
) -> ChatSessionOut:
    session = sessions_service.update_session(
        db,
        user_id=user.id,
        session_id=session_id,
        title=body.title,
        pinned=body.pinned,
    )
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return ChatSessionOut.model_validate(session)


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_chat_session(
    session_id: str, db: DbSession, user: CurrentUser
) -> None:
    removed = sessions_service.delete_session(
        db, user_id=user.id, session_id=session_id,
    )
    if not removed:
        raise HTTPException(status_code=404, detail="Session not found")


# ---------------------------------------------------------------------------
# WebSocket
# ---------------------------------------------------------------------------

def _authenticate_ws_token(token: str, db: Session) -> int | None:
    try:
        payload = decode_access_token(token)
    except TokenError:
        return None
    try:
        user_id = int(payload.get("sub", ""))
    except (TypeError, ValueError):
        return None
    user = users.get_by_id(db, user_id)
    if user is None or not user.is_active:
        return None
    return user_id


async def _send(ws: WebSocket, payload_model) -> None:
    await ws.send_text(payload_model.model_dump_json())


def _rebuild_messages_for_session(user_id: int, session_id: str) -> list[dict]:
    """Rebuild the raw `messages` list (for feeding back to the model) from DB."""
    with SessionLocal() as db:
        return sessions_service.reconstruct_messages(
            db, user_id=user_id, session_id=session_id,
        )


def _fetch_session_title(user_id: int, session_id: str) -> str | None:
    with SessionLocal() as db:
        session = sessions_service.get_session(
            db, user_id=user_id, session_id=session_id,
        )
        return session.title if session else None


@router.websocket("/ws")
async def chat_ws(
    websocket: WebSocket,
    token: str = Query(...),
) -> None:
    # Authenticate before accepting
    with SessionLocal() as db:
        user_id = _authenticate_ws_token(token, db)

    if user_id is None:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await websocket.accept()
    session_id = new_session_id(prefix="chat")
    messages: list[dict] = []

    await _send(websocket, ServerSession(session_id=session_id, title=None))

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await _send(websocket, ServerError(message="Invalid JSON"))
                continue

            kind = msg.get("kind")

            if kind == "new":
                messages.clear()
                session_id = new_session_id(prefix="chat")
                await _send(websocket, ServerSession(session_id=session_id, title=None))
                continue

            if kind == "resume":
                resume_id = msg.get("session_id")
                if not isinstance(resume_id, str) or not resume_id:
                    await _send(websocket, ServerError(message="resume requires session_id"))
                    continue
                # Verify the session belongs to this user before loading
                with SessionLocal() as db:
                    existing = sessions_service.get_session(
                        db, user_id=user_id, session_id=resume_id,
                    )
                if existing is None:
                    await _send(websocket, ServerError(message="Session not found"))
                    continue

                session_id = resume_id
                messages = _rebuild_messages_for_session(user_id, session_id)
                title = _fetch_session_title(user_id, session_id)
                await _send(websocket, ServerSession(session_id=session_id, title=title))
                continue

            if kind != "user_message":
                await _send(websocket, ServerError(message=f"Unknown kind: {kind}"))
                continue

            user_text = (msg.get("text") or "").strip()
            if not user_text:
                await _send(websocket, ServerError(message="Empty message"))
                continue

            await _stream_turn(
                websocket=websocket,
                messages=messages,
                user_text=user_text,
                user_id=user_id,
                session_id=session_id,
            )
    except WebSocketDisconnect:
        return
    except Exception as e:
        try:
            await _send(websocket, ServerError(message=f"{e.__class__.__name__}: {e}"))
        except Exception:
            pass


async def _stream_turn(
    *,
    websocket: WebSocket,
    messages: list[dict],
    user_text: str,
    user_id: int,
    session_id: str,
) -> None:
    loop = asyncio.get_running_loop()
    queue: asyncio.Queue = asyncio.Queue()
    _SENTINEL = object()

    def run_sync() -> None:
        with SessionLocal() as db:
            client = get_logged_client(db=db, user_id=user_id)
        try:
            for event in chat_service.handle_turn(
                client,
                messages=messages,
                user_message=user_text,
                user_id=user_id,
                session_id=session_id,
            ):
                loop.call_soon_threadsafe(queue.put_nowait, event)
        finally:
            loop.call_soon_threadsafe(queue.put_nowait, _SENTINEL)

    task = asyncio.create_task(asyncio.to_thread(run_sync))

    while True:
        event = await queue.get()
        if event is _SENTINEL:
            break
        if event.kind == "text":
            await _send(websocket, ServerText(text=event.data["text"]))
        elif event.kind == "tool_call":
            await _send(websocket, ServerToolCall(**event.data))
        elif event.kind == "tool_result":
            await _send(websocket, ServerToolResult(**event.data))
        elif event.kind == "done":
            await _send(websocket, ServerDone(final_text=event.data["final_text"]))
        elif event.kind == "title":
            await _send(websocket, ServerTitle(title=event.data["title"]))
        elif event.kind == "error":
            await _send(websocket, ServerError(message=event.data["message"]))

    await task
