"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { Logo } from "@/components/layout/Logo";
import { Button, Input, Label } from "@/components/ui";
import { authApi } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { useAuthStore } from "@/lib/stores/authStore";

type PageState =
  | { kind: "checking" }
  | { kind: "ready" }
  | { kind: "unavailable"; reason: string | null };

export default function SetupPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [state, setState] = useState<PageState>({ kind: "checking" });
  const [token, setToken] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    authApi
      .bootstrapStatus()
      .then((s) =>
        setState(
          s.available
            ? { kind: "ready" }
            : { kind: "unavailable", reason: s.reason },
        ),
      )
      .catch(() => setState({ kind: "unavailable", reason: "Backend unreachable" }));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.bootstrap({ token, username, password });
      const me = await (async () => {
        // Temporarily stash the token so apiFetch sends it on /me
        setAuth(res.access_token, {
          id: 0,
          username,
          is_active: true,
          created_at: new Date().toISOString(),
        });
        return authApi.me();
      })();
      setAuth(res.access_token, me);
      router.replace("/");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Setup failed. Check your token and try again.",
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
            Create your account
          </h1>
          <p className="mt-2 text-sm text-fg-subtle">
            One-time setup for this instance.
          </p>
        </div>

        {state.kind === "checking" ? (
          <div className="rounded-md border border-border-subtle bg-bg-raised p-6 text-center text-sm text-fg-subtle">
            Checking…
          </div>
        ) : state.kind === "unavailable" ? (
          <UnavailableCard reason={state.reason} />
        ) : (
          <form
            onSubmit={onSubmit}
            className="space-y-4 rounded-md border border-border-subtle bg-bg-raised p-6 shadow-overlay"
          >
            <div className="space-y-1.5">
              <Label htmlFor="token">Bootstrap token</Label>
              <Input
                id="token"
                name="token"
                type="password"
                autoComplete="off"
                autoFocus
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                invalid={Boolean(error)}
              />
              <p className="text-[10px] text-fg-subtle">
                From the <code className="font-mono">BOOTSTRAP_TOKEN</code>{" "}
                env var on the backend.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                autoComplete="username"
                required
                minLength={1}
                maxLength={64}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input
                id="confirm"
                name="confirm"
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
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
              Create account
            </Button>

            <p className="text-[10px] text-fg-subtle">
              After this, remove <code className="font-mono">BOOTSTRAP_TOKEN</code>{" "}
              from the backend environment.
            </p>
          </form>
        )}
      </div>
    </main>
  );
}

function UnavailableCard({ reason }: { reason: string | null }) {
  return (
    <div className="rounded-md border border-border-subtle bg-bg-raised p-6 text-sm">
      <p className="text-fg-muted">Setup is not available on this instance.</p>
      {reason ? (
        <p className="mt-2 font-mono text-[11px] text-fg-subtle">{reason}</p>
      ) : null}
      <p className="mt-4 text-xs text-fg-subtle">
        If you need to create an account, set{" "}
        <code className="font-mono">BOOTSTRAP_TOKEN</code> in the backend
        environment and reload this page.
      </p>
    </div>
  );
}
