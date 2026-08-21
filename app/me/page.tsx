"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CATEGORIES,
  MONTHS,
  QUARTERS,
  average,
  mean,
  bandOf,
  CSM_BAND,
  fmtScore,
} from "@/lib/scoring";
import { BandChip, ScoreTile, Spinner, EmptyState } from "@/components/ui";
import { ScoreBarChart, TrendLineChart } from "@/components/charts";

type Assignment = { id: number; pod: string; kam: string; clients: string[] };
type Me = { id: number; name: string; title: string };
type Evaluation = {
  month: number;
  scores: Record<string, number>;
  feedback: string;
};

const THIS_YEAR = new Date().getFullYear();
const YEARS = [THIS_YEAR - 1, THIS_YEAR];

type Tab = "monthly" | "quarterly" | "yearly";

export default function MyCardPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [year, setYear] = useState(THIS_YEAR);
  const [evals, setEvals] = useState<Evaluation[] | null>(null);
  const [tab, setTab] = useState<Tab>("monthly");
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => {
        setMe(d.user);
        setAssignments(d.assignments || []);
      });
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
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-navy-700 text-lg font-bold text-white">
              {me.name
                .split(/\s+/)
                .map((w) => w[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold text-navy-800">{me.name}</h1>
              <div className="text-sm text-ink-muted">{me.title} · Full Circle Agency</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {assignments.map((a) => (
              <div
                key={a.id}
                className="rounded-lg border border-surface-line bg-surface-alt px-2.5 py-1.5 text-xs"
              >
                <span className="font-bold text-navy-700">{a.pod}</span>
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
        <div className="flex rounded-xl border border-surface-line bg-white p-1">
          {(
            [
              ["monthly", "Monthly"],
              ["quarterly", "Quarterly"],
              ["yearly", "Yearly"],
            ] as [Tab, string][]
          ).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={
                "rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors " +
                (tab === t ? "bg-navy-700 text-white" : "text-ink-soft hover:text-navy-700")
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
            <h2 className="text-lg font-bold text-navy-800">
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
        <h2 className="mb-1 text-lg font-bold text-navy-800">Quarterly averages</h2>
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
                <h3 className="font-bold text-navy-800">{q.name}</h3>
                <span className="text-lg font-bold text-navy-700">{fmtScore(q.score)}<span className="text-xs font-semibold text-ink-muted">/10</span></span>
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
            <h2 className="text-lg font-bold text-navy-800">{year} at a glance</h2>
            <p className="mt-1 text-xs text-ink-muted">
              {monthly.size}/12 months published · running average{" "}
              <span className="font-bold text-navy-700">{fmtScore(annual)}</span>
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
          <p className="mt-4 rounded-lg bg-navy-50 px-3 py-2 text-xs text-navy-700">
            Your annual performance evaluation will be available at the end of
            the year, once reviews for all twelve months are complete.
          </p>
        )}
      </section>
    </div>
  );
}
