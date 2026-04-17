import { apiFetch } from "@/lib/api/client";
import type {
  BootstrapBody,
  BootstrapStatus,
  TokenResponse,
  UserInfo,
} from "@/lib/types/auth";

export const authApi = {
  login(username: string, password: string): Promise<TokenResponse> {
    return apiFetch<TokenResponse>("/api/auth/login", {
      method: "POST",
      body: { username, password },
      auth: false,
    });
  },

  me(): Promise<UserInfo> {
    return apiFetch<UserInfo>("/api/auth/me");
  },

  bootstrapStatus(): Promise<BootstrapStatus> {
    return apiFetch<BootstrapStatus>("/api/auth/bootstrap/status", {
      auth: false,
    });
  },

  bootstrap(body: BootstrapBody): Promise<TokenResponse> {
    return apiFetch<TokenResponse>("/api/auth/bootstrap", {
      method: "POST",
      body,
      auth: false,
    });
  },
};
