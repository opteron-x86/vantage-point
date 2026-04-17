export type UserSettings = {
  brokerage_cash: number | null;
  risk_profile_note: string | null;
  updated_at: string;
};

export type UpdateSettingsBody = {
  brokerage_cash?: number | null;
  risk_profile_note?: string | null;
};
