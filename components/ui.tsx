"use client";

import { BandKey, fmtScore, scoreChipBand } from "@/lib/scoring";

export const BAND_STYLES: Record<BandKey, { fg: string; bg: string }> = {
  critical: { fg: "text-band-critical", bg: "bg-band-criticalBg" },
  warn: { fg: "text-band-warn", bg: "bg-band-warnBg" },
  good: { fg: "text-band-good", bg: "bg-band-goodBg" },
  top: { fg: "text-band-top", bg: "bg-band-topBg" },
};

const BAND_ICON: Record<BandKey, string> = {
  critical: "▼",
  warn: "◆",
  good: "●",
  top: "★",
};

export function BandChip({ band, label }: { band: BandKey; label: string }) {
  const s = BAND_STYLES[band];
  return (
    <span className={`chip ${s.bg} ${s.fg}`}>
      <span aria-hidden>{BAND_ICON[band]}</span>
      {label}
    </span>
  );
}

export function StatusChip({ status }: { status: string }) {
  const map: Record<string, { text: string; cls: string }> = {
    draft: { text: "Draft", cls: "bg-surface-alt text-ink-soft" },
    submitted: { text: "Awaiting CEO", cls: "bg-band-warnBg text-band-warn" },
    approved: { text: "Approved", cls: "bg-band-goodBg text-band-good" },
    denied: { text: "Denied", cls: "bg-band-criticalBg text-band-critical" },
    none: { text: "Not scored", cls: "bg-surface-alt text-ink-muted" },
  };
  const m = map[status] || map.none;
  return <span className={`chip ${m.cls}`}>{m.text}</span>;
}

// Baseball-card style score tile (mirrors the CS Dash mockup)
export function ScoreTile({
  label,
  value,
}: {
  label: string;
  value: number | null | undefined;
}) {
  const has = typeof value === "number";
  const band = has ? scoreChipBand(value as number) : null;
  const s = band ? BAND_STYLES[band] : null;
  return (
    <div
      className={
        "flex flex-col items-center justify-center rounded-xl border border-surface-line px-2 py-3 text-center " +
        (s ? s.bg : "bg-surface-alt")
      }
    >
      <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
        {label}
      </div>
      <div className={"mt-1 text-xl font-bold " + (s ? s.fg : "text-ink-muted")}>
        {has ? `${fmtScore(value)}` : "—"}
        {has && <span className="text-xs font-semibold text-ink-muted">/10</span>}
      </div>
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="card flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="text-sm font-semibold text-ink-soft">{title}</div>
      {hint && <div className="mt-1 max-w-md text-xs text-ink-muted">{hint}</div>}
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-16 text-sm text-ink-muted">
      <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-navy-200 border-t-navy-600" />
      Loading…
    </div>
  );
}
