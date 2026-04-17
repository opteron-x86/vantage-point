"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { settingsApi } from "@/lib/api/settings";
import type { UpdateSettingsBody } from "@/lib/types/settings";

const KEY = ["settings"] as const;

export function useSettings() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => settingsApi.get(),
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateSettingsBody) => settingsApi.update(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
