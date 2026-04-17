"use client";

import { useState, type FormEvent } from "react";

import { Button, Input, Label, Textarea } from "@/components/ui";
import type { JournalEntry } from "@/lib/types/journal";
import { formatPrice } from "@/lib/utils/format";

type Props = {
  entry: JournalEntry;
  onSubmit: (exit_price: number, exit_date: string, exit_notes: string | null) => Promise<void>;
  onCancel: () => void;
  submitting?: boolean;
};

export function CloseEntryForm({ entry, onSubmit, onCancel, submitting }: Props) {
  const [exitPrice, setExitPrice] = useState(
    entry.current_price ? String(entry.current_price) : "",
  );
  const [exitDate, setExitDate] = useState(new Date().toISOString().slice(0, 10));
  const [exitNotes, setExitNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const implied =
    exitPrice && entry.price_per_share
      ? (Number(exitPrice) - entry.price_per_share) * entry.shares
      : null;
  const impliedPct =
    implied != null ? (implied / entry.cost_basis) * 100 : null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const price = Number(exitPrice);
    if (!price || price <= 0) {
      setError("Exit price is required.");
      return;
    }
    try {
      await onSubmit(price, exitDate, exitNotes.trim() || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to close entry");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded border border-border-subtle bg-bg-sunken p-3">
        <div className="flex justify-between font-mono text-xs text-fg-muted">
          <span>{entry.ticker}</span>
          <span>{entry.shares} shares @ {formatPrice(entry.price_per_share)}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Exit price</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={exitPrice}
            onChange={(e) => setExitPrice(e.target.value)}
            autoFocus
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label>Exit date</Label>
          <Input
            type="date"
            value={exitDate}
            onChange={(e) => setExitDate(e.target.value)}
            required
          />
        </div>
      </div>

      {/* Live P&L preview */}
      {implied != null ? (
        <div className="rounded border border-border-subtle bg-bg-sunken px-3 py-2 font-mono text-xs">
          <span className="text-fg-muted">Realized P&amp;L: </span>
          <span className={implied >= 0 ? "text-signal-up" : "text-signal-down"}>
            {implied >= 0 ? "+" : ""}${implied.toFixed(2)} ({impliedPct?.toFixed(2)}%)
          </span>
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label>Exit notes (optional)</Label>
        <Textarea
          rows={3}
          value={exitNotes}
          onChange={(e) => setExitNotes(e.target.value)}
          placeholder="What prompted the exit? Did the thesis play out?"
        />
      </div>

      {error ? (
        <p className="text-xs text-signal-down" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel} type="button">
          Cancel
        </Button>
        <Button type="submit" loading={submitting}>
          Close position
        </Button>
      </div>
    </form>
  );
}
