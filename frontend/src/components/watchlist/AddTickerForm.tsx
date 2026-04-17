"use client";

import { Plus } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Button, Input } from "@/components/ui";

type Props = {
  onAdd: (ticker: string) => Promise<void> | void;
  disabled?: boolean;
};

export function AddTickerForm({ onAdd, disabled }: Props) {
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const ticker = value.trim().toUpperCase();
    if (!ticker) return;
    setSubmitting(true);
    try {
      await onAdd(ticker);
      setValue("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex items-center gap-1.5 p-3">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value.toUpperCase())}
        placeholder="Add ticker…"
        maxLength={10}
        disabled={disabled || submitting}
        className="h-7 text-xs uppercase tracking-wide"
        aria-label="Ticker symbol"
      />
      <Button
        type="submit"
        size="sm"
        variant="secondary"
        disabled={!value.trim() || disabled}
        loading={submitting}
        aria-label="Add ticker"
        className="px-2"
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </form>
  );
}
