"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CATEGORIES, MONTHS, average, bandOf, ADMIN_BAND, fmtScore } from "@/lib/scoring";
import { BandChip, StatusChip, Spinner, EmptyState } from "@/components/ui";
import { Avatar } from "@/components/photo";

type Assignment = { id: number; pod: string; clients: string[] };
type Csm = {
  id: number;
  name: string;
  title: string;
  photo?: string | null;
  assignments: Assignment[];
};
type KamEval = {
  id: number;
  csm_user_id: number;
  scores: Record<string, number>;
  status: string;
  ceo_note: string;
};

const THIS_YEAR = new Date().getFullYear();
const YEARS = [THIS_YEAR - 1, THIS_YEAR, THIS_YEAR + 1];

export default function KamScoringPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [csms, setCsms] = useState<Csm[] | null>(null);
  const [evals, setEvals] = useState<Map<number, KamEval>>(new Map());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [csmRes, evalRes] = await Promise.all([
      fetch("/api/kam/csms").then((r) => r.json()),
      fetch(`/api/kam-evaluations?year=${year}&month=${month}`).then((r) => r.json()),
    ]);
    setCsms(csmRes.csms || []);
    const map = new Map<number, KamEval>();
    for (const e of evalRes.evaluations || []) map.set(e.csm_user_id, e);
    setEvals(map);
    setLoading(false);
  }, [year, month]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Score My CSMs</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Score each CSM you work with, across the same six categories the
            Director uses. Your score is submitted to the CEO for approval and
            compared against the CSM&rsquo;s own self-evaluation.
          </p>
        </div>
        <div className="flex gap-2">
          <div>
            <label className="label">Month</label>
            <select className="input !w-40" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
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

      {loading || !csms ? (
        <Spinner />
      ) : csms.length === 0 ? (
        <EmptyState
          title="No CSMs are assigned to you yet"
          hint="Ask the Director of Client Success to link you as the KAM on a POD assignment."
        />
      ) : (
        <div className="space-y-5">
          {csms.map((c) => (
            <KamEvalCard
              key={`${c.id}-${year}-${month}`}
              csm={c}
              year={year}
              month={month}
              existing={evals.get(c.id)}
              onSaved={load}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function KamEvalCard({
  csm,
  year,
  month,
  existing,
  onSaved,
}: {
  csm: Csm;
  year: number;
  month: number;
  existing?: KamEval;
  onSaved: () => void;
}) {
  const [scores, setScores] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const c of CATEGORIES) {
      const v = existing?.scores?.[c.key];
      init[c.key] = typeof v === "number" ? String(v) : "";
    }
    return init;
  });
  const [busy, setBusy] = useState<null | "save" | "submit">(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const status = existing?.status || "none";
  const locked = status === "approved";

  const numericScores = useMemo(() => {
    const out: Record<string, number> = {};
    for (const c of CATEGORIES) {
      const v = parseFloat(scores[c.key]);
      if (!Number.isNaN(v)) out[c.key] = v;
    }
    return out;
  }, [scores]);

  const avg = average(numericScores as any);
  const band = avg !== null ? bandOf(avg) : null;

  async function save(action: "save" | "submit") {
    setBusy(action);
    setMsg(null);
    const res = await fetch("/api/kam-evaluations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csmUserId: csm.id, year, month, scores: numericScores, action }),
    });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) {
      setMsg({ ok: false, text: data.error || "Could not save" });
      return;
    }
    setMsg({ ok: true, text: action === "submit" ? "Submitted to the CEO for approval." : "Draft saved." });
    onSaved();
  }

  return (
    <section className="card p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Avatar name={csm.name} photo={csm.photo} size={48} />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-ink">{csm.name}</h2>
              <span className="chip bg-accent/10 text-accent">{csm.title}</span>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {csm.assignments.map((a) => (
                <div key={a.id} className="rounded-lg border border-surface-line bg-surface-alt px-2.5 py-1.5 text-xs">
                  <span className="font-bold text-accent">{a.pod}</span>
                  <div className="mt-0.5 text-ink-muted">{(a.clients || []).join(", ") || "No clients listed"}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusChip status={status} />
          {avg !== null && band && <BandChip band={band} label={`${fmtScore(avg)} · ${ADMIN_BAND[band].label}`} />}
        </div>
      </div>

      {status === "denied" && existing?.ceo_note && (
        <p className="mb-4 rounded-lg bg-band-criticalBg px-3 py-2 text-sm text-band-critical">
          <span className="font-bold">CEO denied this evaluation:</span> {existing.ceo_note}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {CATEGORIES.map((c) => (
          <div key={c.key}>
            <label className="label">{c.label}</label>
            <input
              className="input text-center font-bold"
              type="number"
              min={0}
              max={10}
              step={0.5}
              inputMode="decimal"
              placeholder="0–10"
              disabled={locked}
              value={scores[c.key]}
              onChange={(e) => setScores((s) => ({ ...s, [c.key]: e.target.value }))}
            />
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-ink-muted">
          {locked
            ? "Approved by the CEO — this evaluation is locked."
            : status === "submitted"
            ? "Awaiting CEO review. Saving again will pull it back to draft."
            : "Scores are out of 10. Submit when all six categories are scored."}
        </div>
        {!locked && (
          <div className="flex gap-2">
            <button className="btn-secondary" disabled={busy !== null} onClick={() => save("save")}>
              {busy === "save" ? "Saving…" : "Save draft"}
            </button>
            <button className="btn-primary" disabled={busy !== null} onClick={() => save("submit")}>
              {busy === "submit" ? "Submitting…" : "Submit for approval"}
            </button>
          </div>
        )}
      </div>

      {msg && (
        <p
          className={
            "mt-3 rounded-lg px-3 py-2 text-sm " +
            (msg.ok ? "bg-band-goodBg text-band-good" : "bg-band-criticalBg text-band-critical")
          }
        >
          {msg.text}
        </p>
      )}
    </section>
  );
}
