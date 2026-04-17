"use client";

import type { ReactNode } from "react";

/**
 * Dashboard grid.
 *
 * Research-console layout inspired by financial terminals:
 *   - Left: watchlist (240px fixed)
 *   - Center: briefing + ticker detail (fluid)
 *   - Right: AI chat (380px fixed)
 *
 * On narrower screens (<1280px) the right column collapses under the center
 * column; below 1024px the watchlist collapses to a top strip.
 */
export function DashboardGrid({
  left,
  center,
  right,
}: {
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
}) {
  return (
    <div className="grid h-[calc(100vh-3rem)] grid-cols-1 gap-px bg-border-subtle lg:grid-cols-[240px_1fr] xl:grid-cols-[240px_1fr_380px]">
      <aside className="min-h-0 overflow-y-auto bg-bg">{left}</aside>
      <section className="min-h-0 overflow-y-auto bg-bg">{center}</section>
      <aside className="min-h-0 overflow-y-auto bg-bg xl:block">{right}</aside>
    </div>
  );
}
