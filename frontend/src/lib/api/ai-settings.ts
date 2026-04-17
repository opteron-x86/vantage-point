import { apiFetch } from "@/lib/api/client";
import type {
  AISettings,
  UpdateAISettingsBody,
} from "@/lib/types/ai-settings";

export const aiSettingsApi = {
  get(): Promise<AISettings> {
    return apiFetch<AISettings>("/api/ai-settings");
  },

  update(body: UpdateAISettingsBody): Promise<AISettings> {
    return apiFetch<AISettings>("/api/ai-settings", { method: "PATCH", body });
  },
};
