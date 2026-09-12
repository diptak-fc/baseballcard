"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CATEGORIES,
  MONTHS,
  QUARTERS,
  KAM_PARAMS,
  MAX_NOTE_LEN,
  average,
  mean,
  bandOf,
  CSM_BAND,
  fmtScore,
} from "@/lib/scoring";
import { BandChip, ScoreTile, Spinner, EmptyState } from "@/components/ui";
import { Avatar, PhotoControl } from "@/components/photo";
import { ScoreBarChart, TrendLineChart } from "@/components/charts";
import { ScalePicker } from "@/components/kamRating";

type Assignment = { id: number; pod: string; kam: string; kam_user_id: number | null; clients: string[] };
type Me = { id: number; name: string; title: string; photo?: string | null };
type Evaluation = {
  month: number;
  scores: Record<string, number>;
  feedback: string;
};

const THIS_YEAR = new Date().getFullYear();
const YEARS = [THIS_YEAR - 1, THIS_YEAR];

type Tab = "monthly" | "quarterly" | "yearly" | "self" | "kams";

export default function MyCardPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [year, setYear] = useState(THIS_YEAR);
  const [evals, setEvals] = useState<Evaluation[] | null>(null);
  const [tab, setTab] = useState<Tab>("monthly");
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  function reloadMe() {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => {
        setMe(d.user);
        setAssignments(d.assignments || []);
      });
  }

  useEffect(() => {
    reloadMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setEvals(null);
    fetch(`/api/evaluations?year=${year}`)
      .then((r) => r.json())
      .then((d) => setEvals(d.evaluations || []));
  }, [year]);

  const monthly = useMemo(() => {
    const map = new Map<number, number>();
    for (const e of evals || []) {
      const a = average(e.scores as any);
      if (a !== null) map.set(e.month, a);
    }
    return map;
  }, [evals]);

  if (!me || !evals) return <Spinner />;

  const latestScored = evals.length
    ? Math.max(...evals.map((e) => e.month))
    : null;

  return (
    <div>
      {/* Profile header */}
      <section className="card mb-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar name={me.name} photo={me.photo} size={56} />
            <div>
              <h1 className="text-xl font-bold text-ink">{me.name}</h1>
              <div className="text-sm text-ink-muted">{me.title} · Full Circle Agency</div>
              <div className="mt-1">
                <PhotoControl hasPhoto={!!me.photo} onChanged={reloadMe} />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {assignments.map((a) => (
              <div
                key={a.id}
                className="rounded-lg border border-surface-line bg-surface-alt px-2.5 py-1.5 text-xs"
              >
                <span className="font-bold text-accent">{a.pod}</span>
                <span className="mx-1.5 text-ink-muted">·</span>
                <span className="font-semibold text-ink-soft">KAM: {a.kam}</span>
                <div className="mt-0.5 max-w-[260px] text-ink-muted">
                  {(a.clients || []).join(", ")}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tabs + year */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap rounded-xl border border-surface-line bg-surface p-1">
          {(
            [
              ["monthly", "Monthly"],
              ["quarterly", "Quarterly"],
              ["yearly", "Yearly"],
              ["self", "My Self-Evaluation"],
              ["kams", "Rate My KAM(s)"],
            ] as [Tab, string][]
          ).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={
                "rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors " +
                (tab === t ? "bg-accent text-accent-ink" : "text-ink-soft hover:text-accent")
              }
            >
              {label}
            </button>
          ))}
        </div>
        <div>
          <select className="input !w-28" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {tab === "monthly" && (
        <MonthlyTab
          evals={evals}
          month={month}
          setMonth={setMonth}
          latestScored={latestScored}
        />
      )}
      {tab === "quarterly" && <QuarterlyTab monthly={monthly} />}
      {tab === "yearly" && <YearlyTab monthly={monthly} year={year} />}
      {tab === "self" && <SelfEvalTab year={year} />}
      {tab === "kams" && <RateKamsTab year={year} assignments={assignments} />}
    </div>
  );
}

