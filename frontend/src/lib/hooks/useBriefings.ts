"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { briefingApi } from "@/lib/api/briefing";

const BRIEFINGS_KEY = ["briefings"] as const;

export function useBriefings() {
  return useQuery({
    queryKey: BRIEFINGS_KEY,
    queryFn: () => briefingApi.list(10),
  });
}

export function useBriefing(id: number | null) {
  return useQuery({
    queryKey: ["briefing", id],
    queryFn: () => briefingApi.get(id as number),
    enabled: id != null,
  });
}

export function useGenerateBriefing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => briefingApi.generate(),
    onSuccess: () => qc.invalidateQueries({ queryKey: BRIEFINGS_KEY }),
  });
}
