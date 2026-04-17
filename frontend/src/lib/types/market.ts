// Types that mirror backend Pydantic schemas.
// Keep these in sync with backend/app/schemas/*.

export type WatchlistItem = {
  ticker: string;
  position: number;
  added_at: string;
};

export type Bar = {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap?: number | null;
};

export type PriceHistory = {
  ticker: string;
  bars: Bar[];
  bar_count: number;
  period_start?: string | null;
  period_end?: string | null;
  period_change_pct?: number | null;
  latest_close?: number | null;
};

export type Article = {
  id: string;
  ticker: string;
  published_at: string;
  source?: string | null;
  headline: string;
  summary?: string | null;
  url?: string | null;
  relevance_score: number;
};

export type NewsList = {
  ticker: string;
  article_count: number;
  articles: Article[];
};

export type Technicals = {
  ticker: string;
  latest_close?: number | null;
  sma_5?: number | null;
  sma_10?: number | null;
  sma_20?: number | null;
  rsi_14?: number | null;
  latest_volume?: number | null;
  avg_volume_20?: number | null;
  volume_vs_avg_pct?: number | null;
  period_high?: number | null;
  period_low?: number | null;
  bars_analyzed?: number | null;
  error?: string | null;
};
