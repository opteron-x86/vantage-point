// Mirrors backend/app/schemas/journal.py — keep in sync.

export type EntryPrecision = "exact" | "approximate" | "backfilled";
export type EntryStatus = "open" | "closed";

export type JournalEntry = {
  id: number;
  ticker: string;
  shares: number;
  cost_basis: number;
  price_per_share: number | null;

  entry_date: string | null;
  entry_precision: EntryPrecision;

  thesis: string | null;
  stop_loss: number | null;
  target_price: number | null;
  time_horizon: string | null;

  status: EntryStatus;
  exit_date: string | null;
  exit_price: number | null;
  exit_notes: string | null;

  notes: string | null;
  created_at: string;
  updated_at: string;

  // Derived
  current_price: number | null;
  market_value: number | null;
  unrealized_pnl: number | null;
  realized_pnl: number | null;
  pct_change: number | null;
};

export type JournalAggregates = {
  count: number;
  total_cost_basis: number;
  total_market_value: number | null;
  unrealized_pnl: number | null;
  pct_change: number | null;
};

export type OpenPositions = {
  positions: JournalEntry[];
  aggregates: JournalAggregates;
};

export type CreateEntryBody = {
  ticker: string;
  shares: number;
  cost_basis: number;
  entry_date?: string | null;
  entry_precision?: EntryPrecision;
  thesis?: string | null;
  stop_loss?: number | null;
  target_price?: number | null;
  time_horizon?: string | null;
  notes?: string | null;
};

export type UpdateEntryBody = Partial<
  Omit<CreateEntryBody, "ticker"> & {
    ticker?: never; // can't change ticker
  }
>;

export type CloseEntryBody = {
  exit_price: number;
  exit_date?: string | null;
  exit_notes?: string | null;
};
