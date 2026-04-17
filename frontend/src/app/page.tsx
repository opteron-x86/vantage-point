"use client";

import { useState } from "react";

import { BriefingPanel } from "@/components/briefing/BriefingPanel";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { DashboardGrid } from "@/components/layout/DashboardGrid";
import { TopBar } from "@/components/layout/TopBar";
import { TickerDetailDrawer } from "@/components/ticker/TickerDetailDrawer";
import { WatchlistPanel } from "@/components/watchlist/WatchlistPanel";
import { useRequireAuth } from "@/lib/hooks/useAuth";

export default function DashboardPage() {
  const { isReady, isAuthenticated } = useRequireAuth();
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);

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
      <DashboardGrid
        left={
          <WatchlistPanel
            selectedTicker={selectedTicker}
            onSelect={(t) => setSelectedTicker(t)}
          />
        }
        center={
          selectedTicker ? (
            <TickerDetailDrawer
              ticker={selectedTicker}
              onClose={() => setSelectedTicker(null)}
            />
          ) : (
            <BriefingPanel />
          )
        }
        right={<ChatPanel />}
      />
    </div>
  );
}
