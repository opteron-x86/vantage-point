"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";

import { authApi } from "@/lib/api/auth";
import { useAuthStore } from "@/lib/stores/authStore";

export function useAuth() {
  const router = useRouter();
  const { token, user, hasHydrated, setAuth, clear } = useAuthStore();

  const login = useCallback(
    async (username: string, password: string) => {
      const tokenResp = await authApi.login(username, password);
      // Temporarily put the token into the store so `authApi.me()` can auth
      useAuthStore.setState({ token: tokenResp.access_token });
      const me = await authApi.me();
      setAuth(tokenResp.access_token, me);
      return me;
    },
    [setAuth],
  );

  const logout = useCallback(() => {
    clear();
    router.push("/login");
  }, [clear, router]);

  return {
    token,
    user,
    hasHydrated,
    isAuthenticated: Boolean(token),
    login,
    logout,
  };
}

/**
 * Guard hook: redirect to /login if not authenticated.
 * Only runs after hydration to avoid flashing the login page for
 * already-authenticated users.
 */
export function useRequireAuth() {
  const router = useRouter();
  const { token, hasHydrated } = useAuthStore();

  useEffect(() => {
    if (hasHydrated && !token) {
      router.replace("/login");
    }
  }, [hasHydrated, token, router]);

  return { isReady: hasHydrated, isAuthenticated: Boolean(token) };
}
