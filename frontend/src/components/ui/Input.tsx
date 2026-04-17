"use client";

import { forwardRef, type InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        "h-9 w-full rounded border bg-bg-sunken px-3 text-sm text-fg",
        "placeholder:text-fg-subtle",
        "focus:outline-none focus:ring-1",
        invalid
          ? "border-signal-down focus:border-signal-down focus:ring-signal-down"
          : "border-border-subtle focus:border-accent focus:ring-accent",
        "disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-fg-subtle",
        className,
      )}
      {...rest}
    />
  );
});
