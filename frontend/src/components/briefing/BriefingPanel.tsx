"use client";

import { FileText, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

import { Markdown } from "@/components/common/Markdown";
import { Button } from "@/components/ui";
import {
  useBriefing,
  useBriefings,
  useGenerateBriefing,
} from "@/lib/hooks/useBriefings";
import { useDataAdmin } from "@/lib/hooks/useDataAdmin";
import { useWatchlist } from "@/lib/hooks/useWatchlist";
import { useTickerBars } from "@/lib/hooks/useTickerData";
import { cn } from "@/lib/utils/cn";
import { formatDate, formatTimeAgo } from "@/lib/utils/dates";

export function BriefingPanel() {
  const { data: list } = useBriefings();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const generate = useGenerateBriefing();
  const { refreshAll, scoreNews } = useDataAdmin();

  // Check data readiness: is there ANY bar data for the first watchlist ticker?
  // Cheap heuristic — if the watchlist has tickers but no bars, prompt for a refresh.
  const { data: watchlist } = useWatchlist();
  const firstTicker = watchlist?.[0]?.ticker ?? "";
  const { data: firstTickerBars, isFetched: firstTickerFetched } = useTickerBars(
    firstTicker,
    30,
  );
  const hasData =
    !firstTicker ||
    !firstTickerFetched ||
    (firstTickerBars?.bars?.length ?? 0) > 0;

  // Default to the most recent briefing
  useEffect(() => {
    if (selectedId == null && list && list.length > 0) {
      setSelectedId(list[0].id);
    }
  }, [list, selectedId]);

  const { data: current, isLoading } = useBriefing(selectedId);

  async function handleGenerate() {
    const result = await generate.mutateAsync();
    setSelectedId(result.id);
  }

  async function handleRefreshThenGenerate() {
    await refreshAll.mutateAsync();
    try {
      await scoreNews.mutateAsync();
    } catch {
      // best effort
    }
    const result = await generate.mutateAsync();
    setSelectedId(result.id);
  }

  const busyRefreshing = refreshAll.isPending || scoreNews.isPending;
  const busyGenerating = generate.isPending;
  const busy = busyRefreshing || busyGenerating;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border-subtle px-5 py-3">
        <div className="flex items-center gap-3">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.2em] text-fg-muted">
            Morning Briefing
          </h2>
          {current ? (
            <span className="font-mono text-[10px] text-fg-subtle">
              {formatTimeAgo(current.date)}
            </span>
          ) : null}
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={hasData ? handleGenerate : handleRefreshThenGenerate}
          loading={busy}
          disabled={!watchlist || watchlist.length === 0}
        >
          <RefreshCw className="h-3 w-3" />
          {hasData ? "Generate" : "Fetch & generate"}
        </Button>
      </div>

      {list && list.length > 0 ? (
        <div className="flex gap-1 overflow-x-auto border-b border-border-subtle px-5 py-2">
          {list.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => setSelectedId(b.id)}
              className={cn(
                "whitespace-nowrap rounded px-2 py-1 font-mono text-[10px] transition-colors",
                b.id === selectedId
                  ? "bg-accent/15 text-accent"
                  : "text-fg-subtle hover:bg-surface-muted hover:text-fg-muted",
              )}
            >
              {formatDate(b.date)}
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {busyRefreshing ? (
          <StatusBlock
            icon={<RefreshCw className="h-5 w-5 animate-spin" />}
            title="Fetching market data…"
            subtitle="Pulling bars and news for your watchlist, then scoring relevance."
          />
        ) : busyGenerating ? (
          <StatusBlock
            icon={<RefreshCw className="h-5 w-5 animate-spin" />}
            title="Generating briefing…"
            subtitle="Usually takes 15-30 seconds."
          />
        ) : isLoading ? (
          <div className="py-8 text-center text-xs text-fg-subtle">Loading…</div>
        ) : current ? (
          <Markdown>{current.content_markdown}</Markdown>
        ) : !watchlist || watchlist.length === 0 ? (
          <EmptyState message="Add tickers to your watchlist first, then generate a briefing." />
        ) : !hasData ? (
          <EmptyState
            message="No market data yet for your watchlist."
            action={
              <Button
                onClick={handleRefreshThenGenerate}
                loading={busy}
                className="mt-5"
              >
                Fetch data & generate briefing
              </Button>
            }
          />
        ) : (
          <EmptyState
            message="No briefings yet. Generate your first one."
            action={
              <Button onClick={handleGenerate} loading={busy} className="mt-5">
                Generate briefing
              </Button>
            }
          />
        )}
      </div>
    </div>
  );
}

function StatusBlock({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-fg-subtle">
      <div className="mb-3">{icon}</div>
      <p className="text-sm">{title}</p>
      {subtitle ? <p className="mt-1 text-xs">{subtitle}</p> : null}
    </div>
  );
}

function EmptyState({
  message,
  action,
}: {
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-16 text-center">
      <div className="mb-4 rounded-full border border-border-subtle bg-bg-raised p-3">
        <FileText className="h-5 w-5 text-fg-subtle" />
      </div>
      <p className="max-w-sm text-sm text-fg-muted">{message}</p>
      {action}
    </div>
  );
}
