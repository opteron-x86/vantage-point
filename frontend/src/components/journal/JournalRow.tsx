"use client";

import { Check, Edit2, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui";
import type { JournalEntry } from "@/lib/types/journal";
import { cn } from "@/lib/utils/cn";
import { formatDate } from "@/lib/utils/dates";
import {
  deltaGlyph,
  formatPercent,
  formatPrice,
  signalTone,
} from "@/lib/utils/format";

type Props = {
  entry: JournalEntry;
  onEdit: (entry: JournalEntry) => void;
  onClose: (entry: JournalEntry) => void;
  onDelete: (entry: JournalEntry) => void;
};

export function JournalRow({ entry, onEdit, onClose, onDelete }: Props) {
  const pnl = entry.status === "open" ? entry.unrealized_pnl : entry.realized_pnl;
  const pct = entry.pct_change;
  const hasPlan = entry.stop_loss != null || entry.target_price != null;

  return (
    <tr className="group border-b border-border-subtle hover:bg-surface-muted/40">
      {/* Ticker + status */}
      <td className="py-3 pl-4 pr-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-medium text-fg">
            {entry.ticker}
          </span>
          {entry.entry_precision !== "exact" ? (
            <Badge tone="neutral" title={`Entry precision: ${entry.entry_precision}`}>
              {entry.entry_precision === "backfilled" ? "bf" : "~"}
            </Badge>
          ) : null}
        </div>
      </td>

      {/* Shares + cost basis */}
      <td className="py-3 px-2 font-mono text-xs text-fg-muted">
        <div>{entry.shares}</div>
        <div className="text-fg-subtle">@ {formatPrice(entry.price_per_share)}</div>
      </td>

      <td className="py-3 px-2 font-mono text-xs text-fg-muted">
        {formatPrice(entry.cost_basis)}
      </td>

      {/* Current / exit */}
      <td className="py-3 px-2 font-mono text-xs text-fg-muted">
        {entry.status === "open"
          ? formatPrice(entry.current_price)
          : formatPrice(entry.exit_price)}
      </td>

      {/* P&L */}
      <td className="py-3 px-2 font-mono text-xs">
        {pnl != null ? (
          <div>
            <div className={signalTone(pnl)}>
              {deltaGlyph(pnl)} {pnl >= 0 ? "+" : ""}
              {formatPrice(Math.abs(pnl)).replace("$", pnl < 0 ? "-$" : "$")}
            </div>
            <div className={cn("text-xs", signalTone(pct))}>
              {formatPercent(pct, { sign: true })}
            </div>
          </div>
        ) : (
          <span className="text-fg-subtle">—</span>
        )}
      </td>

      {/* Plan */}
      <td className="py-3 px-2 font-mono text-xs text-fg-muted">
        {hasPlan ? (
          <div>
            {entry.stop_loss != null ? (
              <div className="text-fg-subtle">
                stop {formatPrice(entry.stop_loss)}
              </div>
            ) : null}
            {entry.target_price != null ? (
              <div className="text-fg-subtle">
                tgt {formatPrice(entry.target_price)}
              </div>
            ) : null}
          </div>
        ) : (
          <span className="text-signal-warn" title="No stop loss or target set">
            no plan
          </span>
        )}
      </td>

      {/* Date */}
      <td className="py-3 px-2 font-mono text-[10px] text-fg-subtle">
        {entry.status === "open"
          ? entry.entry_date
            ? formatDate(entry.entry_date)
            : "—"
          : entry.exit_date
            ? formatDate(entry.exit_date)
            : "—"}
      </td>

      {/* Actions */}
      <td className="py-3 pl-2 pr-4">
        <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {entry.status === "open" ? (
            <IconBtn onClick={() => onClose(entry)} label="Close position">
              <Check className="h-3 w-3" />
            </IconBtn>
          ) : null}
          <IconBtn onClick={() => onEdit(entry)} label="Edit">
            <Edit2 className="h-3 w-3" />
          </IconBtn>
          <IconBtn
            onClick={() => onDelete(entry)}
            label="Delete"
            danger
          >
            <Trash2 className="h-3 w-3" />
          </IconBtn>
        </div>
      </td>
    </tr>
  );
}

function IconBtn({
  children,
  onClick,
  label,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-6 w-6 items-center justify-center rounded text-fg-subtle transition-colors",
        "hover:bg-surface-hover",
        danger ? "hover:text-signal-down" : "hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}
