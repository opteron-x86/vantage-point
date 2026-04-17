"use client";

import { X } from "lucide-react";

import { Sparkline } from "@/components/watchlist/Sparkline";
import { useTickerBars } from "@/lib/hooks/useTickerData";
import {
  deltaGlyph,
  formatPercent,
  formatPrice,
  signalTone,
} from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

type Props = {
  ticker: string;
  name?: string | null;
  selected?: boolean;
  onSelect?: (ticker: string) => void;
  onRemove?: (ticker: string) => void;
};

export function WatchlistRow({ ticker, name, selected, onSelect, onRemove }: Props) {
  const { data, isLoading } = useTickerBars(ticker, 30);

  const closes = data?.bars.map((b) => b.close) ?? [];
  const latest = data?.latest_close ?? null;
  const change = data?.period_change_pct ?? null;

  return (
    <div
      className={cn(
        "group relative flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors",
        "hover:bg-surface-muted",
        selected && "bg-surface-muted",
      )}
      onClick={() => onSelect?.(ticker)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect?.(ticker)}
      role="button"
      tabIndex={0}
    >
      <div
        className={cn(
          "absolute inset-y-0 left-0 w-[2px] transition-colors",
          selected ? "bg-accent" : "bg-transparent",
        )}
        aria-hidden
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <div className="flex min-w-0 items-baseline gap-2">
            <span className="font-mono text-sm font-medium tracking-tight text-fg">
              {ticker}
            </span>
            {name ? (
              <span className="truncate text-[10px] text-fg-subtle" title={name}>
                {name}
              </span>
            ) : null}
          </div>
          <span className={cn("shrink-0 font-mono text-xs", signalTone(change))}>
            {deltaGlyph(change)} {formatPercent(change)}
          </span>
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <span className="font-mono text-[11px] text-fg-subtle">
            {isLoading ? "—" : formatPrice(latest)}
          </span>
          <Sparkline values={closes} />
        </div>
      </div>

      {onRemove ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(ticker);
          }}
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded text-fg-subtle opacity-0 transition-opacity",
            "hover:bg-surface-hover hover:text-signal-down focus:opacity-100",
            "group-hover:opacity-100",
          )}
          aria-label={`Remove ${ticker}`}
        >
          <X className="h-3 w-3" />
        </button>
      ) : null}
    </div>
  );
}
