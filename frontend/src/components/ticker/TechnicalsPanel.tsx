"use client";

import { useTickerTechnicals } from "@/lib/hooks/useTickerData";
import { cn } from "@/lib/utils/cn";
import {
  formatNumber,
  formatPercent,
  formatPrice,
  formatVolume,
  signalTone,
} from "@/lib/utils/format";

/**
 * Dense grid of technical indicators. Mono font with tabular numerals
 * means columns line up cleanly even with varying values.
 */
export function TechnicalsPanel({ ticker }: { ticker: string }) {
  const { data, isLoading } = useTickerTechnicals(ticker);

  if (isLoading) {
    return <div className="p-4 text-xs text-fg-subtle">Loading…</div>;
  }
  if (!data || data.error) {
    return (
      <div className="p-4 text-xs text-fg-subtle">
        {data?.error ?? "No data available."}
      </div>
    );
  }

  const rsi = data.rsi_14;
  const rsiTone =
    rsi == null ? "text-fg-muted" : rsi > 70 ? "text-signal-warn" : rsi < 30 ? "text-signal-up" : "text-fg";

  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded bg-border-subtle sm:grid-cols-3">
      <Stat label="Close" value={formatPrice(data.latest_close)} />
      <Stat label="SMA 5"  value={formatPrice(data.sma_5)} />
      <Stat label="SMA 20" value={formatPrice(data.sma_20)} />

      <Stat label="RSI 14" value={formatNumber(rsi, 1)} className={rsiTone} />
      <Stat label="Volume"     value={formatVolume(data.latest_volume)} />
      <Stat
        label="Vol vs 20d"
        value={formatPercent(data.volume_vs_avg_pct, { sign: true })}
        className={signalTone(data.volume_vs_avg_pct)}
      />

      <Stat label="Period high" value={formatPrice(data.period_high)} />
      <Stat label="Period low"  value={formatPrice(data.period_low)} />
      <Stat label="Bars"        value={String(data.bars_analyzed ?? "—")} />
    </div>
  );
}

function Stat({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="bg-bg-raised px-3 py-2">
      <div className="text-[10px] font-medium uppercase tracking-wider text-fg-subtle">
        {label}
      </div>
      <div className={cn("mt-0.5 font-mono text-sm text-fg", className)}>
        {value}
      </div>
    </div>
  );
}
