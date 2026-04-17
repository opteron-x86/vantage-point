"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { Logo } from "@/components/layout/Logo";
import { Button, Input, Label } from "@/components/ui";
import { authApi } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/useAuth";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, hasHydrated } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupAvailable, setSetupAvailable] = useState(false);

  useEffect(() => {
    if (hasHydrated && isAuthenticated) {
      router.replace("/");
    }
  }, [hasHydrated, isAuthenticated, router]);

  useEffect(() => {
    authApi
      .bootstrapStatus()
      .then((s) => setSetupAvailable(s.available))
      .catch(() => setSetupAvailable(false));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(username, password);
      router.replace("/");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-[0.35]" aria-hidden />
      <div
        className="absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 50% 40% at 50% 30%, rgba(136,192,208,0.08), transparent 70%)",
        }}
      />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <Logo size={40} />
          </div>
          <div className="mb-3 text-[10px] font-medium uppercase tracking-[0.3em] text-fg-muted">
            Vantage Point
          </div>
          <h1 className="font-mono text-2xl font-normal text-fg">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-fg-subtle">
            Sign in to your research console.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-md border border-border-subtle bg-bg-raised p-6 shadow-overlay"
        >
          <div className="space-y-1.5">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              name="username"
              autoComplete="username"
              autoFocus
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              invalid={Boolean(error)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              invalid={Boolean(error)}
            />
          </div>

          {error ? (
            <p
              className="text-xs text-signal-down"
              role="alert"
              aria-live="polite"
            >
              {error}
            </p>
          ) : null}

          <Button type="submit" loading={loading} className="w-full" size="lg">
            Sign in
          </Button>
        </form>

        {setupAvailable ? (
          <p className="mt-6 text-center text-[11px] text-fg-subtle">
            First time here?{" "}
            <Link href="/setup" className="text-accent hover:underline">
              Create your account
            </Link>
          </p>
        ) : null}
      </div>
    </main>
  );
}
