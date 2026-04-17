"use client";

import { BookOpen, ChevronDown, ChevronRight, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { TopBar } from "@/components/layout/TopBar";
import { Input } from "@/components/ui";
import { GUIDES, SECTIONS, allEntries } from "@/lib/content/glossary";
import { useRequireAuth } from "@/lib/hooks/useAuth";
import { cn } from "@/lib/utils/cn";

export default function LearnPage() {
  const { isReady, isAuthenticated } = useRequireAuth();
  const [query, setQuery] = useState("");

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return allEntries().filter((e) => {
      const haystack = [
        e.term,
        ...(e.aliases ?? []),
        e.definition,
        e.practical ?? "",
        e.caveat ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [query]);

  if (!isReady || !isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="font-mono text-xs text-fg-subtle">Loading…</div>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar />

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        <div className="mb-8">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.3em] text-fg-subtle">
            <BookOpen className="h-3 w-3" />
            Learn
          </div>
          <h1 className="font-mono text-2xl font-normal text-fg">
            Glossary &amp; quick reference
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-fg-muted">
            A working reference for the terminology you&rsquo;ll encounter in briefings,
            news, and analyst commentary. Written to be honest about uncertainty —
            most indicators work sometimes and fail other times, and the difference
            matters more than the indicator.
          </p>
        </div>

        <div className="relative mb-10">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-subtle" />
          <Input
            type="search"
            placeholder="Search terms — RSI, cost basis, divergence, liquidity…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {searchResults ? (
          <SearchResults query={query} results={searchResults} />
        ) : (
          <BrowseView />
        )}
      </main>
    </div>
  );
}

function BrowseView() {
  return (
    <>
      <section className="mb-12">
        <h2 className="mb-4 font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-fg-muted">
          How to use Vantage Point
        </h2>
        <div className="space-y-3">
          {GUIDES.map((guide) => (
            <GuideCard key={guide.id} title={guide.title} body={guide.body} />
          ))}
        </div>
      </section>

      <div className="flex gap-10">
        <TableOfContents />

        <div className="min-w-0 flex-1 space-y-14">
          {SECTIONS.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-8">
              <h2 className="mb-2 font-mono text-lg text-fg">
                {section.title}
              </h2>
              {section.intro ? (
                <p className="mb-6 max-w-2xl text-sm text-fg-muted">
                  {section.intro}
                </p>
              ) : null}
              <div className="space-y-6">
                {section.entries.map((entry) => (
                  <EntryCard key={entry.term} entry={entry} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}

function TableOfContents() {
  return (
    <aside className="sticky top-20 hidden h-fit w-48 shrink-0 lg:block">
      <div className="mb-3 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-fg-subtle">
        Contents
      </div>
      <nav className="flex flex-col gap-1">
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="text-xs text-fg-muted transition-colors hover:text-accent"
          >
            {s.title}
          </a>
        ))}
      </nav>
    </aside>
  );
}

function GuideCard({ title, body }: { title: string; body: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-md border border-border-subtle bg-bg-raised">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-muted"
      >
        <span className="text-sm font-medium text-fg">{title}</span>
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />
        )}
      </button>
      {open ? (
        <div className="border-t border-border-subtle px-4 py-4">
          <GuideBody body={body} />
        </div>
      ) : null}
    </div>
  );
}

/**
 * Minimal markdown-ish renderer for guide bodies: paragraphs split on blank
 * lines, **bold** converted to <strong>. Not a full markdown parser — the
 * content is hand-authored and sticks to these two conventions.
 */
function GuideBody({ body }: { body: string }) {
  const paragraphs = body.split(/\n\s*\n/);
  return (
    <div className="space-y-4 text-sm leading-relaxed text-fg-muted">
      {paragraphs.map((p, i) => (
        <p key={i} dangerouslySetInnerHTML={{ __html: renderInline(p) }} />
      ))}
    </div>
  );
}

function renderInline(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped.replace(
    /\*\*([^*]+)\*\*/g,
    '<strong class="font-medium text-fg">$1</strong>',
  );
}

function EntryCard({
  entry,
}: {
  entry: (typeof SECTIONS)[number]["entries"][number];
}) {
  return (
    <div className="border-l-2 border-border-subtle pl-5">
      <div className="mb-1 flex flex-wrap items-baseline gap-2">
        <h3 className="font-mono text-sm font-medium text-fg">{entry.term}</h3>
        {entry.aliases?.length ? (
          <span className="text-[11px] text-fg-subtle">
            {entry.aliases.join(" · ")}
          </span>
        ) : null}
      </div>
      <p className="text-sm leading-relaxed text-fg-muted">{entry.definition}</p>
      {entry.practical ? (
        <p className="mt-2 text-sm leading-relaxed text-fg-muted">
          <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
            In practice
          </span>{" "}
          {entry.practical}
        </p>
      ) : null}
      {entry.caveat ? (
        <p className="mt-2 text-sm leading-relaxed text-fg-muted">
          <span className="font-mono text-[10px] uppercase tracking-wider text-signal-warn">
            Caveat
          </span>{" "}
          {entry.caveat}
        </p>
      ) : null}
    </div>
  );
}

function SearchResults({
  query,
  results,
}: {
  query: string;
  results: ReturnType<typeof allEntries>;
}) {
  if (results.length === 0) {
    return (
      <div className="rounded-md border border-border-subtle bg-bg-raised p-8 text-center">
        <p className="text-sm text-fg-muted">
          No entries match &ldquo;{query}&rdquo;.
        </p>
        <p className="mt-2 text-xs text-fg-subtle">
          Try a broader term, or ask the assistant directly in chat.
        </p>
      </div>
    );
  }

  const grouped = new Map<
    string,
    { sectionTitle: string; entries: typeof results }
  >();
  for (const r of results) {
    const existing = grouped.get(r.sectionId);
    if (existing) {
      existing.entries.push(r);
    } else {
      grouped.set(r.sectionId, {
        sectionTitle: r.sectionTitle,
        entries: [r],
      });
    }
  }

  return (
    <div className="space-y-10">
      <p className="text-xs text-fg-subtle">
        {results.length} {results.length === 1 ? "match" : "matches"} for{" "}
        <span className="font-mono text-fg-muted">&ldquo;{query}&rdquo;</span>
      </p>
      {Array.from(grouped.values()).map((group) => (
        <section key={group.sectionTitle}>
          <h2 className="mb-4 font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-fg-muted">
            {group.sectionTitle}
          </h2>
          <div className="space-y-6">
            {group.entries.map((entry) => (
              <EntryCard key={entry.term} entry={entry} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
