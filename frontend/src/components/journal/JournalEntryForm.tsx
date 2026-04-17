"use client";

import { useState, type FormEvent } from "react";

import {
  Button,
  Input,
  Label,
  Select,
  Textarea,
} from "@/components/ui";
import type {
  CreateEntryBody,
  EntryPrecision,
  JournalEntry,
} from "@/lib/types/journal";
import { cn } from "@/lib/utils/cn";

type Mode = "known" | "cost_basis";

type Props = {
  initial?: JournalEntry;
  onSubmit: (body: CreateEntryBody) => Promise<void> | void;
  onCancel: () => void;
  submitting?: boolean;
};

/**
 * Journal entry form.
 *
 * Two input modes (selected via a toggle at the top):
 *   - known:       user knows date + price_per_share (standard trade log)
 *   - cost_basis:  user only knows total cost basis + shares (backfill mode)
 *
 * Cost-basis mode is what you'd use to backfill existing positions where
 * you remember "I bought 12 shares, spent about $1,192" but not the exact
 * date/price. The `entry_precision` field tags the entry so the AI knows
 * whether to treat the date as authoritative.
 */
export function JournalEntryForm({ initial, onSubmit, onCancel, submitting }: Props) {
  const [mode, setMode] = useState<Mode>(
    initial?.entry_precision === "backfilled" || initial?.entry_precision === "approximate"
      ? "cost_basis"
      : "known",
  );

  const [ticker, setTicker] = useState(initial?.ticker ?? "");
  const [shares, setShares] = useState(initial ? String(initial.shares) : "");
  const [pricePerShare, setPricePerShare] = useState(
    initial?.price_per_share != null ? String(initial.price_per_share) : "",
  );
  const [costBasis, setCostBasis] = useState(
    initial?.cost_basis != null ? String(initial.cost_basis) : "",
  );
  const [entryDate, setEntryDate] = useState(
    initial?.entry_date ? initial.entry_date.slice(0, 10) : "",
  );
  const [approxNote, setApproxNote] = useState(""); // e.g., "April 2025"
  const [thesis, setThesis] = useState(initial?.thesis ?? "");
  const [stopLoss, setStopLoss] = useState(
    initial?.stop_loss != null ? String(initial.stop_loss) : "",
  );
  const [targetPrice, setTargetPrice] = useState(
    initial?.target_price != null ? String(initial.target_price) : "",
  );
  const [timeHorizon, setTimeHorizon] = useState(initial?.time_horizon ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [error, setError] = useState<string | null>(null);

  // Cost-basis mode derivation
  const derivedPricePerShare =
    mode === "cost_basis" && shares && costBasis
      ? Number(costBasis) / Number(shares)
      : null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const sharesN = Number(shares);
    if (!ticker.trim() || !sharesN || sharesN <= 0) {
      setError("Ticker and share count are required.");
      return;
    }

    let computedCostBasis: number;
    let precision: EntryPrecision;
    let dateValue: string | null;

    if (mode === "known") {
      const priceN = Number(pricePerShare);
      if (!priceN || priceN <= 0) {
        setError("Price per share is required in known-entry mode.");
        return;
      }
      if (!entryDate) {
        setError("Entry date is required in known-entry mode.");
        return;
      }
      computedCostBasis = sharesN * priceN;
      precision = "exact";
      dateValue = entryDate;
    } else {
      const costN = Number(costBasis);
      if (!costN || costN <= 0) {
        setError("Cost basis is required.");
        return;
      }
      computedCostBasis = costN;
      // If they've provided a date, call it approximate; otherwise backfilled
      precision = entryDate ? "approximate" : "backfilled";
      dateValue = entryDate || null;
    }

    const body: CreateEntryBody = {
      ticker: ticker.trim().toUpperCase(),
      shares: sharesN,
      cost_basis: Number(computedCostBasis.toFixed(4)),
      entry_date: dateValue,
      entry_precision: precision,
      thesis: thesis.trim() || null,
      stop_loss: stopLoss ? Number(stopLoss) : null,
      target_price: targetPrice ? Number(targetPrice) : null,
      time_horizon: timeHorizon || null,
      notes:
        [notes.trim(), approxNote && mode === "cost_basis" ? `(approx: ${approxNote})` : ""]
          .filter(Boolean)
          .join(" ") || null,
    };

    try {
      await onSubmit(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save entry");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Mode toggle */}
      <div className="flex gap-1 rounded-md border border-border-subtle bg-bg-sunken p-0.5">
        <ModeButton active={mode === "known"} onClick={() => setMode("known")}>
          Known entry
        </ModeButton>
        <ModeButton active={mode === "cost_basis"} onClick={() => setMode("cost_basis")}>
          Cost basis only
        </ModeButton>
      </div>

      <p className="text-xs text-fg-subtle">
        {mode === "known"
          ? "Use when you know the exact date and price per share."
          : "Use to backfill existing positions — we'll compute the implied price from cost basis ÷ shares."}
      </p>

      {/* Ticker + shares */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Ticker">
          <Input
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            placeholder="NVDA"
            maxLength={10}
            autoFocus
            required
          />
        </Field>
        <Field label="Shares">
          <Input
            type="number"
            step="0.0001"
            min="0"
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            placeholder="12"
            required
          />
        </Field>
      </div>

      {/* Mode-specific fields */}
      {mode === "known" ? (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Price per share">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={pricePerShare}
              onChange={(e) => setPricePerShare(e.target.value)}
              placeholder="99.38"
              required
            />
          </Field>
          <Field label="Entry date">
            <Input
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              required
            />
          </Field>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Total cost basis ($)">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={costBasis}
                onChange={(e) => setCostBasis(e.target.value)}
                placeholder="1192.55"
                required
              />
            </Field>
            <Field label="Approx entry date (optional)">
              <Input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
              />
            </Field>
          </div>

          {/* Live derivation readout */}
          {derivedPricePerShare ? (
            <div className="rounded border border-border-subtle bg-bg-sunken px-3 py-2 font-mono text-xs text-fg-muted">
              Implied price per share:{" "}
              <span className="text-fg">
                ${derivedPricePerShare.toFixed(2)}
              </span>
            </div>
          ) : null}

          <Field label="Approximate timing note (optional)">
            <Input
              value={approxNote}
              onChange={(e) => setApproxNote(e.target.value)}
              placeholder="e.g., April 2025, during the pullback"
            />
          </Field>
        </div>
      )}

      {/* Plan */}
      <div className="space-y-3 rounded-md border border-border-subtle bg-bg-sunken p-3">
        <div className="text-[10px] font-medium uppercase tracking-[0.15em] text-fg-subtle">
          Plan <span className="normal-case tracking-normal">(optional but recommended)</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Stop loss">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              placeholder="180.00"
            />
          </Field>
          <Field label="Target price">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              placeholder="215.00"
            />
          </Field>
        </div>
        <Field label="Time horizon">
          <Select
            value={timeHorizon}
            onChange={(e) => setTimeHorizon(e.target.value)}
          >
            <option value="">—</option>
            <option value="intraday">Intraday</option>
            <option value="swing">Swing (days to weeks)</option>
            <option value="position">Position (weeks to months)</option>
            <option value="long-term">Long-term (months+)</option>
          </Select>
        </Field>
      </div>

      {/* Thesis + notes */}
      <Field label="Thesis (why you bought)">
        <Textarea
          value={thesis}
          onChange={(e) => setThesis(e.target.value)}
          rows={3}
          placeholder="AI chip leadership + Ising quantum platform. Ride the AI trend but need a clear exit level."
        />
      </Field>

      <Field label="Notes (optional)">
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Anything else worth remembering about this trade."
        />
      </Field>

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
          {initial ? "Save changes" : "Add entry"}
        </Button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "bg-surface text-fg"
          : "text-fg-subtle hover:text-fg-muted",
      )}
    >
      {children}
    </button>
  );
}
