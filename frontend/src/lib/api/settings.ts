import { apiFetch } from "@/lib/api/client";
import type { UpdateSettingsBody, UserSettings } from "@/lib/types/settings";

export const settingsApi = {
  get(): Promise<UserSettings> {
    return apiFetch<UserSettings>("/api/settings");
  },

  update(body: UpdateSettingsBody): Promise<UserSettings> {
    return apiFetch<UserSettings>("/api/settings", { method: "PATCH", body });
  },
};
