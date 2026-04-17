"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { aiSettingsApi } from "@/lib/api/ai-settings";
import type { UpdateAISettingsBody } from "@/lib/types/ai-settings";

const KEY = ["ai-settings"] as const;

export function useAISettings() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => aiSettingsApi.get(),
  });
}

export function useUpdateAISettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateAISettingsBody) => aiSettingsApi.update(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
