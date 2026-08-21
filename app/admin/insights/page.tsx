"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MONTHS,
  QUARTERS,
  CATEGORIES,
  average,
  mean,
  bandOf,
  ADMIN_BAND,
  lastThreeConsecutive,
  fmtScore,
} from "@/lib/scoring";
import { BandChip, StatusChip, Spinner, EmptyState } from "@/components/ui";
import { ScoreBarChart, TrendLineChart } from "@/components/charts";

type Person = { id: number; name: string; title: string; active: boolean };
type Evaluation = {
  user_id: number;
  month: number;
  scores: Record<string, number>;
  feedback: string;
  status: string;
  ceo_note: string;
};

const THIS_YEAR = new Date().getFullYear();
const YEARS = [THIS_YEAR - 1, THIS_YEAR, THIS_YEAR + 1];

export default function InsightsPage() {
  const [people, setPeople] = useState<Person[] | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [year, setYear] = useState(THIS_YEAR);
  const [evals, setEvals] = useState<Evaluation[] | null>(null);

  useEffect(() => {
    fetch("/api/roster")
      .then((r) => r.json())
      .then((d) => {
        const ppl = (d.people || []).filter((p: Person) => p.active);
        setPeople(ppl);
        if (ppl.length > 0) setUserId(ppl[0].id);
      });
  }, []);

  const load = useCallback(async () => {
    if (!userId) return;
    setEvals(null);
    const d = await fetch(`/api/evaluations?year=${year}&userId=${userId}`).then((r) => r.json());
    setEvals(d.evaluations || []);
  }, [userId, year]);

  useEffect(() => {
    load();
  }, [load]);

  const person = people?.find((p) => p.id === userId);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Performance Insights</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Quarterly and annual view per CSM, with the recommended action based
            on the scoring criteria.
          </p>
        </div>
        <div className="flex gap-2">
          <div>
            <label className="label">CSM</label>
            <select
              className="input !w-52"
              value={userId ?? ""}
              onChange={(e) => setUserId(Number(e.target.value))}
            >
              {(people || []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.title})
                </option>
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

      {!people ? (
        <Spinner />
      ) : people.length === 0 ? (
        <EmptyState title="No CSMs on the roster yet" />
      ) : !evals ? (
        <Spinner />
      ) : (
        person && <PersonInsights person={person} year={year} evals={evals} />
      )}
    </div>
  );
}

