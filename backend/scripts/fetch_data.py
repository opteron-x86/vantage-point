"""
Manually refresh market data and/or news for all users' watchlists.

Usage:
    python -m scripts.fetch_data               # both bars and news
    python -m scripts.fetch_data --bars        # bars only
    python -m scripts.fetch_data --news        # news only
    python -m scripts.fetch_data --days 14     # custom lookback
"""

import argparse
import sys

from app.db.session import SessionLocal
from app.scheduler.jobs import _all_user_tickers, _union_tickers
from app.services import market_data, news


def main() -> int:
    parser = argparse.ArgumentParser(description="Refresh market data and/or news")
    parser.add_argument("--bars", action="store_true", help="Fetch bars only")
    parser.add_argument("--news", action="store_true", help="Fetch news only")
    parser.add_argument("--days", type=int, default=None, help="Lookback window override")
    args = parser.parse_args()

    do_bars = args.bars or not (args.bars or args.news)
    do_news = args.news or not (args.bars or args.news)

    with SessionLocal() as db:
        tickers = _union_tickers(_all_user_tickers(db))
        if not tickers:
            print("No tickers in any watchlist. Add some via the API or a user session.")
            return 0
        print(f"Tickers: {', '.join(tickers)}")

        if do_bars:
            days = args.days if args.days is not None else 30
            print(f"\nFetching {days} days of bars...")
            counts = market_data.fetch_and_store(db, tickers=tickers, days=days)
            for ticker, count in counts.items():
                print(f"  {ticker}: {count} bars")

        if do_news:
            days = args.days if args.days is not None else 7
            print(f"\nFetching {days} days of news...")
            counts = news.fetch_and_store(db, tickers=tickers, days=days)
            for ticker, count in counts.items():
                print(f"  {ticker}: {count} articles")

    print("\nDone.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
