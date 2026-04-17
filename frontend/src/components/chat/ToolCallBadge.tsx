"use client";

import { Check, Wrench } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils/cn";

type Props = {
  name: string;
  input: Record<string, unknown>;
  result?: Record<string, unknown>;
};

/**
 * Inline badge that shows the AI's tool activity during a turn.
 * Click to expand and see the input/result — useful for debugging
 * and for learning what the AI is actually doing.
 */
export function ToolCallBadge({ name, input, result }: Props) {
  const [expanded, setExpanded] = useState(false);
  const done = result != null;

  return (
    <div className="my-1.5">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider transition-colors",
          done
            ? "border-accent/30 bg-accent/10 text-accent"
            : "border-signal-warn/30 bg-signal-warn/10 text-signal-warn",
        )}
        aria-expanded={expanded}
      >
        {done ? <Check className="h-2.5 w-2.5" /> : <Wrench className="h-2.5 w-2.5 animate-pulse" />}
        <span>{name}</span>
        {renderPrimaryArg(input) ? (
          <span className="font-mono normal-case tracking-normal text-fg-subtle">
            {renderPrimaryArg(input)}
          </span>
        ) : null}
      </button>

      {expanded ? (
        <div className="mt-1.5 rounded border border-border-subtle bg-bg-sunken p-2 font-mono text-[10px] text-fg-subtle">
          <div>
            <span className="text-fg-muted">input: </span>
            {JSON.stringify(input)}
          </div>
          {result ? (
            <div className="mt-1 line-clamp-4">
              <span className="text-fg-muted">result: </span>
              {JSON.stringify(result).slice(0, 400)}
              {JSON.stringify(result).length > 400 ? "…" : ""}
            </div>
          ) : (
            <div className="mt-1 text-fg-subtle">running…</div>
          )}
        </div>
      ) : null}
    </div>
  );
}

/** Pick the most informative arg to show inline — usually the ticker. */
function renderPrimaryArg(input: Record<string, unknown>): string | null {
  const ticker = input.ticker;
  if (typeof ticker === "string") return ticker;
  const keys = Object.keys(input);
  if (keys.length === 0) return null;
  const first = input[keys[0]];
  return typeof first === "string" || typeof first === "number" ? String(first) : null;
}