function PersonInsights({
  person,
  year,
  evals,
}: {
  person: Person;
  year: number;
  evals: Evaluation[];
}) {
  const monthly = useMemo(() => {
    const map = new Map<number, number>();
    for (const e of evals) {
      const a = average(e.scores as any);
      if (a !== null) map.set(e.month, a);
    }
    return map;
  }, [evals]);

  const monthData = MONTHS.map((m, i) => ({
    label: m.slice(0, 3),
    score: monthly.get(i + 1) ?? null,
  }));

  const quarterData = QUARTERS.map((q) => {
    const vals = q.months
      .map((m) => monthly.get(m))
      .filter((v): v is number => typeof v === "number");
    return { label: q.name, score: vals.length ? mean(vals) : null, count: vals.length };
  });

  const scoredVals = Array.from(monthly.values());
  const annual = mean(scoredVals);
  const annualBand = annual !== null ? bandOf(annual) : null;
  const fullYear = monthly.size === 12;
  const streak = lastThreeConsecutive(monthly);

  // Category averages across the scored months
  const catAverages = CATEGORIES.map((c) => {
    const vals = evals
      .map((e) => e.scores?.[c.key])
      .filter((v): v is number => typeof v === "number");
    return { label: c.label, score: vals.length ? mean(vals) : null };
  });

  return (
    <div className="space-y-5">
      {/* Recommendation panel */}
      <section className="card p-6">
        <h2 className="mb-4 text-lg font-bold text-ink">
          Recommended action — {person.name}
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-surface-line bg-surface-alt p-4">
            <div className="label !mb-2">3-month consecutive trend</div>
            {streak ? (
              <>
                <BandChip
                  band={streak.band}
                  label={ADMIN_BAND[streak.band].label}
                />
                <p className="mt-2 text-sm text-ink-soft">
                  Based on {streak.months.map((m) => MONTHS[m - 1]).join(", ")}:{" "}
                  {ADMIN_BAND[streak.band].action}
                </p>
              </>
            ) : (
              <p className="text-sm text-ink-muted">
                Needs three consecutive scored months before a trend call can be
                made.
              </p>
            )}
          </div>
          <div className="rounded-xl border border-surface-line bg-surface-alt p-4">
            <div className="label !mb-2">
              Annual standing ({monthly.size}/12 months scored)
            </div>
            {annual !== null && annualBand ? (
              <>
                <BandChip
                  band={annualBand}
                  label={`${fmtScore(annual)} · ${ADMIN_BAND[annualBand].label}`}
                />
                <p className="mt-2 text-sm text-ink-soft">
                  {fullYear
                    ? ADMIN_BAND[annualBand].action
                    : `Provisional — ${ADMIN_BAND[annualBand].action} Final call after all 12 months are scored.`}
                </p>
              </>
            ) : (
              <p className="text-sm text-ink-muted">No scored months yet in {year}.</p>
            )}
          </div>
        </div>
      </section>

      {/* Monthly chart */}
      <section className="card p-6">
        <h2 className="mb-1 text-lg font-bold text-ink">Monthly average score</h2>
        <p className="mb-4 text-xs text-ink-muted">
          Average of the six category scores for each scored month of {year}.
        </p>
        <ScoreBarChart data={monthData} />
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Quarterly */}
        <section className="card p-6">
          <h2 className="mb-1 text-lg font-bold text-ink">Quarterly view</h2>
          <p className="mb-4 text-xs text-ink-muted">
            US calendar quarters — Q1 is January–March.
          </p>
          <ScoreBarChart data={quarterData} height={200} />
          <div className="mt-4 grid grid-cols-2 gap-2">
            {quarterData.map((q) => {
              const b = q.score !== null ? bandOf(q.score) : null;
              return (
                <div
                  key={q.label}
                  className="flex items-center justify-between rounded-lg border border-surface-line px-3 py-2 text-sm"
                >
                  <span className="font-semibold">{q.label}</span>
                  {q.score !== null && b ? (
                    <BandChip band={b} label={`${fmtScore(q.score)} · ${ADMIN_BAND[b].label}`} />
                  ) : (
                    <span className="text-xs text-ink-muted">No data</span>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Category strengths */}
        <section className="card p-6">
          <h2 className="mb-1 text-lg font-bold text-ink">Category averages</h2>
          <p className="mb-4 text-xs text-ink-muted">
            Where {person.name.split(" ")[0]} is strongest and weakest across{" "}
            {monthly.size} scored month{monthly.size === 1 ? "" : "s"}.
          </p>
          <ScoreBarChart
            data={catAverages.map((c) => ({ label: shortLabel(c.label), score: c.score }))}
            height={200}
          />
        </section>
      </div>

      {/* Month-by-month table */}
      <section className="card overflow-x-auto p-6">
        <h2 className="mb-4 text-lg font-bold text-ink">Month-by-month record</h2>
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-surface-line text-left text-xs uppercase tracking-wide text-ink-muted">
              <th className="pb-2 pr-4">Month</th>
              <th className="pb-2 pr-4">Average</th>
              <th className="pb-2 pr-4">Standing</th>
              <th className="pb-2 pr-4">Status</th>
              <th className="pb-2">Director feedback</th>
            </tr>
          </thead>
          <tbody>
            {MONTHS.map((m, i) => {
              const e = evals.find((x) => x.month === i + 1);
              const a = e ? average(e.scores as any) : null;
              const b = a !== null ? bandOf(a) : null;
              return (
                <tr key={m} className="border-b border-surface-line/60 last:border-0">
                  <td className="py-2.5 pr-4 font-semibold">{m}</td>
                  <td className="py-2.5 pr-4 font-bold text-accent">{fmtScore(a)}</td>
                  <td className="py-2.5 pr-4">
                    {b ? <BandChip band={b} label={ADMIN_BAND[b].label} /> : <span className="text-xs text-ink-muted">—</span>}
                  </td>
                  <td className="py-2.5 pr-4">
                    <StatusChip status={e?.status || "none"} />
                  </td>
                  <td className="max-w-[280px] py-2.5 text-xs text-ink-soft">
                    {e?.feedback || <span className="text-ink-muted">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function shortLabel(label: string) {
  const map: Record<string, string> = {
    Ownership: "Own",
    Communication: "Comm",
    "Team Player": "Team",
    "AI Adoption": "AI",
    "POD Management": "POD",
    "Client Sentiment": "Client",
  };
  return map[label] || label;
}
