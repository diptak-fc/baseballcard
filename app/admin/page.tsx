"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CATEGORIES,
  MONTHS,
  average,
  bandOf,
  ADMIN_BAND,
  fmtScore,
} from "@/lib/scoring";
import { BandChip, StatusChip, Spinner, EmptyState } from "@/components/ui";

type Assignment = { id: number; pod: string; kam: string; clients: string[] };
type Person = {
  id: number;
  name: string;
  email: string;
  title: string;
  active: boolean;
  assignments: Assignment[];
};
type Evaluation = {
  id: number;
  user_id: number;
  scores: Record<string, number>;
  feedback: string;
  status: string;
  ceo_note: string;
};

const THIS_YEAR = new Date().getFullYear();
const YEARS = [THIS_YEAR - 1, THIS_YEAR, THIS_YEAR + 1];

export default function MonthlyScoringPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [people, setPeople] = useState<Person[] | null>(null);
  const [evals, setEvals] = useState<Map<number, Evaluation>>(new Map());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [rosterRes, evalRes] = await Promise.all([
      fetch("/api/roster").then((r) => r.json()),
      fetch(`/api/evaluations?year=${year}&month=${month}`).then((r) => r.json()),
    ]);
    setPeople((rosterRes.people || []).filter((p: Person) => p.active));
    const map = new Map<number, Evaluation>();
    for (const e of evalRes.evaluations || []) map.set(e.user_id, e);
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
          <h1 className="text-2xl font-bold text-navy-800">Monthly Scoring</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Score each CSM across the six categories, add your feedback, then
            submit to the CEO for approval.
          </p>
        </div>
        <div className="flex gap-2">
          <div>
            <label className="label">Month</label>
            <select
              className="input !w-40"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Year</label>
            <select
              className="input !w-28"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading || !people ? (
        <Spinner />
      ) : people.length === 0 ? (
        <EmptyState
          title="No CSMs on the roster yet"
          hint="Add your Client Success Managers in the Roster tab first."
        />
      ) : (
        <div className="space-y-5">
          {people.map((p) => (
            <EvalCard
              key={`${p.id}-${year}-${month}`}
              person={p}
              year={year}
              month={month}
              existing={evals.get(p.id)}
              onSaved={load}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EvalCard({
  person,
  year,
  month,
  existing,
  onSaved,
}: {
  person: Person;
  year: number;
  month: number;
  existing?: Evaluation;
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
  const [feedback, setFeedback] = useState(existing?.feedback || "");
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
    const res = await fetch("/api/evaluations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: person.id,
        year,
        month,
        scores: numericScores,
        feedback,
        action,
      }),
    });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) {
      setMsg({ ok: false, text: data.error || "Could not save" });
      return;
    }
    setMsg({
      ok: true,
      text: action === "submit" ? "Submitted to the CEO for approval." : "Draft saved.",
    });
    onSaved();
  }

  return (
    <section className="card p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-navy-100 text-base font-bold text-navy-700">
            {initials(person.name)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-navy-800">{person.name}</h2>
              <span className="chip bg-navy-50 text-navy-700">{person.title}</span>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {person.assignments.map((a) => (
                <div
                  key={a.id}
                  className="rounded-lg border border-surface-line bg-surface-alt px-2.5 py-1.5 text-xs"
                >
                  <span className="font-bold text-navy-700">{a.pod}</span>
                  <span className="mx-1.5 text-ink-muted">·</span>
                  <span className="font-semibold text-ink-soft">KAM: {a.kam}</span>
                  <div className="mt-0.5 text-ink-muted">
                    {(a.clients || []).join(", ") || "No clients listed"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusChip status={status} />
          {avg !== null && band && (
            <BandChip band={band} label={`${fmtScore(avg)} · ${ADMIN_BAND[band].label}`} />
          )}
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
              onChange={(e) =>
                setScores((s) => ({ ...s, [c.key]: e.target.value }))
              }
            />
          </div>
        ))}
      </div>

      <div className="mt-4">
        <label className="label">Client Success Director feedback</label>
        <textarea
          className="input min-h-[72px]"
          placeholder={`Feedback for ${person.name} — what went well, what to improve…`}
          disabled={locked}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
        />
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
            <button
              className="btn-secondary"
              disabled={busy !== null}
              onClick={() => save("save")}
            >
              {busy === "save" ? "Saving…" : "Save draft"}
            </button>
            <button
              className="btn-primary"
              disabled={busy !== null}
              onClick={() => save("submit")}
            >
              {busy === "submit" ? "Submitting…" : "Submit for approval"}
            </button>
          </div>
        )}
      </div>

      {msg && (
        <p
          className={
            "mt-3 rounded-lg px-3 py-2 text-sm " +
            (msg.ok
              ? "bg-band-goodBg text-band-good"
              : "bg-band-criticalBg text-band-critical")
          }
        >
          {msg.text}
        </p>
      )}
    </section>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
