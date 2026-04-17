export type AIProvider = "anthropic" | "openrouter";

export type EffectiveBlock = {
  provider: AIProvider;
  model_briefing: string;
  model_classifier: string;
};

export type OverridesBlock = {
  provider: AIProvider | null;
  model_briefing: string | null;
  model_classifier: string | null;
};

export type EnvBlock = {
  anthropic_key_configured: boolean;
  openrouter_key_configured: boolean;
};

export type DefaultsBlock = {
  anthropic: Record<string, string>;
  openrouter: Record<string, string>;
};

export type AISettings = {
  effective: EffectiveBlock;
  overrides: OverridesBlock;
  env: EnvBlock;
  defaults: DefaultsBlock;
};

export type UpdateAISettingsBody = {
  provider?: AIProvider | null;
  model_briefing?: string | null;
  model_classifier?: string | null;
};
