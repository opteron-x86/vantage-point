"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { adminApi } from "@/lib/api/admin";

/**
 * Hook for data management actions exposed in the UI:
 * - refreshAll(): pulls bars + news for every ticker on the watchlist
 * - refreshTicker(t): pulls bars + news for one ticker
 * - scoreNews(): batch-scores unscored articles via the classifier model
 *
 * All mutations invalidate the related query caches so the UI updates
 * without manual refetching.
 */
export function useDataAdmin() {
  const qc = useQueryClient();

  const refreshAll = useMutation({
    mutationFn: () => adminApi.refresh(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bars"] });
      qc.invalidateQueries({ queryKey: ["news"] });
      qc.invalidateQueries({ queryKey: ["technicals"] });
    },
  });

  const refreshTicker = useMutation({
    mutationFn: (
      args: string | { ticker: string; daysBars?: number; daysNews?: number },
    ) => {
      const params = typeof args === "string" ? { ticker: args } : args;
      return adminApi.refreshTicker(params.ticker, {
        daysBars: params.daysBars,
        daysNews: params.daysNews,
      });
    },
    onSuccess: (_data, args) => {
      const ticker = typeof args === "string" ? args : args.ticker;
      qc.invalidateQueries({ queryKey: ["bars", ticker] });
      qc.invalidateQueries({ queryKey: ["news", ticker] });
      qc.invalidateQueries({ queryKey: ["technicals", ticker] });
    },
  });

  const scoreNews = useMutation({
    mutationFn: () => adminApi.scoreNews(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["news"] });
    },
  });

  return { refreshAll, refreshTicker, scoreNews };
}
