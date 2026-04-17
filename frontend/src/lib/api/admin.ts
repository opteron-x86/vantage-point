import { apiFetch } from "@/lib/api/client";

export type RefreshResult = {
  bars_fetched?: Record<string, number> | null;
  news_fetched?: Record<string, number> | null;
};

export type ScoreResult = {
  total: number;
  scored: number;
  failed: number;
  session_id?: string | null;
};

export const adminApi = {
  refresh(): Promise<RefreshResult> {
    return apiFetch<RefreshResult>("/api/admin/refresh", { method: "POST" });
  },

  refreshTicker(
    ticker: string,
    opts: { daysBars?: number; daysNews?: number } = {},
  ): Promise<RefreshResult> {
    const params = new URLSearchParams();
    if (opts.daysBars) params.set("days_bars", String(opts.daysBars));
    if (opts.daysNews) params.set("days_news", String(opts.daysNews));
    const qs = params.toString();
    return apiFetch<RefreshResult>(
      `/api/admin/refresh/${ticker}${qs ? `?${qs}` : ""}`,
      { method: "POST" },
    );
  },

  scoreNews(): Promise<ScoreResult> {
    return apiFetch<ScoreResult>("/api/admin/score-news", { method: "POST" });
  },
};
