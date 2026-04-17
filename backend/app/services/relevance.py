"""
Relevance scoring service.

Batch-classifies articles 1-3 using the cheap classifier model (Haiku).
Called manually via `scripts/score_news.py` or scheduled via `scheduler/jobs.py`.
"""

import json

from sqlalchemy.orm import Session

from app.ai.client import default_model
from app.ai.logged_client import LoggedAIClient, new_session_id
from app.services import news


BATCH_SIZE = 20

SYSTEM_PROMPT = """You are a relevance classifier for financial news articles.

For each article, you'll be given a ticker symbol and a headline (with optional summary).
Score how relevant the article is to someone actively trading or researching THAT SPECIFIC STOCK.

Scoring scale:
  3 = HIGH:   Primarily about this company. Earnings, products, management changes, \
deals, lawsuits, analyst actions specific to this company, guidance.
  2 = MEDIUM: Company is a significant secondary subject, or sector/peer analysis where \
this company is materially discussed.
  1 = LOW:    Ticker mentioned in passing, generic market recap, article is really about \
something else (another company, macro event, etc.) that happens to reference this one.

Return ONLY a JSON array of integers, one per article, in the same order you received them.
No prose, no markdown, no code fences. Example: [3, 1, 2, 3, 1]"""


def _format_batch(batch: list) -> str:
    lines = []
    for i, art in enumerate(batch, 1):
        summary = (art.summary or "").strip()
        if len(summary) > 200:
            summary = summary[:200] + "..."
        entry = f"{i}. [{art.ticker}] {art.headline}"
        if summary:
            entry += f"\n   Summary: {summary}"
        lines.append(entry)
    return "\n\n".join(lines)


def _parse_scores(text: str, expected: int) -> list[int] | None:
    text = text.strip()
    if text.startswith("```"):
        text = text.split("```", 2)[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()
    try:
        scores = json.loads(text)
    except json.JSONDecodeError:
        return None
    if not isinstance(scores, list) or len(scores) != expected:
        return None
    if not all(isinstance(s, int) and 1 <= s <= 3 for s in scores):
        return None
    return scores


def score_unscored(
    db: Session,
    client: LoggedAIClient,
    *,
    limit: int | None = None,
    user_id: int | None = None,
) -> dict:
    """Score all unscored articles. Returns summary stats."""
    articles = news.list_unscored(db, limit=limit)
    if not articles:
        return {"total": 0, "scored": 0, "failed": 0}

    session_id = new_session_id(prefix="relevance")
    model = default_model("classifier", db=db, user_id=user_id)
    scored = 0
    failed = 0

    for start in range(0, len(articles), BATCH_SIZE):
        batch = articles[start : start + BATCH_SIZE]
        response = client.complete(
            model=model,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": _format_batch(batch)}],
            max_tokens=200,
            temperature=0.0,
            purpose="relevance_scoring",
            session_id=session_id,
            user_id=user_id,
        )

        text = "".join(response.text_blocks)
        scores = _parse_scores(text, expected=len(batch))
        if scores is None:
            failed += len(batch)
            continue

        news.apply_relevance_scores(
            db, [(art.id, score) for art, score in zip(batch, scores, strict=True)]
        )
        scored += len(batch)

    return {"total": len(articles), "scored": scored, "failed": failed, "session_id": session_id}
