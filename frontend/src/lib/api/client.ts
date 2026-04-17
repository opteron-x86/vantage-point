/**
 * Low-level fetch wrapper.
 *
 * Every API module imports `apiFetch` rather than calling fetch() directly.
 * This is the one place we:
 *   - prepend the API base URL
 *   - attach the bearer token
 *   - parse JSON and normalize errors
 *
 * Keeping a single choke point makes it easy to add cross-cutting concerns
 * later (request IDs, retries, telemetry) without touching callers.
 */

import { useAuthStore } from "@/lib/stores/authStore";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public detail?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type FetchOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  auth?: boolean; // default true
};

export async function apiFetch<T = unknown>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const { body, auth = true, headers: providedHeaders, ...rest } = options;

  const headers = new Headers(providedHeaders);
  if (body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (auth) {
    const token = useAuthStore.getState().token;
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && auth) {
    // Token is bad — clear it so the app redirects to login
    useAuthStore.getState().clear();
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const contentType = res.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await res.json().catch(() => null) : await res.text();

  if (!res.ok) {
    const detail =
      (isJson && payload && typeof payload === "object" && "detail" in payload
        ? (payload as { detail: unknown }).detail
        : payload) ?? res.statusText;
    const message =
      typeof detail === "string" ? detail : `Request failed (${res.status})`;
    throw new ApiError(message, res.status, detail);
  }

  return payload as T;
}

export function apiUrl(path: string): string {
  return `${API_URL}${path}`;
}

export function wsUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_WS_URL ?? API_URL.replace(/^http/, "ws");
  return `${base}${path}`;
}
