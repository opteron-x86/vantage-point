"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { journalApi } from "@/lib/api/journal";
import type {
  CloseEntryBody,
  CreateEntryBody,
  UpdateEntryBody,
} from "@/lib/types/journal";

const KEY = {
  all: ["journal"] as const,
  list: (status?: "open" | "closed") =>
    ["journal", "list", status ?? "all"] as const,
  open: ["journal", "open-positions"] as const,
  one: (id: number) => ["journal", id] as const,
};

export function useJournalEntries(status?: "open" | "closed") {
  return useQuery({
    queryKey: KEY.list(status),
    queryFn: () => journalApi.list(status),
  });
}

export function useOpenPositions() {
  return useQuery({
    queryKey: KEY.open,
    queryFn: () => journalApi.openPositions(),
  });
}

export function useJournalMutations() {
  const qc = useQueryClient();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: KEY.all });
  };

  const create = useMutation({
    mutationFn: (body: CreateEntryBody) => journalApi.create(body),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdateEntryBody }) =>
      journalApi.update(id, body),
    onSuccess: invalidate,
  });

  const close = useMutation({
    mutationFn: ({ id, body }: { id: number; body: CloseEntryBody }) =>
      journalApi.close(id, body),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: number) => journalApi.delete(id),
    onSuccess: invalidate,
  });

  return { create, update, close, remove };
}
