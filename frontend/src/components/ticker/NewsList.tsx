"use client";

import { ExternalLink } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui";
import { useTickerNews } from "@/lib/hooks/useTickerData";
import type { Article } from "@/lib/types/market";
import { cn } from "@/lib/utils/cn";
import { formatTimeAgo } from "@/lib/utils/dates";

type Props = {
  ticker: string;
};

/**
 * Paginated-ish news list with a relevance filter. Shows top headlines with
 * relevance badges, collapsed summaries that expand on click.
 */
export function NewsList({ ticker }: Props) {
  const [minRelevance, setMinRelevance] = useState(2);
  const { data, isLoading } = useTickerNews(ticker, {
    limit: 30,
    minRelevance,
  });

  return (
    <div>
      <div className="flex items-center justify-between border-b border-border-subtle px-4 py-2">
        <div className="flex items-center gap-1">
          {[0, 2, 3].map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => setMinRelevance(lvl)}
              className={cn(
                "rounded px-2 py-1 text-[10px] font-medium uppercase tracking-wider transition-colors",
                minRelevance === lvl
                  ? "bg-accent/15 text-accent"
                  : "text-fg-subtle hover:bg-surface-muted hover:text-fg-muted",
              )}
            >
              {lvl === 0 ? "All" : lvl === 2 ? "Relevant" : "Primary only"}
            </button>
          ))}
        </div>
        {data ? (
          <span className="font-mono text-[10px] text-fg-subtle">
            {data.article_count}
          </span>
        ) : null}
      </div>

      {isLoading ? (
        <div className="px-4 py-6 text-xs text-fg-subtle">Loading…</div>
      ) : !data || data.articles.length === 0 ? (
        <div className="px-4 py-6 text-xs text-fg-subtle">
          No articles match this filter.
        </div>
      ) : (
        <ul className="divide-y divide-border-subtle">
          {data.articles.map((a) => (
            <NewsItem key={a.id} article={a} />
          ))}
        </ul>
      )}
    </div>
  );
}

function NewsItem({ article }: { article: Article }) {
  const [expanded, setExpanded] = useState(false);
  const badgeTone =
    article.relevance_score === 3 ? "accent" : article.relevance_score === 2 ? "neutral" : "neutral";

  return (
    <li className="px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <Badge tone={badgeTone}>
              {article.relevance_score === 3 ? "Primary" : article.relevance_score === 2 ? "Relevant" : "Mention"}
            </Badge>
            <span className="font-mono text-[10px] text-fg-subtle">
              {article.source ?? "—"} · {formatTimeAgo(article.published_at)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="block text-left text-sm text-fg hover:text-accent"
          >
            {article.headline}
          </button>
          {expanded && article.summary ? (
            <p className="mt-2 text-xs leading-relaxed text-fg-muted">
              {article.summary}
            </p>
          ) : null}
        </div>
        {article.url ? (
          <a
            href={article.url}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 text-fg-subtle hover:text-accent"
            aria-label="Open article"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : null}
      </div>
    </li>
  );
}
