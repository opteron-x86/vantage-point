"""
Chat schemas.

Covers both the WebSocket message protocol and the REST endpoints for
persistent chat session management.

WebSocket protocol (client -> server):
  { "kind": "user_message", "text": "..." }
  { "kind": "new" }                            # start a new empty session
  { "kind": "resume", "session_id": "..." }    # load an existing session

Server -> client events:
  { "kind": "session", "session_id": "...", "title": "..." | null }
  { "kind": "text", "text": "..." }
  { "kind": "tool_call", "id", "name", "input" }
  { "kind": "tool_result", "id", "name", "result" }
  { "kind": "title", "title": "..." }          # auto-generated after first turn
  { "kind": "done", "final_text": "..." }
  { "kind": "error", "message": "..." }
"""

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel


# ---- Client -> server ----

class ClientUserMessage(BaseModel):
    kind: Literal["user_message"]
    text: str


class ClientNew(BaseModel):
    kind: Literal["new"]


class ClientResume(BaseModel):
    kind: Literal["resume"]
    session_id: str


# ---- Server -> client ----

class ServerSession(BaseModel):
    kind: Literal["session"] = "session"
    session_id: str
    title: str | None = None


class ServerText(BaseModel):
    kind: Literal["text"] = "text"
    text: str


class ServerToolCall(BaseModel):
    kind: Literal["tool_call"] = "tool_call"
    id: str
    name: str
    input: dict[str, Any]


class ServerToolResult(BaseModel):
    kind: Literal["tool_result"] = "tool_result"
    id: str
    name: str
    result: dict[str, Any]


class ServerTitle(BaseModel):
    kind: Literal["title"] = "title"
    title: str


class ServerDone(BaseModel):
    kind: Literal["done"] = "done"
    final_text: str


class ServerError(BaseModel):
    kind: Literal["error"] = "error"
    message: str


# ---- REST: session metadata ----

class ChatSessionOut(BaseModel):
    session_id: str
    title: str | None
    pinned: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UpdateSessionRequest(BaseModel):
    title: str | None = None
    pinned: bool | None = None


# ---- REST: message reconstruction ----

class ReconstructedTurn(BaseModel):
    """A single user-visible turn reconstructed from the interactions log."""
    id: str
    role: Literal["user", "assistant"]
    text: str
    toolCalls: list[dict[str, Any]] | None = None


class SessionMessagesOut(BaseModel):
    session_id: str
    turns: list[ReconstructedTurn]
