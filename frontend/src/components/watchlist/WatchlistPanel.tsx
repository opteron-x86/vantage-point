"use client";

import { RefreshCw, Sparkles } from "lucide-react";

import { AddTickerForm } from "@/components/watchlist/AddTickerForm";
import { WatchlistRow } from "@/components/watchlist/WatchlistRow";
import { Button } from "@/components/ui";
import { useDataAdmin } from "@/lib/hooks/useDataAdmin";
import { useWatchlist } from "@/lib/hooks/useWatchlist";
import { cn } from "@/lib/utils/cn";

type Props = {
  selectedTicker?: string | null;
  onSelect?: (ticker: string) => void;
};

export function WatchlistPanel({ selectedTicker, onSelect }: Props) {
  const { data, isLoading, add, remove } = useWatchlist();
  const { refreshAll, scoreNews } = useDataAdmin();

  const busy = refreshAll.isPending || scoreNews.isPending;

  async function handleRefreshAndScore() {
    await refreshAll.mutateAsync();
    // Run scoring right after so new articles get tagged for the briefing
    try {
      await scoreNews.mutateAsync();
    } catch {
      // Scoring is best-effort; refresh is the important part
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.2em] text-fg-muted">
          Watchlist
        </h2>
        <div className="flex items-center gap-2">
          {data ? (
            <span className="font-mono text-[10px] text-fg-subtle">
              {data.length}
            </span>
          ) : null}
          <button
            type="button"
            onClick={handleRefreshAndScore}
            disabled={busy || !data || data.length === 0}
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded text-fg-subtle transition-colors",
              "hover:bg-surface-muted hover:text-fg-muted",
              "disabled:cursor-not-allowed disabled:opacity-40",
            )}
            aria-label="Refresh market data and news"
            title="Refresh all data"
          >
            <RefreshCw className={cn("h-3 w-3", busy && "animate-spin")} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="px-4 py-6 text-xs text-fg-subtle">Loading…</div>
        ) : !data || data.length === 0 ? (
          <WatchlistEmpty />
        ) : (
          <div className="divide-y divide-border-subtle">
            {data.map((item) => (
              <WatchlistRow
                key={item.ticker}
                ticker={item.ticker}
                name={item.name}
                selected={selectedTicker === item.ticker}
                onSelect={onSelect}
                onRemove={(t) => remove.mutate(t)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Data status / action strip */}
      {data && data.length > 0 ? (
        <div className="border-t border-border-subtle px-4 py-2">
          <button
            type="button"
            onClick={handleRefreshAndScore}
            disabled={busy}
            className="flex w-full items-center justify-center gap-1.5 rounded py-1 text-[10px] font-medium uppercase tracking-wider text-fg-subtle transition-colors hover:bg-surface-muted hover:text-fg-muted disabled:opacity-40"
          >
            {busy ? (
              <>
                <RefreshCw className="h-3 w-3 animate-spin" />
                {refreshAll.isPending ? "Fetching…" : "Scoring…"}
              </>
            ) : (
              <>
                <Sparkles className="h-3 w-3" />
                Refresh data &amp; score news
              </>
            )}
          </button>
        </div>
      ) : null}

      <div className="border-t border-border-subtle">
        <AddTickerForm
          onAdd={async (t) => {
            await add.mutateAsync(t);
          }}
          disabled={add.isPending}
        />
      </div>
    </div>
  );
}

function WatchlistEmpty() {
  return (
    <div className="px-4 py-6 text-xs text-fg-subtle">
      No tickers yet. Add one below — market data will be fetched
      automatically.
    </div>
  );
}
