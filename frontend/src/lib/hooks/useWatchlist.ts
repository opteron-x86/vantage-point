"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { watchlistApi } from "@/lib/api/watchlist";

const WATCHLIST_KEY = ["watchlist"] as const;

export function useWatchlist() {
  const query = useQuery({
    queryKey: WATCHLIST_KEY,
    queryFn: () => watchlistApi.list(),
  });

  const qc = useQueryClient();

  const add = useMutation({
    mutationFn: (ticker: string) => watchlistApi.add(ticker),
    onSuccess: () => qc.invalidateQueries({ queryKey: WATCHLIST_KEY }),
  });

  const remove = useMutation({
    mutationFn: (ticker: string) => watchlistApi.remove(ticker),
    onSuccess: () => qc.invalidateQueries({ queryKey: WATCHLIST_KEY }),
  });

  return {
    ...query,
    tickers: (query.data ?? []).map((i) => i.ticker),
    add,
    remove,
  };
}
