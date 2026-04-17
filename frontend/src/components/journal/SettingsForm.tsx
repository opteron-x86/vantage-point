"use client";

import { useEffect, useState, type FormEvent } from "react";

import { Button, Input, Label, Textarea } from "@/components/ui";
import { useSettings, useUpdateSettings } from "@/lib/hooks/useSettings";

type Props = {
  onDone: () => void;
};

/**
 * Account settings form.
 *
 * Two fields, both optional:
 *   - brokerage_cash: how much cash is available in the user's trading account
 *   - risk_profile_note: freeform context about what kind of money this is
 *
 * Both flow into the AI's get_account_context tool so it can give grounded
 * position-sizing advice. The scope is deliberately narrow — this is trading
 * context, not broader financial planning.
 */
export function SettingsForm({ onDone }: Props) {
  const { data, isLoading } = useSettings();
  const update = useUpdateSettings();

  const [cash, setCash] = useState("");
  const [risk, setRisk] = useState("");

  useEffect(() => {
    if (data) {
      setCash(data.brokerage_cash != null ? String(data.brokerage_cash) : "");
      setRisk(data.risk_profile_note ?? "");
    }
  }, [data]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await update.mutateAsync({
      brokerage_cash: cash ? Number(cash) : null,
      risk_profile_note: risk.trim() || null,
    });
    onDone();
  }

  if (isLoading) {
    return <div className="py-4 text-xs text-fg-subtle">Loading…</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Brokerage cash available ($)</Label>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={cash}
          onChange={(e) => setCash(e.target.value)}
          placeholder="e.g. 5000"
        />
        <p className="text-[11px] text-fg-subtle">
          Helps the AI give realistic position-sizing advice. Update manually
          when it changes significantly.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label>Risk profile note</Label>
        <Textarea
          rows={3}
          value={risk}
          onChange={(e) => setRisk(e.target.value)}
          placeholder="e.g. Taxable brokerage, small % of net worth, can afford to be aggressive."
          maxLength={500}
        />
        <p className="text-[11px] text-fg-subtle">
          One sentence the AI will respect when giving advice. Kept short on
          purpose — the important thing is the signal, not the detail.
        </p>
      </div>

      <div className="rounded border border-border-subtle bg-bg-sunken p-3 text-[11px] text-fg-subtle">
        Scope: this app knows about your <span className="text-fg-muted">brokerage trading account</span>{" "}
        only. It doesn&apos;t model 401k, IRA, or broader financial planning.
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" type="button" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" loading={update.isPending}>
          Save
        </Button>
      </div>
    </form>
  );
}
