"use client";

import { BookOpen, Plus, Settings as SettingsIcon } from "lucide-react";
import { useState } from "react";

import { JournalEntryForm } from "@/components/journal/JournalEntryForm";
import { CloseEntryForm } from "@/components/journal/CloseEntryForm";
import { JournalRow } from "@/components/journal/JournalRow";
import { SettingsForm } from "@/components/journal/SettingsForm";
import { TopBar } from "@/components/layout/TopBar";
import { Button, Modal } from "@/components/ui";
import { useRequireAuth } from "@/lib/hooks/useAuth";
import {
  useJournalEntries,
  useJournalMutations,
} from "@/lib/hooks/useJournal";
import type { JournalEntry } from "@/lib/types/journal";
import { cn } from "@/lib/utils/cn";
import {
  formatPercent,
  formatPrice,
  signalTone,
} from "@/lib/utils/format";

type DialogState =
  | { kind: "closed" }
  | { kind: "new" }
  | { kind: "edit"; entry: JournalEntry }
  | { kind: "close"; entry: JournalEntry }
  | { kind: "delete"; entry: JournalEntry }
  | { kind: "settings" };

export default function JournalPage() {
  const { isReady, isAuthenticated } = useRequireAuth();
  const { data: entries, isLoading } = useJournalEntries();
  const { create, update, close, remove } = useJournalMutations();

  const [dialog, setDialog] = useState<DialogState>({ kind: "closed" });

  if (!isReady || !isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="font-mono text-xs text-fg-subtle">Loading…</div>
      </main>
    );
  }

  const openEntries = entries?.filter((e) => e.status === "open") ?? [];
  const closedEntries = entries?.filter((e) => e.status === "closed") ?? [];

  // Portfolio aggregates (computed from list so we only hit one endpoint)
  const totalCost = openEntries.reduce((s, e) => s + e.cost_basis, 0);
  const totalValue = openEntries.reduce(
    (s, e) => s + (e.market_value ?? 0),
    0,
  );
  const totalPnl = totalValue - totalCost;
  const totalPct = totalCost ? (totalPnl / totalCost) * 100 : null;
  const allHaveCurrent = openEntries.every((e) => e.current_price != null);

  function closeDialog() {
    setDialog({ kind: "closed" });
  }

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar />

      <main className="mx-auto w-full max-w-6xl flex-1 p-6">
        <div className="mb-6 flex items-start justify-between gap-6">
          <div>
            <h1 className="font-mono text-xl font-normal text-fg">
              Trade journal
            </h1>
            <p className="mt-1 text-sm text-fg-muted">
              {openEntries.length} open · {closedEntries.length} closed
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDialog({ kind: "settings" })}
              aria-label="Account settings"
            >
              <SettingsIcon className="h-3.5 w-3.5" />
              Account
            </Button>
            <Button onClick={() => setDialog({ kind: "new" })}>
              <Plus className="h-3.5 w-3.5" />
              Add entry
            </Button>
          </div>
        </div>

        {/* Aggregates strip */}
        {openEntries.length > 0 && allHaveCurrent ? (
          <div className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded border border-border-subtle bg-border-subtle sm:grid-cols-4">
            <Stat label="Total cost basis" value={formatPrice(totalCost)} />
            <Stat label="Market value" value={formatPrice(totalValue)} />
            <Stat
              label="Unrealized P&L"
              value={`${totalPnl >= 0 ? "+" : "−"}${formatPrice(Math.abs(totalPnl))}`}
              className={signalTone(totalPnl)}
            />
            <Stat
              label="Return"
              value={formatPercent(totalPct, { sign: true })}
              className={signalTone(totalPct)}
            />
          </div>
        ) : null}

        {/* Content */}
        {isLoading ? (
          <div className="py-12 text-center text-xs text-fg-subtle">Loading…</div>
        ) : !entries || entries.length === 0 ? (
          <EmptyState onAdd={() => setDialog({ kind: "new" })} />
        ) : (
          <div className="space-y-8">
            {openEntries.length > 0 ? (
              <Section title="Open positions" entries={openEntries} setDialog={setDialog} />
            ) : null}
            {closedEntries.length > 0 ? (
              <Section title="Closed" entries={closedEntries} setDialog={setDialog} />
            ) : null}
          </div>
        )}
      </main>

      {/* Dialogs */}
      <Modal
        open={dialog.kind === "new" || dialog.kind === "edit"}
        onClose={closeDialog}
        title={dialog.kind === "edit" ? `Edit ${dialog.entry.ticker}` : "Add journal entry"}
        size="lg"
      >
        {dialog.kind === "new" ? (
          <JournalEntryForm
            onSubmit={async (body) => {
              await create.mutateAsync(body);
              closeDialog();
            }}
            onCancel={closeDialog}
            submitting={create.isPending}
          />
        ) : dialog.kind === "edit" ? (
          <JournalEntryForm
            initial={dialog.entry}
            onSubmit={async (body) => {
              await update.mutateAsync({ id: dialog.entry.id, body });
              closeDialog();
            }}
            onCancel={closeDialog}
            submitting={update.isPending}
          />
        ) : null}
      </Modal>

      <Modal
        open={dialog.kind === "close"}
        onClose={closeDialog}
        title="Close position"
      >
        {dialog.kind === "close" ? (
          <CloseEntryForm
            entry={dialog.entry}
            onSubmit={async (exit_price, exit_date, exit_notes) => {
              await close.mutateAsync({
                id: dialog.entry.id,
                body: { exit_price, exit_date, exit_notes },
              });
              closeDialog();
            }}
            onCancel={closeDialog}
            submitting={close.isPending}
          />
        ) : null}
      </Modal>

      <Modal
        open={dialog.kind === "delete"}
        onClose={closeDialog}
        title="Delete entry?"
        size="sm"
      >
        {dialog.kind === "delete" ? (
          <div className="space-y-4">
            <p className="text-sm text-fg-muted">
              Delete your {dialog.entry.ticker} entry? This can't be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={closeDialog}>
                Cancel
              </Button>
              <Button
                variant="danger"
                loading={remove.isPending}
                onClick={async () => {
                  if (dialog.kind !== "delete") return;
                  await remove.mutateAsync(dialog.entry.id);
                  closeDialog();
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={dialog.kind === "settings"}
        onClose={closeDialog}
        title="Account settings"
      >
        <SettingsForm onDone={closeDialog} />
      </Modal>
    </div>
  );
}

function Section({
  title,
  entries,
  setDialog,
}: {
  title: string;
  entries: JournalEntry[];
  setDialog: (d: DialogState) => void;
}) {
  return (
    <section>
      <h2 className="mb-2 text-[11px] font-medium uppercase tracking-[0.2em] text-fg-muted">
        {title} <span className="ml-1 font-mono text-fg-subtle">{entries.length}</span>
      </h2>
      <div className="overflow-hidden rounded-md border border-border-subtle bg-bg-raised">
        <table className="w-full text-xs">
          <thead className="bg-surface-muted">
            <tr className="text-left text-[10px] font-medium uppercase tracking-wider text-fg-subtle">
              <Th>Ticker</Th>
              <Th>Shares</Th>
              <Th>Cost basis</Th>
              <Th>Current / exit</Th>
              <Th>P&amp;L</Th>
              <Th>Plan</Th>
              <Th>Date</Th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <JournalRow
                key={entry.id}
                entry={entry}
                onEdit={(e) => setDialog({ kind: "edit", entry: e })}
                onClose={(e) => setDialog({ kind: "close", entry: e })}
                onDelete={(e) => setDialog({ kind: "delete", entry: e })}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-2 py-2 first:pl-4 last:pr-4">{children}</th>;
}

function Stat({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="bg-bg-raised px-4 py-3">
      <div className="text-[10px] font-medium uppercase tracking-wider text-fg-subtle">
        {label}
      </div>
      <div className={cn("mt-0.5 font-mono text-sm text-fg", className)}>
        {value}
      </div>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
      <div className="mb-4 rounded-full border border-border-subtle bg-bg-raised p-3">
        <BookOpen className="h-5 w-5 text-fg-subtle" />
      </div>
      <h3 className="font-mono text-base text-fg">No entries yet</h3>
      <p className="mt-2 max-w-sm text-sm text-fg-muted">
        Log your trades — real or hypothetical. Write down the thesis when you
        enter, the plan (stop + target), and what actually happened when you
        exit. Use the AI to review your decisions over time.
      </p>
      <Button onClick={onAdd} className="mt-5">
        <Plus className="h-3.5 w-3.5" />
        Add your first entry
      </Button>
    </div>
  );
}
