"use client";

import { KAM_PARAMS, KamParamKey } from "@/lib/scoring";

// A row of tap-to-select pills for one KAM_PARAMS entry (no free text).
export function ScalePicker({
  paramKey,
  value,
  onChange,
  disabled,
}: {
  paramKey: KamParamKey;
  value: number | undefined;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const param = KAM_PARAMS.find((p) => p.key === paramKey)!;
  return (
    <div className="flex flex-wrap gap-1.5">
      {param.scale.map((s) => (
        <button
          key={s.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(s.value)}
          className={
            "rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 " +
            (value === s.value
              ? "border-accent bg-accent text-accent-ink"
              : "border-surface-line bg-surface-alt text-ink-soft hover:border-accent/50 hover:text-accent")
          }
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
