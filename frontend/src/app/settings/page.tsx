"use client";

import { AISettingsForm } from "@/components/settings/AISettingsForm";
import { TopBar } from "@/components/layout/TopBar";
import { useRequireAuth } from "@/lib/hooks/useAuth";

export default function SettingsPage() {
  const { isReady, isAuthenticated } = useRequireAuth();

  if (!isReady || !isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="font-mono text-xs text-fg-subtle">Loading…</div>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar />

      <main className="mx-auto w-full max-w-2xl flex-1 p-6">
        <div className="mb-6">
          <h1 className="font-mono text-xl font-normal text-fg">Settings</h1>
          <p className="mt-1 text-sm text-fg-muted">
            AI provider and model selection. Account context for the trading
            assistant lives on the{" "}
            <a href="/journal" className="text-accent hover:underline">
              journal page
            </a>
            .
          </p>
        </div>

        <div className="rounded-md border border-border-subtle bg-bg-raised p-6">
          <AISettingsForm />
        </div>
      </main>
    </div>
  );
}
