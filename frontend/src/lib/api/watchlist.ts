import { apiFetch } from "@/lib/api/client";
import type { WatchlistItem } from "@/lib/types/market";

export const watchlistApi = {
  list(): Promise<WatchlistItem[]> {
    return apiFetch<WatchlistItem[]>("/api/watchlist");
  },

  add(ticker: string): Promise<WatchlistItem> {
    return apiFetch<WatchlistItem>("/api/watchlist", {
      method: "POST",
      body: { ticker },
    });
  },

  remove(ticker: string): Promise<void> {
    return apiFetch<void>(`/api/watchlist/${ticker}`, { method: "DELETE" });
  },

  reorder(tickers: string[]): Promise<void> {
    return apiFetch<void>("/api/watchlist/reorder", {
      method: "POST",
      body: { tickers },
    });
  },
};
