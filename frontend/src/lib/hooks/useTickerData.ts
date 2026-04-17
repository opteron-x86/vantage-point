"use client";

import { useQuery } from "@tanstack/react-query";

import { marketApi } from "@/lib/api/market";

export function useTickerBars(ticker: string, days = 30) {
  return useQuery({
    queryKey: ["bars", ticker, days],
    queryFn: () => marketApi.bars(ticker, days),
    enabled: Boolean(ticker),
  });
}

export function useTickerNews(
  ticker: string,
  opts: { limit?: number; minRelevance?: number } = {},
) {
  return useQuery({
    queryKey: ["news", ticker, opts],
    queryFn: () => marketApi.news(ticker, opts),
    enabled: Boolean(ticker),
  });
}

export function useTickerTechnicals(ticker: string) {
  return useQuery({
    queryKey: ["technicals", ticker],
    queryFn: () => marketApi.technicals(ticker),
    enabled: Boolean(ticker),
  });
}
