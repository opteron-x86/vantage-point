"""
Logged AI client: wraps the base client so every call lands in the
`interactions` table — for cost tracking, debugging, and audit.

Usage:
    client = get_logged_client()
    resp = client.complete(..., purpose="briefing", session_id=sid, user_id=uid)
"""

import time
import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy.orm import Session

from app.ai.client import AIClient, AIResponse, get_client
from app.ai.pricing import estimate_cost
from app.config import settings
from app.db.models import Interaction
from app.db.session import SessionLocal


def _extract_token_usage(raw: Any) -> tuple[int | None, int | None]:
    usage = getattr(raw, "usage", None)
    if usage is None:
        return None, None
    input_tokens = getattr(usage, "input_tokens", None) or getattr(usage, "prompt_tokens", None)
    output_tokens = getattr(usage, "output_tokens", None) or getattr(usage, "completion_tokens", None)
    return input_tokens, output_tokens


class LoggedAIClient:
    def __init__(self, inner: AIClient, db_factory=SessionLocal):
        self.inner = inner
        self._db_factory = db_factory

    def complete(
        self,
        model: str,
        system: str,
        messages: list[dict],
        tools: list[dict] | None = None,
        max_tokens: int = 4096,
        temperature: float = 1.0,
        *,
        purpose: str = "unknown",
        session_id: str | None = None,
        user_id: int | None = None,
    ) -> AIResponse:
        start = time.perf_counter()
        error: str | None = None
        response: AIResponse | None = None

        try:
            response = self.inner.complete(
                model=model,
                system=system,
                messages=messages,
                tools=tools,
                max_tokens=max_tokens,
                temperature=temperature,
            )
            return response
        except Exception as e:
            error = f"{e.__class__.__name__}: {e}"
            raise
        finally:
            duration_ms = int((time.perf_counter() - start) * 1000)
            self._persist(
                purpose=purpose,
                session_id=session_id,
                user_id=user_id,
                model=model,
                system=system,
                messages=messages,
                tools=tools,
                response=response,
                duration_ms=duration_ms,
                error=error,
            )

    def _persist(
        self,
        *,
        purpose: str,
        session_id: str | None,
        user_id: int | None,
        model: str,
        system: str,
        messages: list[dict],
        tools: list[dict] | None,
        response: AIResponse | None,
        duration_ms: int,
        error: str | None,
    ) -> None:
        try:
            input_tokens, output_tokens = (None, None)
            response_text = None
            tool_calls = None
            stop_reason = None
            cost = None

            if response is not None:
                input_tokens, output_tokens = _extract_token_usage(response.raw)
                response_text = "\n".join(response.text_blocks) if response.text_blocks else None
                tool_calls = response.tool_calls or None
                stop_reason = response.stop_reason
                if input_tokens is not None and output_tokens is not None:
                    cost = estimate_cost(model, input_tokens, output_tokens)

            db: Session = self._db_factory()
            try:
                row = Interaction(
                    id=str(uuid.uuid4()),
                    timestamp=datetime.now(UTC),
                    user_id=user_id,
                    session_id=session_id,
                    purpose=purpose,
                    provider=settings.ai_provider,
                    model=model,
                    system_prompt=system,
                    messages=messages,
                    tools=tools,
                    response_text=response_text,
                    tool_calls=tool_calls,
                    stop_reason=stop_reason,
                    input_tokens=input_tokens,
                    output_tokens=output_tokens,
                    cost_usd=cost,
                    duration_ms=duration_ms,
                    error=error,
                )
                db.add(row)
                db.commit()
            finally:
                db.close()
        except Exception as log_err:
            # Never let logging failure break the caller.
            print(f"[logged_client] failed to persist interaction: {log_err}")


def get_logged_client(
    *,
    db: Session | None = None,
    user_id: int | None = None,
) -> LoggedAIClient:
    return LoggedAIClient(inner=get_client(db=db, user_id=user_id))


def new_session_id(prefix: str = "sess") -> str:
    return f"{prefix}-{uuid.uuid4().hex[:12]}"
