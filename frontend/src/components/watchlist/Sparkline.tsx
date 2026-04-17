"use client";

import { useMemo } from "react";

type Props = {
  values: number[];
  width?: number;
  height?: number;
  /** Optional override; otherwise derived from first-vs-last direction. */
  tone?: "up" | "down" | "neutral";
};

/**
 * Minimal SVG sparkline — no axes, no gridlines. Pure gesture.
 * Tones map to Nord's aurora palette via CSS variables.
 */
export function Sparkline({ values, width = 72, height = 20, tone }: Props) {
  const { path, direction } = useMemo(() => {
    if (values.length < 2) return { path: "", direction: "neutral" as const };

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const step = width / (values.length - 1);

    const coords = values.map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / range) * height;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    });

    const dir = values[values.length - 1] > values[0] ? "up" : "down";
    return { path: `M ${coords.join(" L ")}`, direction: dir as "up" | "down" };
  }, [values, width, height]);

  if (!path) {
    return <div style={{ width, height }} aria-hidden />;
  }

  const effectiveTone = tone ?? direction;
  const stroke =
    effectiveTone === "up"
      ? "var(--signal-up)"
      : effectiveTone === "down"
        ? "var(--signal-down)"
        : "var(--fg-subtle)";

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
      aria-hidden
    >
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth={1.25}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
