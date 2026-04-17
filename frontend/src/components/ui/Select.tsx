"use client";

import { forwardRef, type SelectHTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  invalid?: boolean;
};

export const Select = forwardRef<HTMLSelectElement, Props>(function Select(
  { className, invalid, children, ...rest },
  ref,
) {
  return (
    <select
      ref={ref}
      className={cn(
        "h-9 w-full rounded border bg-bg-sunken px-3 text-sm text-fg",
        "focus:outline-none focus:ring-1",
        invalid
          ? "border-signal-down focus:border-signal-down focus:ring-signal-down"
          : "border-border-subtle focus:border-accent focus:ring-accent",
        "disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-fg-subtle",
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  );
});
