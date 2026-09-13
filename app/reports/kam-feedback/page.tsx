"use client";

import { useEffect, useMemo, useState } from "react";
import { MONTHS, QUARTERS, KAM_PARAMS, kamScaleLabel, kamFeedbackScore, mean } from "@/lib/scoring";
import { Spinner, EmptyState } from "@/components/ui";
import { usePersistedYear } from "@/lib/useMonthYear";

type Kam = { id: number; name: string; active: boolean };
type Feedback = {
  csm_user_id: number;
  kam_user_id: number;
  month: number;
  scores: Record<string, number>;
  csm_name: string;
};

const THIS_YEAR = new Date().getFullYear();
const YEARS = [THIS_YEAR - 1, THIS_YEAR, THIS_YEAR + 1];

export default function KamFeedbackPage() {
  const [kams, setKams] = useState<Kam[] | null>(null);
  const [kamId, setKamId] = useState<number | null>(null);
  const [year, setYear] = usePersistedYear();
  const [feedback, setFeedback] = useState<Feedback[] | null>(null);

  useEffect(() => {
    fetch("/api/roster")
      .then((r) => r.json())
      .then((d) => {
        const list = (d.kams || []).filter((k: Kam) => k.active);
        setKams(list);
        if (list.length > 0) setKamId(list[0].id);
      });
  }, []);

  useEffect(() => {
    if (!kamId) return;
    setFeedback(null);
    fetch(`/api/kam-feedback?year=${year}&kamUserId=${kamId}`)
      .then((r) => r.json())
      .then((d) => setFeedback(d.feedback || []));
  }, [kamId, year]);

  const rollup = useMemo(() => {
    if (!feedback) return null;
    const byQuarter = QUARTERS.map((q) => {
      const rows = feedback.filter((f) => q.months.includes(f.month));
      const vals = rows.map((r) => kamFeedbackScore(r.scores)).filter((v): v is number => v !== null);
      return { name: q.name, score: vals.length ? mean(vals) : null };
    });
    const annualVals = feedback.map((r) => kamFeedbackScore(r.scores)).filter((v): v is number => v !== null);
    return { byQuarter, annual: annualVals.length ? mean(annualVals) : null };
  }, [feedback]);

  const kam = kams?.find((k) => k.id === kamId);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">KAM Feedback</h1>
          <p className="mt-1 text-sm text-ink-soft">
            How CSMs rate the KAM they work with — coordination, collaboration,
            leadership, knowledge sharing, and meeting availability. Never
            shown to the KAM themselves.
          </p>
          <ScaleLegend />
        </div>
        <div className="flex gap-2">
          <div>
            <label className="label">KAM</label>
            <select className="input !w-52" value={kamId ?? ""} onChange={(e) => setKamId(Number(e.target.value))}>
              {(kams || []).map((k) => (
                <option key={k.id} value={k.id}>{k.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Year</label>
            <select className="input !w-28" value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {!kams ? (
        <Spinner />
      ) : kams.length === 0 ? (
        <EmptyState title="No KAMs on the roster yet" hint="KAM accounts are created automatically once a CSM is assigned to one." />
      ) : !feedback ? (
        <Spinner />
      ) : (
        <div className="space-y-5">
          <section className="card p-6">
            <h2 className="mb-4 text-lg font-bold text-ink">
              {kam?.name} — quarterly &amp; annual rollup
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {rollup?.byQuarter.map((q) => (
                <div key={q.name} className="rounded-xl border border-surface-line bg-surface-alt p-4 text-center">
                  <div className="text-xs font-semibold uppercase text-ink-muted">{q.name}</div>
                  <div className="mt-1 text-xl font-bold text-accent">
                    {q.score === null ? "—" : `${Math.round(q.score * 100)}%`}
                  </div>
                </div>
              ))}
              <div className="rounded-xl border border-accent/40 bg-accent/10 p-4 text-center">
                <div className="text-xs font-semibold uppercase text-accent">Annual</div>
                <div className="mt-1 text-xl font-bold text-accent">
                  {rollup?.annual === null || rollup?.annual === undefined ? "—" : `${Math.round(rollup.annual * 100)}%`}
                </div>
              </div>
            </div>
            <p className="mt-3 text-xs text-ink-muted">
              Percentage is each rating normalised to its own scale and averaged — a
              rough &ldquo;how positively rated&rdquo; reading, not a 0–10 score.
            </p>
          </section>

          <section className="card overflow-x-auto p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-ink">Month by month</h2>
              <ScaleLegend compact />
            </div>
            {feedback.length === 0 ? (
              <EmptyState title="No feedback submitted yet for this KAM" />
            ) : (
              <table className="w-full min-w-[800px] text-sm">
                <thead>
                  <tr className="border-b border-surface-line text-left text-xs uppercase tracking-wide text-ink-muted">
                    <th className="pb-2 pr-4">Month</th>
                    <th className="pb-2 pr-4">CSM</th>
                    {KAM_PARAMS.map((p) => (
                      <th key={p.key} className="pb-2 pr-4">{p.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {feedback
                    .slice()
                    .sort((a, b) => a.month - b.month)
                    .map((f) => (
                      <tr key={`${f.month}-${f.csm_user_id}`} className="border-b border-surface-line/60 last:border-0">
                        <td className="py-2.5 pr-4 font-semibold">{MONTHS[f.month - 1]}</td>
                        <td className="py-2.5 pr-4 text-ink-soft">{f.csm_name}</td>
                        {KAM_PARAMS.map((p) => (
                          <td key={p.key} className="py-2.5 pr-4 font-semibold text-ink">
                            {kamScaleLabel(p.key, f.scores?.[p.key])}
                          </td>
                        ))}
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

// Explains what the CSM's plain 0 / 5 / 10 rating of their KAM means — shown
// wherever those numbers are displayed, since they aren't self-explanatory
// out of context.
function ScaleLegend({ compact }: { compact?: boolean }) {
  const items: { value: string; label: string; cls: string }[] = [
    { value: "0", label: "Bad", cls: "bg-band-criticalBg text-band-critical" },
    { value: "5", label: "Moderate", cls: "bg-band-warnBg text-band-warn" },
    { value: "10", label: "Excellent", cls: "bg-band-goodBg text-band-good" },
  ];
  return (
    <div className={"flex flex-wrap items-center gap-2 " + (compact ? "" : "mt-2")}>
      {!compact && <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Scale:</span>}
      {items.map((i) => (
        <span key={i.value} className={"chip " + i.cls}>
          {i.value} = {i.label}
        </span>
      ))}
    </div>
  );
}
