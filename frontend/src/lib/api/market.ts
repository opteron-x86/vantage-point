import { apiFetch } from "@/lib/api/client";
import type { NewsList, PriceHistory, Technicals } from "@/lib/types/market";

export const marketApi = {
  bars(ticker: string, days = 30): Promise<PriceHistory> {
    const params = new URLSearchParams({ days: String(days) });
    return apiFetch<PriceHistory>(`/api/market/bars/${ticker}?${params}`);
  },

  news(
    ticker: string,
    opts: { limit?: number; minRelevance?: number } = {},
  ): Promise<NewsList> {
    const params = new URLSearchParams();
    if (opts.limit) params.set("limit", String(opts.limit));
    if (opts.minRelevance != null) params.set("min_relevance", String(opts.minRelevance));
    const qs = params.toString();
    return apiFetch<NewsList>(`/api/market/news/${ticker}${qs ? `?${qs}` : ""}`);
  },

  technicals(ticker: string): Promise<Technicals> {
    return apiFetch<Technicals>(`/api/market/technicals/${ticker}`);
  },
};
