"use client";

import { Markdown } from "@/components/common/Markdown";
import { ToolCallBadge } from "@/components/chat/ToolCallBadge";
import { cn } from "@/lib/utils/cn";
import type { ChatTurn } from "@/lib/types/chat";

export function MessageBubble({ turn }: { turn: ChatTurn }) {
  if (turn.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-md bg-accent/10 px-3 py-2 text-sm text-fg">
          {turn.text}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-full space-y-1">
      {/* Tool calls in the order they happened */}
      {turn.toolCalls?.map((tc) => (
        <ToolCallBadge key={tc.id} name={tc.name} input={tc.input} result={tc.result} />
      ))}

      {turn.text ? (
        <Markdown compact>{turn.text}</Markdown>
      ) : turn.streaming ? (
        <div className="flex items-center gap-2 text-xs text-fg-subtle">
          <span className="flex gap-0.5">
            <span className="h-1 w-1 animate-pulse rounded-full bg-fg-subtle" />
            <span className="h-1 w-1 animate-pulse rounded-full bg-fg-subtle [animation-delay:200ms]" />
            <span className="h-1 w-1 animate-pulse rounded-full bg-fg-subtle [animation-delay:400ms]" />
          </span>
          <span>Thinking…</span>
        </div>
      ) : null}
    </div>
  );
}
