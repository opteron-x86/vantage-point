"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils/cn";

type Props = {
  children: string;
  className?: string;
  /** Compact spacing for tight contexts like chat bubbles. */
  compact?: boolean;
};

/**
 * A single source of truth for rendering AI markdown output.
 * Typography decisions live here so all AI text looks consistent
 * across briefings, chat, and anywhere else.
 */
export function Markdown({ children, className, compact }: Props) {
  const components: Components = {
    h1: ({ node: _node, ...p }) => (
      <h1 className={cn("font-mono text-lg font-normal text-fg", compact ? "mt-2" : "mt-6", "mb-2")} {...p} />
    ),
    h2: ({ node: _node, ...p }) => (
      <h2
        className={cn(
          "text-[11px] font-medium uppercase tracking-[0.15em] text-fg-muted",
          compact ? "mt-3" : "mt-6",
          "mb-2",
        )}
        {...p}
      />
    ),
    h3: ({ node: _node, ...p }) => (
      <h3 className={cn("text-sm font-medium text-fg", compact ? "mt-2" : "mt-4", "mb-1")} {...p} />
    ),
    p: ({ node: _node, ...p }) => (
      <p className={cn("text-sm leading-relaxed text-fg-muted", compact ? "my-1.5" : "my-3")} {...p} />
    ),
    strong: ({ node: _node, ...p }) => <strong className="font-semibold text-fg" {...p} />,
    em: ({ node: _node, ...p }) => <em className="italic text-fg" {...p} />,
    ul: ({ node: _node, ...p }) => <ul className={cn("ml-5 list-disc text-sm text-fg-muted", compact ? "my-1.5" : "my-3")} {...p} />,
    ol: ({ node: _node, ...p }) => <ol className={cn("ml-5 list-decimal text-sm text-fg-muted", compact ? "my-1.5" : "my-3")} {...p} />,
    li: ({ node: _node, ...p }) => <li className="my-1 leading-relaxed" {...p} />,
    a: ({ node: _node, ...p }) => (
      <a className="text-accent underline decoration-accent/30 underline-offset-2 hover:decoration-accent" target="_blank" rel="noreferrer" {...p} />
    ),
    code: ({ node: _node, inline, className: cc, children, ...p }: any) =>
      inline ? (
        <code className={cn("rounded bg-surface-muted px-1 py-0.5 font-mono text-[0.85em] text-fg", cc)} {...p}>
          {children}
        </code>
      ) : (
        <code className={cn("block rounded bg-bg-sunken p-3 font-mono text-xs text-fg", cc)} {...p}>
          {children}
        </code>
      ),
    blockquote: ({ node: _node, ...p }) => (
      <blockquote className="my-3 border-l-2 border-accent/40 pl-3 text-sm italic text-fg-muted" {...p} />
    ),
    hr: () => <hr className="my-4 border-border-subtle" />,
    table: ({ node: _node, ...p }) => <table className="my-3 w-full border-collapse text-xs" {...p} />,
    th: ({ node: _node, ...p }) => (
      <th className="border-b border-border px-2 py-1.5 text-left text-[10px] font-medium uppercase tracking-wider text-fg-muted" {...p} />
    ),
    td: ({ node: _node, ...p }) => (
      <td className="border-b border-border-subtle px-2 py-1.5 text-fg-muted" {...p} />
    ),
  };

  return (
    <div className={cn("max-w-none", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
