// Pure formatting helpers. No React, no side effects.

const priceFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const compactFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatPrice(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `$${priceFormatter.format(value)}`;
}

export function formatPercent(value: number | null | undefined, opts?: { sign?: boolean }): string {
  if (value == null || Number.isNaN(value)) return "—";
  const sign = opts?.sign && value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function formatVolume(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return compactFormatter.format(value);
}

export function formatNumber(value: number | null | undefined, decimals = 2): string {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toFixed(decimals);
}

/** Tiny arrow glyph for up/down deltas. */
export function deltaGlyph(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "·";
  if (value > 0) return "▲";
  if (value < 0) return "▼";
  return "·";
}

/** Signal tone class for up/down/flat — consumed by components. */
export function signalTone(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "text-fg-subtle";
  if (value > 0) return "text-signal-up";
  if (value < 0) return "text-signal-down";
  return "text-fg-muted";
}
