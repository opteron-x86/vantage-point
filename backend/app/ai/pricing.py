"""
Model pricing (USD per million tokens).

Kept separate from the logged client so it's trivial to update when
providers change prices. If a model isn't listed, cost is reported as None.
"""

MODEL_PRICING: dict[str, dict[str, float]] = {
    # Anthropic direct
    "claude-sonnet-4-5":            {"input": 3.00,  "output": 15.00},
    "claude-haiku-4-5-20251001":    {"input": 1.00,  "output": 5.00},
    "claude-opus-4-7":              {"input": 15.00, "output": 75.00},

    # OpenRouter (same underlying models, namespaced IDs)
    "anthropic/claude-sonnet-4.5":  {"input": 3.00,  "output": 15.00},
    "anthropic/claude-haiku-4.5":   {"input": 1.00,  "output": 5.00},
    "anthropic/claude-opus-4.7":    {"input": 15.00, "output": 75.00},
}


def estimate_cost(model: str, input_tokens: int, output_tokens: int) -> float | None:
    pricing = MODEL_PRICING.get(model)
    if not pricing:
        return None
    return (input_tokens * pricing["input"] + output_tokens * pricing["output"]) / 1_000_000


# Default model identifiers by provider. The briefing model is the main "smart"
# model; the classifier is a cheap/fast model for high-volume tasks like relevance.
DEFAULT_MODELS = {
    "anthropic": {
        "briefing":   "claude-sonnet-4-5",
        "classifier": "claude-haiku-4-5-20251001",
    },
    "openrouter": {
        "briefing":   "anthropic/claude-sonnet-4.5",
        "classifier": "anthropic/claude-haiku-4.5",
    },
}
