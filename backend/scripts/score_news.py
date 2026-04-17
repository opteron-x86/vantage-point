"""
Manually score unscored news articles for relevance.

Usage:
    python -m scripts.score_news              # score all unscored articles
    python -m scripts.score_news --limit 100  # cap for testing
"""

import argparse
import sys

from app.ai.logged_client import get_logged_client
from app.db.session import SessionLocal
from app.services import relevance


def main() -> int:
    parser = argparse.ArgumentParser(description="Score articles for relevance")
    parser.add_argument("--limit", type=int, default=None, help="Max articles to score")
    args = parser.parse_args()

    with SessionLocal() as db:
        client = get_logged_client()
        print("Scoring unscored articles...")
        result = relevance.score_unscored(db, client, limit=args.limit)

    print(f"\nTotal:  {result.get('total', 0)}")
    print(f"Scored: {result.get('scored', 0)}")
    print(f"Failed: {result.get('failed', 0)}")
    if result.get("session_id"):
        print(f"Session: {result['session_id']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
