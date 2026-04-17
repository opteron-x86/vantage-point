"""
Unified AI client.

One interface, two backends. `AIResponse` normalizes the important fields
(text blocks, tool calls, stop reason, raw response) so the rest of the
app never has to care which provider is active.

Provider and model selection resolve through:
  1. A user's `ai_config` row (when user_id is supplied)
  2. Environment variables
  3. Hardcoded defaults
"""

from dataclasses import dataclass
from typing import Any

from anthropic import Anthropic
from openai import OpenAI
from sqlalchemy.orm import Session

from app.ai.pricing import DEFAULT_MODELS
from app.config import Provider, settings


@dataclass
class AIResponse:
    text_blocks: list[str]
    tool_calls: list[dict[str, Any]]   # [{"id": str, "name": str, "input": dict}]
    stop_reason: str
    raw: Any


# ---------------------------------------------------------------------------
# Base
# ---------------------------------------------------------------------------

class AIClient:
    def complete(
        self,
        model: str,
        system: str,
        messages: list[dict],
        tools: list[dict] | None = None,
        max_tokens: int = 4096,
        temperature: float = 1.0,
    ) -> AIResponse:
        raise NotImplementedError


# ---------------------------------------------------------------------------
# Anthropic direct
# ---------------------------------------------------------------------------

class AnthropicClient(AIClient):
    def __init__(self, api_key: str):
        self._client = Anthropic(api_key=api_key)

    def complete(
        self,
        model: str,
        system: str,
        messages: list[dict],
        tools: list[dict] | None = None,
        max_tokens: int = 4096,
        temperature: float = 1.0,
    ) -> AIResponse:
        kwargs: dict[str, Any] = {
            "model": model,
            "system": system,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        if tools:
            kwargs["tools"] = tools

        resp = self._client.messages.create(**kwargs)

        text_blocks: list[str] = []
        tool_calls: list[dict[str, Any]] = []
        for block in resp.content:
            if block.type == "text":
                text_blocks.append(block.text)
            elif block.type == "tool_use":
                tool_calls.append({
                    "id": block.id,
                    "name": block.name,
                    "input": block.input,
                })

        return AIResponse(
            text_blocks=text_blocks,
            tool_calls=tool_calls,
            stop_reason=resp.stop_reason or "",
            raw=resp,
        )


# ---------------------------------------------------------------------------
# OpenRouter (OpenAI-compatible)
# ---------------------------------------------------------------------------

class OpenRouterClient(AIClient):
    """
    OpenRouter uses OpenAI's chat completions API shape. Tool schemas need
    to be wrapped in {"type": "function", "function": {...}}; we convert here
    so the rest of the app only has to know Anthropic's flatter format.
    """

    def __init__(self, api_key: str):
        self._client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=api_key,
        )

    @staticmethod
    def _convert_tools(anthropic_tools: list[dict]) -> list[dict]:
        return [
            {
                "type": "function",
                "function": {
                    "name": t["name"],
                    "description": t["description"],
                    "parameters": t["input_schema"],
                },
            }
            for t in anthropic_tools
        ]

    @staticmethod
    def _convert_messages(system: str, messages: list[dict]) -> list[dict]:
        """
        OpenAI messages are flat {"role", "content"}. Our agent loops write
        structured content (text + tool_use + tool_result blocks) in Anthropic
        format, so we flatten here. Tool calls/results are reshaped as needed.
        """
        converted: list[dict] = [{"role": "system", "content": system}]
        for msg in messages:
            content = msg.get("content")
            role = msg["role"]

            if isinstance(content, str):
                converted.append({"role": role, "content": content})
                continue

            # Structured blocks — split into text + tool_calls / tool results
            if role == "assistant":
                text_parts: list[str] = []
                tc_list: list[dict] = []
                for block in content:
                    if block.get("type") == "text":
                        text_parts.append(block["text"])
                    elif block.get("type") == "tool_use":
                        import json
                        tc_list.append({
                            "id": block["id"],
                            "type": "function",
                            "function": {
                                "name": block["name"],
                                "arguments": json.dumps(block.get("input", {})),
                            },
                        })
                msg_out: dict[str, Any] = {"role": "assistant"}
                msg_out["content"] = "\n".join(text_parts) if text_parts else None
                if tc_list:
                    msg_out["tool_calls"] = tc_list
                converted.append(msg_out)
            else:
                # User turn with tool_result blocks -> OpenAI "tool" role messages
                for block in content:
                    if block.get("type") == "tool_result":
                        converted.append({
                            "role": "tool",
                            "tool_call_id": block["tool_use_id"],
                            "content": block["content"],
                        })
                    elif block.get("type") == "text":
                        converted.append({"role": "user", "content": block["text"]})
        return converted

    def complete(
        self,
        model: str,
        system: str,
        messages: list[dict],
        tools: list[dict] | None = None,
        max_tokens: int = 4096,
        temperature: float = 1.0,
    ) -> AIResponse:
        kwargs: dict[str, Any] = {
            "model": model,
            "messages": self._convert_messages(system, messages),
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        if tools:
            kwargs["tools"] = self._convert_tools(tools)

        resp = self._client.chat.completions.create(**kwargs)
        choice = resp.choices[0]
        msg = choice.message

        text_blocks: list[str] = [msg.content] if msg.content else []
        tool_calls: list[dict[str, Any]] = []
        if msg.tool_calls:
            import json
            for tc in msg.tool_calls:
                tool_calls.append({
                    "id": tc.id,
                    "name": tc.function.name,
                    "input": json.loads(tc.function.arguments),
                })

        # Normalize finish reason to Anthropic's naming
        finish_map = {
            "stop": "end_turn",
            "length": "max_tokens",
            "tool_calls": "tool_use",
            "function_call": "tool_use",
        }
        stop_reason = finish_map.get(choice.finish_reason or "", choice.finish_reason or "")

        return AIResponse(
            text_blocks=text_blocks,
            tool_calls=tool_calls,
            stop_reason=stop_reason,
            raw=resp,
        )


# ---------------------------------------------------------------------------
# Resolution & factory
# ---------------------------------------------------------------------------

def _resolve_provider(db: Session | None, user_id: int | None) -> Provider:
    """Walk the DB → env cascade to pick the active provider."""
    if db is not None and user_id is not None:
        from app.services.ai_settings import resolve
        return resolve(db, user_id=user_id).provider
    return settings.ai_provider


def get_client(
    *,
    db: Session | None = None,
    user_id: int | None = None,
) -> AIClient:
    """Build the AI client for the effective provider."""
    provider = _resolve_provider(db, user_id)
    if provider == "anthropic":
        if not settings.anthropic_api_key:
            raise RuntimeError("ANTHROPIC_API_KEY not set")
        return AnthropicClient(settings.anthropic_api_key)
    if not settings.openrouter_api_key:
        raise RuntimeError("OPENROUTER_API_KEY not set")
    return OpenRouterClient(settings.openrouter_api_key)


def default_model(
    kind: str,
    *,
    db: Session | None = None,
    user_id: int | None = None,
) -> str:
    """Resolve the model ID for a given slot ('briefing' or 'classifier')."""
    if db is not None and user_id is not None:
        from app.services.ai_settings import resolve
        cfg = resolve(db, user_id=user_id)
        return cfg.model_briefing if kind == "briefing" else cfg.model_classifier

    env_override = {
        "briefing": settings.model_briefing,
        "classifier": settings.model_classifier,
    }.get(kind)
    if env_override:
        return env_override
    return DEFAULT_MODELS[settings.ai_provider][kind]