function MonthlyTab({
  evals,
  month,
  setMonth,
  latestScored,
}: {
  evals: Evaluation[];
  month: number;
  setMonth: (m: number) => void;
  latestScored: number | null;
}) {
  const e = evals.find((x) => x.month === month);
  const avg = e ? average(e.scores as any) : null;
  const band = avg !== null ? bandOf(avg) : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <label className="text-sm font-semibold text-ink-soft">Month</label>
        <select className="input !w-44" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
          {MONTHS.map((m, i) => (
            <option key={m} value={i + 1}>{m}</option>
          ))}
        </select>
        {latestScored !== null && !e && (
          <span className="text-xs text-ink-muted">
            Latest published month: {MONTHS[latestScored - 1]}
          </span>
        )}
      </div>

      {!e ? (
        <EmptyState
          title={`No published review for ${MONTHS[month - 1]} yet`}
          hint="Your review appears here once it has been scored by the Director of Client Success and approved by the CEO."
        />
      ) : (
        <section className="card p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-ink">
              {MONTHS[month - 1]} scorecard
            </h2>
            {avg !== null && band && (
              <BandChip band={band} label={`${fmtScore(avg)}/10 · ${CSM_BAND[band]}`} />
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {CATEGORIES.map((c) => (
              <ScoreTile key={c.key} label={c.label} value={e.scores?.[c.key]} />
            ))}
          </div>
          <div className="mt-5 rounded-xl border border-surface-line bg-surface-alt p-4">
            <div className="label !mb-1">Client Success Director feedback</div>
            <p className="text-sm text-ink-soft">
              {e.feedback || "No written feedback for this month."}
            </p>
          </div>
        </section>
      )}
    </div>
  );
}

function QuarterlyTab({ monthly }: { monthly: Map<number, number> }) {
  const quarters = QUARTERS.map((q) => {
    const vals = q.months
      .map((m) => monthly.get(m))
      .filter((v): v is number => typeof v === "number");
    const score = vals.length ? mean(vals) : null;
    const complete = vals.length === 3;
    return { ...q, score, complete, count: vals.length };
  });

  return (
    <div className="space-y-5">
      <section className="card p-6">
        <h2 className="mb-1 text-lg font-bold text-ink">Quarterly averages</h2>
        <p className="mb-4 text-xs text-ink-muted">
          Q1 = Jan–Mar · Q2 = Apr–Jun · Q3 = Jul–Sep · Q4 = Oct–Dec
        </p>
        <ScoreBarChart data={quarters.map((q) => ({ label: q.name, score: q.score }))} height={220} />
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        {quarters.map((q) => {
          const band = q.score !== null && q.complete ? bandOf(q.score) : null;
          return (
            <section key={q.name} className="card p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-ink">{q.name}</h3>
                <span className="text-lg font-bold text-accent">{fmtScore(q.score)}<span className="text-xs font-semibold text-ink-muted">/10</span></span>
              </div>
              <div className="mt-2">
                {band ? (
                  <BandChip band={band} label={CSM_BAND[band]} />
                ) : q.score !== null ? (
                  <span className="text-xs text-ink-muted">
                    {q.count}/3 months published — the quarter&rsquo;s standing is
                    confirmed once all three months are reviewed.
                  </span>
                ) : (
                  <span className="text-xs text-ink-muted">No published reviews yet.</span>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function YearlyTab({ monthly, year }: { monthly: Map<number, number>; year: number }) {
  const data = MONTHS.map((m, i) => ({
    label: m.slice(0, 3),
    score: monthly.get(i + 1) ?? null,
  }));
  const vals = Array.from(monthly.values());
  const annual = mean(vals);
  const complete = monthly.size === 12;
  const band = complete && annual !== null ? bandOf(annual) : null;

  return (
    <div className="space-y-5">
      <section className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-ink">{year} at a glance</h2>
            <p className="mt-1 text-xs text-ink-muted">
              {monthly.size}/12 months published · running average{" "}
              <span className="font-bold text-accent">{fmtScore(annual)}</span>
            </p>
          </div>
          {band && annual !== null && (
            <BandChip band={band} label={`${fmtScore(annual)}/10 · ${CSM_BAND[band]}`} />
          )}
        </div>
        <div className="mt-4">
          <TrendLineChart data={data} />
        </div>
        {!complete && (
          <p className="mt-4 rounded-lg bg-accent/10 px-3 py-2 text-xs text-accent">
            Your annual performance evaluation will be available at the end of
            the year, once reviews for all twelve months are complete.
          </p>
        )}
      </section>
    </div>
  );
}

type SelfEval = {
  month: number;
  scores: Record<string, number>;
  notes: Record<string, string>;
};

function SelfEvalTab({ year }: { year: number }) {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [all, setAll] = useState<SelfEval[] | null>(null);

  function load() {
    setAll(null);
    fetch(`/api/self-evaluations?year=${year}`)
      .then((r) => r.json())
      .then((d) => setAll(d.evaluations || []));
  }

  useEffect(load, [year]);

  const existing = all?.find((e) => e.month === month);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <label className="text-sm font-semibold text-ink-soft">Month</label>
        <select className="input !w-44" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
          {MONTHS.map((m, i) => (
            <option key={m} value={i + 1}>{m}</option>
          ))}
        </select>
      </div>

      {!all ? (
        <Spinner />
      ) : (
        <SelfEvalForm
          key={`${year}-${month}`}
          year={year}
          month={month}
          existing={existing}
          onSaved={load}
        />
      )}
    </div>
  );
}

function SelfEvalForm({
  year,
  month,
  existing,
  onSaved,
}: {
  year: number;
  month: number;
  existing?: SelfEval;
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
  const [notes, setNotes] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const c of CATEGORIES) init[c.key] = existing?.notes?.[c.key] || "";
    return init;
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    const numericScores: Record<string, number> = {};
    for (const c of CATEGORIES) {
      const v = parseFloat(scores[c.key]);
      if (!Number.isNaN(v)) numericScores[c.key] = v;
    }
    const res = await fetch("/api/self-evaluations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year, month, scores: numericScores, notes }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMsg({ ok: false, text: data.error || "Could not save" });
      return;
    }
    setMsg({ ok: true, text: "Your self-evaluation was saved." });
    onSaved();
  }

  return (
    <section className="card p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-ink">{MONTHS[month - 1]} self-evaluation</h2>
        <span className="text-xs text-ink-muted">
          Visible only to the Director of Client Success and CEO, for comparison.
        </span>
      </div>

      <div className="space-y-4">
        {CATEGORIES.map((c) => (
          <div key={c.key} className="rounded-xl border border-surface-line bg-surface-alt p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-sm font-bold text-ink">{c.label}</label>
              <input
                className="input !w-24 text-center font-bold"
                type="number"
                min={0}
                max={10}
                step={0.5}
                inputMode="decimal"
                placeholder="0–10"
                value={scores[c.key]}
                onChange={(e) => setScores((s) => ({ ...s, [c.key]: e.target.value }))}
              />
            </div>
            <textarea
              className="input mt-2 min-h-[60px]"
              placeholder="Optional — why do you feel you should get this score? (max 500 characters)"
              maxLength={MAX_NOTE_LEN}
              value={notes[c.key]}
              onChange={(e) => setNotes((n) => ({ ...n, [c.key]: e.target.value }))}
            />
            <div className="mt-1 text-right text-[11px] text-ink-muted">
              {notes[c.key]?.length || 0}/{MAX_NOTE_LEN}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex justify-end">
        <button className="btn-primary" disabled={busy} onClick={save}>
          {busy ? "Saving…" : "Save self-evaluation"}
        </button>
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

function RateKamsTab({ year, assignments }: { year: number; assignments: Assignment[] }) {
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  const kams = useMemo(() => {
    const map = new Map<number, string>();
    for (const a of assignments) {
      if (a.kam_user_id) map.set(a.kam_user_id, a.kam);
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [assignments]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <label className="text-sm font-semibold text-ink-soft">Month</label>
        <select className="input !w-44" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
          {MONTHS.map((m, i) => (
            <option key={m} value={i + 1}>{m}</option>
          ))}
        </select>
      </div>

      {kams.length === 0 ? (
        <EmptyState
          title="No KAM is linked to your assignments yet"
          hint="Ask the Director of Client Success to check your POD assignment."
        />
      ) : (
        <div className="space-y-5">
          {kams.map((k) => (
            <KamFeedbackCard key={k.id} kamId={k.id} kamName={k.name} year={year} month={month} />
          ))}
        </div>
      )}
    </div>
  );
}

function KamFeedbackCard({
  kamId,
  kamName,
  year,
  month,
}: {
  kamId: number;
  kamName: string;
  year: number;
  month: number;
}) {
  const [scores, setScores] = useState<Record<string, number>>({});
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    setLoaded(false);
    setMsg(null);
    fetch(`/api/kam-feedback?year=${year}`)
      .then((r) => r.json())
      .then((d) => {
        const match = (d.feedback || []).find(
          (f: any) => f.kam_user_id === kamId && f.month === month
        );
        setScores(match?.scores || {});
        setLoaded(true);
      });
  }, [kamId, year, month]);

  const complete = KAM_PARAMS.every((p) => typeof scores[p.key] === "number");

  async function save() {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/kam-feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kamUserId: kamId, year, month, scores }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMsg({ ok: false, text: data.error || "Could not save" });
      return;
    }
    setMsg({ ok: true, text: "Saved. This is visible only to the Director and CEO." });
  }

  if (!loaded) return <div className="card p-6"><Spinner /></div>;

  return (
    <section className="card p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-ink">Rate {kamName}</h2>
        <span className="text-xs text-ink-muted">{MONTHS[month - 1]} {year}</span>
      </div>
      <div className="space-y-4">
        {KAM_PARAMS.map((p) => (
          <div key={p.key} className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-semibold text-ink-soft">{p.label}</span>
            <ScalePicker
              paramKey={p.key}
              value={scores[p.key]}
              onChange={(v) => setScores((s) => ({ ...s, [p.key]: v }))}
            />
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-ink-muted">
          No comments needed — just your rating. {kamName} will never see this; only the
          Director of Client Success and CEO can.
        </span>
        <button className="btn-primary" disabled={busy || !complete} onClick={save}>
          {busy ? "Saving…" : "Save rating"}
        </button>
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
