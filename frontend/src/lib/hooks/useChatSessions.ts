"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { chatSessionsApi } from "@/lib/api/chat-sessions";
import type { UpdateSessionBody } from "@/lib/types/chat";

const KEY = {
  all: ["chat-sessions"] as const,
  list: ["chat-sessions", "list"] as const,
};

export function useChatSessions() {
  return useQuery({
    queryKey: KEY.list,
    queryFn: () => chatSessionsApi.list(),
    // Sessions update frequently (each turn bumps updated_at), refetch on focus
    refetchOnWindowFocus: true,
  });
}

export function useChatSessionMutations() {
  const qc = useQueryClient();

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateSessionBody }) =>
      chatSessionsApi.update(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY.list }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => chatSessionsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY.list }),
  });

  return { update, remove };
}

/**
 * Invalidate the session list — useful when the chat hook knows something
 * changed (title generated, new session created) before the next refetch
 * would naturally pick it up.
 */
export function useInvalidateChatSessions() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: KEY.list });
}
