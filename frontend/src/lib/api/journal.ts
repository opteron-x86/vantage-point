import { apiFetch } from "@/lib/api/client";
import type {
  CloseEntryBody,
  CreateEntryBody,
  JournalEntry,
  OpenPositions,
  UpdateEntryBody,
} from "@/lib/types/journal";

export const journalApi = {
  list(status?: "open" | "closed"): Promise<JournalEntry[]> {
    const qs = status ? `?status=${status}` : "";
    return apiFetch<JournalEntry[]>(`/api/journal${qs}`);
  },

  openPositions(): Promise<OpenPositions> {
    return apiFetch<OpenPositions>("/api/journal/open-positions");
  },

  get(id: number): Promise<JournalEntry> {
    return apiFetch<JournalEntry>(`/api/journal/${id}`);
  },

  create(body: CreateEntryBody): Promise<JournalEntry> {
    return apiFetch<JournalEntry>("/api/journal", { method: "POST", body });
  },

  update(id: number, body: UpdateEntryBody): Promise<JournalEntry> {
    return apiFetch<JournalEntry>(`/api/journal/${id}`, {
      method: "PATCH",
      body,
    });
  },

  close(id: number, body: CloseEntryBody): Promise<JournalEntry> {
    return apiFetch<JournalEntry>(`/api/journal/${id}/close`, {
      method: "POST",
      body,
    });
  },

  delete(id: number): Promise<void> {
    return apiFetch<void>(`/api/journal/${id}`, { method: "DELETE" });
  },
};
