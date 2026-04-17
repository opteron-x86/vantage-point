"use client";

import { forwardRef, type HTMLAttributes, type LabelHTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

// ---- Card ----

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function Card({ className, ...rest }, ref) {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-md border border-border-subtle bg-bg-raised",
          className,
        )}
        {...rest}
      />
    );
  },
);

export function CardHeader({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center justify-between px-4 py-3 border-b border-border-subtle",
        className,
      )}
      {...rest}
    />
  );
}

export function CardTitle({ className, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "text-xs font-medium uppercase tracking-[0.12em] text-fg-muted",
        className,
      )}
      {...rest}
    />
  );
}

export function CardBody({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4", className)} {...rest} />;
}

// ---- Label ----

export function Label({ className, ...rest }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "text-xs font-medium uppercase tracking-[0.12em] text-fg-muted",
        className,
      )}
      {...rest}
    />
  );
}

// ---- Badge ----

type BadgeTone = "neutral" | "up" | "down" | "warn" | "accent";

const badgeTones: Record<BadgeTone, string> = {
  neutral: "bg-surface-muted text-fg-muted border-border-subtle",
  up:      "bg-signal-up/10 text-signal-up border-signal-up/30",
  down:    "bg-signal-down/10 text-signal-down border-signal-down/30",
  warn:    "bg-signal-warn/10 text-signal-warn border-signal-warn/30",
  accent:  "bg-accent/10 text-accent border-accent/30",
};

export function Badge({
  tone = "neutral",
  className,
  ...rest
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider",
        badgeTones[tone],
        className,
      )}
      {...rest}
    />
  );
}
