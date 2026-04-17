"use client";

import { ExternalLink, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { NewsList } from "@/components/ticker/NewsList";
import { PriceChart } from "@/components/ticker/PriceChart";
import { TechnicalsPanel } from "@/components/ticker/TechnicalsPanel";
import { Button } from "@/components/ui";
import { useDataAdmin } from "@/lib/hooks/useDataAdmin";
import { useTickerBars, useTickerInfo } from "@/lib/hooks/useTickerData";
import { cn } from "@/lib/utils/cn";
import {
  deltaGlyph,
  formatPercent,
  formatPrice,
  signalTone,
} from "@/lib/utils/format";

type Props = {
  ticker: string | null;
  onClose: () => void;
};

/**
 * Chart timeframes (daily bars from Alpaca).
 *
 * 1d/5d are skipped because those require intraday bars — a separate
 * data pipeline. The named ranges all use daily granularity.
 */
const TIMEFRAMES = [
  { label: "1M", days: 30 },
  { label: "3M", days: 90 },
  { label: "6M", days: 180 },
  { label: "1Y", days: 365 },
  { label: "5Y", days: 365 * 5 },
] as const;

type Timeframe = (typeof TIMEFRAMES)[number];

/**
 * Rough expected trading-day count over a calendar-day window.
 * When stored bars fall below 70% of this, we trigger a backfill.
 */
function expectedBars(days: number): number {
  return Math.floor(days * (252 / 365) * 0.9);
}


export function TickerDetailDrawer({ ticker, onClose }: Props) {
  const [timeframe, setTimeframe] = useState<Timeframe>(TIMEFRAMES[0]);
  const { data, isLoading } = useTickerBars(ticker ?? "", timeframe.days);
  const { data: info } = useTickerInfo(ticker ?? "");
  const { refreshTicker } = useDataAdmin();

  // Track which (ticker, timeframe) pairs we've already auto-backfilled
  // this session so we don't loop forever.
  const backfilledRef = useRef<Set<string>>(new Set());
  const [backfilling, setBackfilling] = useState(false);

  // Escape to close
  useEffect(() => {
    if (!ticker) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [ticker, onClose]);

  // Auto-backfill: if the returned bar_count is much lower than expected,
  // the DB doesn't have enough history for this timeframe — fetch it.
  useEffect(() => {
    if (!ticker || !data || isLoading) return;
    const key = `${ticker}:${timeframe.label}`;
    if (backfilledRef.current.has(key)) return;

    const expected = expectedBars(timeframe.days);
    if (data.bar_count < expected * 0.7) {
      backfilledRef.current.add(key);
      setBackfilling(true);
      refreshTicker
        .mutateAsync({ ticker, daysBars: timeframe.days })
        .finally(() => setBackfilling(false));
    }
  }, [ticker, data, isLoading, timeframe, refreshTicker]);

  // Reset backfill history when ticker changes
  useEffect(() => {
    backfilledRef.current.clear();
  }, [ticker]);

  if (!ticker) return null;

  const change = data?.period_change_pct ?? null;
  const latest = data?.latest_close ?? null;
  const showChartLoader = isLoading || backfilling;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-border-subtle px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-4">
              <h1 className="font-mono text-2xl font-normal tracking-tight text-fg">
                {ticker}
              </h1>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-lg text-fg">
                  {showChartLoader ? "—" : formatPrice(latest)}
                </span>
                <span className={cn("font-mono text-sm", signalTone(change))}>
                  {deltaGlyph(change)} {formatPercent(change, { sign: true })}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                  {timeframe.label}
                </span>
              </div>
            </div>

            {(info?.name || info?.sector) ? (
              <div className="mt-1 flex items-center gap-2 text-[11px]">
                {info.name ? (
                  <span className="truncate text-fg-muted" title={info.name}>
                    {info.name}
                  </span>
                ) : null}
                {info.sector ? (
                  <>
                    <span className="text-fg-subtle" aria-hidden>·</span>
                    <span className="truncate text-fg-subtle" title={info.sector}>
                      {info.sector}
                    </span>
                  </>
                ) : null}
              </div>
            ) : null}

            <div className="mt-2 flex items-center gap-3">
              <ExternalSiteLink
                href={`https://finance.yahoo.com/quote/${ticker}/`}
                label="Yahoo Finance"
              />
              <ExternalSiteLink
                href={`https://www.cnbc.com/quotes/${ticker}`}
                label="CNBC"
              />
            </div>
          </div>

          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {/* Timeframe selector */}
        <div className="flex items-center justify-between border-b border-border-subtle px-4 py-2">
          <div className="flex items-center gap-1">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.label}
                type="button"
                onClick={() => setTimeframe(tf)}
                className={cn(
                  "rounded px-2.5 py-1 font-mono text-[11px] font-medium transition-colors",
                  tf.label === timeframe.label
                    ? "bg-accent/15 text-accent"
                    : "text-fg-subtle hover:bg-surface-muted hover:text-fg-muted",
                )}
              >
                {tf.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 font-mono text-[10px] text-fg-subtle">
            {backfilling ? <span>fetching history…</span> : null}
            {data ? <span>{data.bar_count} bars</span> : null}
          </div>
        </div>

        {/* Chart */}
        <div className="border-b border-border-subtle p-4">
          {showChartLoader && (!data || data.bars.length === 0) ? (
            <div className="flex h-[340px] items-center justify-center text-xs text-fg-subtle">
              {backfilling ? "Fetching history…" : "Loading chart…"}
            </div>
          ) : data && data.bars.length > 0 ? (
            <PriceChart bars={data.bars} height={340} />
          ) : (
            <div className="flex h-[340px] items-center justify-center text-xs text-fg-subtle">
              No price data. Try a shorter timeframe or refresh data.
            </div>
          )}
        </div>

        {/* Technicals */}
        <section className="border-b border-border-subtle">
          <div className="px-5 py-3">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.2em] text-fg-muted">
              Technicals
            </h2>
          </div>
          <div className="px-4 pb-4">
            <TechnicalsPanel ticker={ticker} />
          </div>
        </section>

        {/* News */}
        <section>
          <div className="px-5 py-3">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.2em] text-fg-muted">
              News
            </h2>
          </div>
          <NewsList ticker={ticker} />
        </section>
      </div>
    </div>
  );
}

function ExternalSiteLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-[11px] text-fg-subtle transition-colors hover:text-accent"
    >
      {label}
      <ExternalLink className="h-2.5 w-2.5" />
    </a>
  );
}
