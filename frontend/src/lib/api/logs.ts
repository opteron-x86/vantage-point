import { apiFetch } from "@/lib/api/client";

export type InteractionSummary = {
  id: string;
  timestamp: string;
  session_id: string | null;
  purpose: string;
  provider: string;
  model: string;
  input_tokens: number | null;
  output_tokens: number | null;
  cost_usd: number | null;
  duration_ms: number | null;
  stop_reason: string | null;
  error: string | null;
};

export type SessionSummary = {
  session_id: string;
  started: string;
  ended: string;
  turns: number;
  total_cost: number | null;
  purposes: string[];
};

export type CostRow = {
  day: string;
  purpose: string;
  model: string;
  calls: number;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
};

export const logsApi = {
  list(opts: { purpose?: string; limit?: number } = {}): Promise<InteractionSummary[]> {
    const params = new URLSearchParams();
    if (opts.purpose) params.set("purpose", opts.purpose);
    if (opts.limit) params.set("limit", String(opts.limit));
    const qs = params.toString();
    return apiFetch<InteractionSummary[]>(`/api/logs${qs ? `?${qs}` : ""}`);
  },

  sessions(): Promise<SessionSummary[]> {
    return apiFetch<SessionSummary[]>("/api/logs/sessions/list");
  },

  cost(): Promise<CostRow[]> {
    return apiFetch<CostRow[]>("/api/logs/cost/summary");
  },
};
