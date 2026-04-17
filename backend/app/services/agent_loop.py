"""
Shared agent-loop logic.

Both briefings and chat use the same pattern: send messages to the model,
if it requests tools, execute them and send results back, repeat until
the model produces a final text response.

Keeping this one implementation means bug fixes and improvements flow to
both callers.
"""

import json
from collections.abc import Callable, Iterator
from dataclasses import dataclass
from typing import Any

from app.ai.client import AIResponse
from app.ai.logged_client import LoggedAIClient
from app.ai.tools import TOOL_SCHEMAS, dispatch_tool


@dataclass
class AgentEvent:
    """A single event emitted by the agent loop — useful for streaming."""
    kind: str  # "text" | "tool_call" | "tool_result" | "done" | "error"
    data: dict[str, Any]


def run_agent_loop(
    client: LoggedAIClient,
    *,
    model: str,
    system: str,
    messages: list[dict],
    user_id: int,
    session_id: str,
    purpose: str,
    max_turns: int = 15,
    max_tokens: int = 4096,
    tool_dispatcher: Callable[[str, dict, int], dict] | None = None,
) -> Iterator[AgentEvent]:
    """
    Run the tool-use loop. Mutates `messages` in place so callers can
    inspect the final conversation. Yields events as they happen so callers
    can stream them to the frontend or terminal.
    """
    dispatch = tool_dispatcher or (lambda name, inp, uid: dispatch_tool(name, inp, user_id=uid))

    for _ in range(max_turns):
        try:
            response: AIResponse = client.complete(
                model=model,
                system=system,
                messages=messages,
                tools=TOOL_SCHEMAS,
                max_tokens=max_tokens,
                purpose=purpose,
                session_id=session_id,
                user_id=user_id,
            )
        except Exception as e:
            yield AgentEvent("error", {"message": f"{e.__class__.__name__}: {e}"})
            return

        for block in response.text_blocks:
            if block.strip():
                yield AgentEvent("text", {"text": block})

        if not response.tool_calls:
            # Final turn — record the assistant text and signal done
            final_text = "\n".join(response.text_blocks).strip()
            messages.append({"role": "assistant", "content": final_text})
            yield AgentEvent("done", {"final_text": final_text})
            return

        # Record assistant turn with text + tool_use blocks
        assistant_content: list[dict] = []
        for text in response.text_blocks:
            if text:
                assistant_content.append({"type": "text", "text": text})
        for call in response.tool_calls:
            assistant_content.append({
                "type": "tool_use",
                "id": call["id"],
                "name": call["name"],
                "input": call["input"],
            })
        messages.append({"role": "assistant", "content": assistant_content})

        # Execute each tool call and append results
        tool_results: list[dict] = []
        for call in response.tool_calls:
            yield AgentEvent("tool_call", {
                "id": call["id"], "name": call["name"], "input": call["input"],
            })
            result = dispatch(call["name"], call["input"], user_id)
            yield AgentEvent("tool_result", {
                "id": call["id"], "name": call["name"], "result": result,
            })
            tool_results.append({
                "type": "tool_result",
                "tool_use_id": call["id"],
                "content": json.dumps(result, default=str),
            })
        messages.append({"role": "user", "content": tool_results})

    yield AgentEvent("error", {"message": f"Hit max turns ({max_turns}) without final output"})
