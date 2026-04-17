import { apiFetch } from "@/lib/api/client";
import type {
  Briefing,
  BriefingSummary,
  GenerateBriefingResult,
} from "@/lib/types/briefing";

export const briefingApi = {
  list(limit = 30): Promise<BriefingSummary[]> {
    return apiFetch<BriefingSummary[]>(`/api/briefings?limit=${limit}`);
  },

  get(id: number): Promise<Briefing> {
    return apiFetch<Briefing>(`/api/briefings/${id}`);
  },

  generate(): Promise<GenerateBriefingResult> {
    return apiFetch<GenerateBriefingResult>("/api/briefings/generate", {
      method: "POST",
    });
  },
};
