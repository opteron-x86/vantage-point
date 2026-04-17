"use client";

import { MessageSquare, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ChatInput } from "@/components/chat/ChatInput";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { SessionSidebar } from "@/components/chat/SessionSidebar";
import { Button } from "@/components/ui";
import { useChatSession } from "@/lib/hooks/useChatSession";
import { useInvalidateChatSessions } from "@/lib/hooks/useChatSessions";
import { cn } from "@/lib/utils/cn";

export function ChatPanel() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const invalidateSessions = useInvalidateChatSessions();

  const {
    turns,
    sessionId,
    currentTitle,
    send,
    newChat,
    resume,
    connected,
    loadingHistory,
  } = useChatSession(invalidateSessions);

  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns]);

  const lastTurn = turns[turns.length - 1];
  const isStreaming = lastTurn?.role === "assistant" && lastTurn.streaming;

  return (
    <div className="flex h-full overflow-hidden">
      <div
        className={cn(
          "flex-shrink-0 overflow-hidden border-r border-border-subtle bg-bg-raised transition-[width]",
          sidebarOpen ? "w-[220px]" : "w-0",
        )}
      >
        <div className="h-full w-[220px]">
          <SessionSidebar
            activeSessionId={sessionId}
            onSelect={(id) => resume(id)}
            onNew={() => newChat()}
          />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setSidebarOpen((o) => !o)}
              className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-fg-subtle hover:bg-surface-muted hover:text-fg-muted"
              aria-label={sidebarOpen ? "Hide session list" : "Show session list"}
              title={sidebarOpen ? "Hide chats" : "Show chats"}
            >
              {sidebarOpen ? (
                <PanelLeftClose className="h-3.5 w-3.5" />
              ) : (
                <PanelLeftOpen className="h-3.5 w-3.5" />
              )}
            </button>
            <h2 className="truncate text-[11px] font-medium uppercase tracking-[0.2em] text-fg-muted">
              {currentTitle || "Assistant"}
            </h2>
            <span
              className={cn(
                "h-1.5 w-1.5 flex-shrink-0 rounded-full",
                connected ? "bg-signal-up" : "bg-fg-subtle",
              )}
              aria-label={connected ? "Connected" : "Disconnected"}
            />
          </div>
        </div>

        <div
          ref={scrollerRef}
          className="flex-1 space-y-3 overflow-y-auto p-4"
        >
          {loadingHistory ? (
            <div className="py-12 text-center text-xs text-fg-subtle">
              Loading conversation…
            </div>
          ) : turns.length === 0 ? (
            <EmptyState />
          ) : (
            turns.map((turn) => <MessageBubble key={turn.id} turn={turn} />)
          )}
        </div>

        <ChatInput
          onSend={send}
          disabled={!connected || isStreaming || loadingHistory}
        />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mx-auto max-w-[260px] py-8 text-center">
      <div className="mb-3 inline-flex rounded-full border border-border-subtle bg-bg-raised p-2.5">
        <MessageSquare className="h-4 w-4 text-fg-subtle" />
      </div>
      <p className="text-sm text-fg-muted">
        Ask about a ticker, setup, or concept.
      </p>
      <p className="mt-2 text-xs text-fg-subtle">
        The assistant can pull live data from your watchlist.
      </p>
      <ul className="mt-4 space-y-1 text-left text-[11px] text-fg-subtle">
        <li>&ldquo;What&rsquo;s interesting on my watchlist today?&rdquo;</li>
        <li>&ldquo;Walk me through NVDA&rsquo;s setup&rdquo;</li>
        <li>&ldquo;Explain RSI in the context of AAPL&rdquo;</li>
      </ul>
      <p className="mt-6 text-[11px] text-fg-subtle">
        New to the terminology?{" "}
        <a href="/learn" className="text-accent hover:underline">
          Start with the glossary
        </a>
        .
      </p>
    </div>
  );
}
