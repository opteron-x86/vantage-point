"use client";

import { forwardRef, type TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean;
};

export const Textarea = forwardRef<HTMLTextAreaElement, Props>(function Textarea(
  { className, invalid, ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "w-full rounded border bg-bg-sunken px-3 py-2 text-sm text-fg",
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
