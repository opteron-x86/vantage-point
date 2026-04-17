"use client";

import { useEffect, useState, type FormEvent } from "react";

import { Button, Input, Label, Select } from "@/components/ui";
import {
  useAISettings,
  useUpdateAISettings,
} from "@/lib/hooks/useAISettings";
import type { AIProvider } from "@/lib/types/ai-settings";
import { cn } from "@/lib/utils/cn";

/**
 * AI provider and model selection.
 *
 * The effective values cascade DB → env → defaults. Leaving a field blank
 * clears the DB override so it falls back to env or default. API keys are
 * never collected here — they live in environment variables.
 */
export function AISettingsForm() {
  const { data, isLoading } = useAISettings();
  const update = useUpdateAISettings();

  const [provider, setProvider] = useState<AIProvider | "">("");
  const [modelBriefing, setModelBriefing] = useState("");
  const [modelClassifier, setModelClassifier] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!data) return;
    setProvider(data.overrides.provider ?? "");
    setModelBriefing(data.overrides.model_briefing ?? "");
    setModelClassifier(data.overrides.model_classifier ?? "");
  }, [data]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    try {
      await update.mutateAsync({
        provider: provider || null,
        model_briefing: modelBriefing.trim() || null,
        model_classifier: modelClassifier.trim() || null,
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    }
  }

  if (isLoading || !data) {
    return <div className="py-4 text-xs text-fg-subtle">Loading…</div>;
  }

  const providerKeyMissing =
    (provider === "anthropic" && !data.env.anthropic_key_configured) ||
    (provider === "openrouter" && !data.env.openrouter_key_configured);

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Environment status — read-only */}
      <section className="space-y-2">
        <h3 className="text-[11px] font-medium uppercase tracking-[0.15em] text-fg-subtle">
          Environment
        </h3>
        <div className="grid grid-cols-2 gap-2 rounded border border-border-subtle bg-bg-sunken p-3">
          <KeyStatus
            label="Anthropic API key"
            configured={data.env.anthropic_key_configured}
          />
          <KeyStatus
            label="OpenRouter API key"
            configured={data.env.openrouter_key_configured}
          />
        </div>
        <p className="text-[10px] text-fg-subtle">
          API keys are set as environment variables on the server. To change
          them, update the backend&apos;s env vars and redeploy.
        </p>
      </section>

      {/* Provider */}
      <section className="space-y-2">
        <Label htmlFor="provider">Provider</Label>
        <Select
          id="provider"
          value={provider}
          onChange={(e) => setProvider(e.target.value as AIProvider | "")}
        >
          <option value="">
            Use environment default ({data.effective.provider})
          </option>
          <option value="anthropic">Anthropic</option>
          <option value="openrouter">OpenRouter</option>
        </Select>
        {providerKeyMissing ? (
          <p className="text-[11px] text-signal-down">
            Selected provider has no API key configured — calls will fail
            until the key is set.
          </p>
        ) : null}
      </section>

      {/* Model overrides */}
      <section className="space-y-3">
        <h3 className="text-[11px] font-medium uppercase tracking-[0.15em] text-fg-subtle">
          Model overrides
        </h3>

        <ModelField
          id="model-briefing"
          label="Briefing / chat"
          value={modelBriefing}
          onChange={setModelBriefing}
          placeholder={data.effective.model_briefing}
          defaults={{
            anthropic: data.defaults.anthropic.briefing,
            openrouter: data.defaults.openrouter.briefing,
          }}
        />

        <ModelField
          id="model-classifier"
          label="Classifier / titles"
          value={modelClassifier}
          onChange={setModelClassifier}
          placeholder={data.effective.model_classifier}
          defaults={{
            anthropic: data.defaults.anthropic.classifier,
            openrouter: data.defaults.openrouter.classifier,
          }}
        />

        <p className="text-[10px] text-fg-subtle">
          Leave blank to use the default for the selected provider.
        </p>
      </section>

      {error ? (
        <p className="text-xs text-signal-down" role="alert">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="text-xs text-signal-up" role="status">
          Saved.
        </p>
      ) : null}

      <Button type="submit" loading={update.isPending}>
        Save
      </Button>
    </form>
  );
}

function KeyStatus({
  label,
  configured,
}: {
  label: string;
  configured: boolean;
}) {
  return (
    <div className="flex items-center justify-between font-mono text-[11px]">
      <span className="text-fg-muted">{label}</span>
      <span
        className={cn(
          "flex items-center gap-1.5",
          configured ? "text-signal-up" : "text-fg-subtle",
        )}
      >
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            configured ? "bg-signal-up" : "bg-fg-subtle",
          )}
        />
        {configured ? "configured" : "not set"}
      </span>
    </div>
  );
}

function ModelField({
  id,
  label,
  value,
  onChange,
  placeholder,
  defaults,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  defaults: { anthropic: string; openrouter: string };
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="font-mono text-xs"
      />
      <div className="flex gap-3 text-[10px] text-fg-subtle">
        <span>
          Anthropic default:{" "}
          <code className="font-mono text-fg-muted">{defaults.anthropic}</code>
        </span>
        <span>
          OpenRouter default:{" "}
          <code className="font-mono text-fg-muted">{defaults.openrouter}</code>
        </span>
      </div>
    </div>
  );
}
