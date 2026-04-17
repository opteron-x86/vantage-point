export type UserInfo = {
  id: number;
  username: string;
  is_active: boolean;
  created_at: string;
};

export type TokenResponse = {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
};

export type BootstrapStatus = {
  available: boolean;
  reason: string | null;
};

export type BootstrapBody = {
  token: string;
  username: string;
  password: string;
};
