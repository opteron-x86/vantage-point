"""
Technical indicators computed from stored bars.

Kept deliberately minimal — enough to feed the AI and the frontend
without pulling in a heavyweight TA library. If we add more indicators
later, consider swapping in `pandas-ta`.
"""

from typing import Any

from sqlalchemy.orm import Session

from app.services.market_data import get_bars


def _sma(values: list[float], window: int) -> float | None:
    if len(values) < window:
        return None
    return round(sum(values[-window:]) / window, 2)


def _rsi(values: list[float], period: int = 14) -> float | None:
    if len(values) < period + 1:
        return None
    gains: list[float] = []
    losses: list[float] = []
    for i in range(1, len(values)):
        diff = values[i] - values[i - 1]
        gains.append(max(diff, 0.0))
        losses.append(max(-diff, 0.0))
    avg_gain = sum(gains[-period:]) / period
    avg_loss = sum(losses[-period:]) / period
    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return round(100 - (100 / (1 + rs)), 2)


def calculate(db: Session, *, ticker: str, lookback_days: int = 90) -> dict[str, Any]:
    """
    Compute indicators using up to `lookback_days` of stored data.
    Returns dict suitable for AI-tool and API consumption.
    """
    # Pull plenty of history so SMA/RSI windows work even near start
    bars = get_bars(db, ticker=ticker, days=lookback_days)
    if len(bars) < 5:
        return {"ticker": ticker.upper(), "error": "Not enough data for technicals"}

    closes = [b.close for b in bars]
    volumes = [b.volume for b in bars]

    latest_close = closes[-1]
    latest_volume = volumes[-1]
    avg_vol_20 = _sma([float(v) for v in volumes], 20)

    return {
        "ticker": ticker.upper(),
        "latest_close": round(latest_close, 2),
        "sma_5":  _sma(closes, 5),
        "sma_10": _sma(closes, 10),
        "sma_20": _sma(closes, 20),
        "rsi_14": _rsi(closes, 14),
        "latest_volume": latest_volume,
        "avg_volume_20": int(avg_vol_20) if avg_vol_20 else None,
        "volume_vs_avg_pct": (
            round((latest_volume / avg_vol_20 - 1) * 100, 1) if avg_vol_20 else None
        ),
        "period_high": round(max(closes), 2),
        "period_low":  round(min(closes), 2),
        "bars_analyzed": len(closes),
    }
