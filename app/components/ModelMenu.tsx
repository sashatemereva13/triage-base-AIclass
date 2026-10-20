"use client";

import { useEffect, useState } from "react";

type ModelMenuProps = {
  value: string;
  onChange: (model: string) => void;
  disabled?: boolean;
};

export function ModelMenu({ value, onChange, disabled = false }: ModelMenuProps) {
  const [models, setModels] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/models")
      .then(async (response) => {
        const payload: unknown = await response.json();
        if (!response.ok || typeof payload !== "object" || payload === null ||
          !("models" in payload) || !Array.isArray(payload.models) ||
          !payload.models.every((model) => typeof model === "string")) {
          throw new Error("Could not load configured models.");
        }
        return payload.models as string[];
      })
      .then((available) => {
        if (cancelled) return;
        setModels(available);
        if (!available.includes(value) && available[0]) onChange(available[0]);
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Could not load models.");
        }
      });
    return () => { cancelled = true; };
  }, [onChange, value]);

  return (
    <>
      <label htmlFor="llm-model">LLM MODEL</label>
      <select
        id="llm-model"
        className="triage-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled || models.length === 0}
      >
        {models.map((model) => <option key={model} value={model}>{model}</option>)}
      </select>
      {models.length === 1 && <p className="model-menu-hint">Only one model is configured. Add more IDs to <code>LLM_MODELS</code> to compare models.</p>}
      {error && <p className="triage-error" role="alert">{error}</p>}
    </>
  );
}
