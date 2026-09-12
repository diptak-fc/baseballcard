"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MONTHS,
  QUARTERS,
  CATEGORIES,
  average,
  mean,
  variance,
  bandOf,
  ADMIN_BAND,
  fmtScore,
} from "@/lib/scoring";
import { BandChip, Spinner, EmptyState } from "@/components/ui";
import { ScoreBarChart } from "@/components/charts";

type Person = { id: number; name: string; title: string; active: boolean };
type DirectorEval = { month: number; scores: Record<string, number>; status: string };
type SelfEval = { month: number; scores: Record<string, number>; notes: Record<string, string> };
type KamEval = {
  month: number;
  scores: Record<string, number>;
  status: string;
  kam_name: string;
};

const THIS_YEAR = new Date().getFullYear();
const YEARS = [THIS_YEAR - 1, THIS_YEAR, THIS_YEAR + 1];

export default function ComparativeAnalysisPage() {
  const [people, setPeople] = useState<Person[] | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [year, setYear] = useState(THIS_YEAR);
  const [directorEvals, setDirectorEvals] = useState<DirectorEval[] | null>(null);
  const [selfEvals, setSelfEvals] = useState<SelfEval[] | null>(null);
  const [kamEvals, setKamEvals] = useState<KamEval[] | null>(null);

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
    setDirectorEvals(null);
    setSelfEvals(null);
    setKamEvals(null);
    const [d, s, k] = await Promise.all([
      fetch(`/api/evaluations?year=${year}&userId=${userId}`).then((r) => r.json()),
      fetch(`/api/self-evaluations?year=${year}&userId=${userId}`).then((r) => r.json()),
      fetch(`/api/kam-evaluations?year=${year}&userId=${userId}`).then((r) => r.json()),
    ]);
    setDirectorEvals(d.evaluations || []);
    setSelfEvals(s.evaluations || []);
    setKamEvals(k.evaluations || []);
  }, [userId, year]);

  useEffect(() => {
    load();
  }, [load]);

  const person = people?.find((p) => p.id === userId);
  const loading = !people || !directorEvals || !selfEvals || !kamEvals;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Comparative Analysis</h1>
          <p className="mt-1 text-sm text-ink-soft">
            The CSM&rsquo;s self-score next to their KAM&rsquo;s score of them and the
            Director&rsquo;s official score — month by month, and rolled up by
            quarter and year.
          </p>
        </div>
        <div className="flex gap-2">
          <div>
            <label className="label">CSM</label>
            <select className="input !w-52" value={userId ?? ""} onChange={(e) => setUserId(Number(e.target.value))}>
              {(people || []).map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.title})</option>
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

      {!people ? (
        <Spinner />
      ) : people.length === 0 ? (
        <EmptyState title="No CSMs on the roster yet" />
      ) : loading ? (
        <Spinner />
      ) : (
        person && (
          <ComparisonBody
            person={person}
            year={year}
            directorEvals={directorEvals!}
            selfEvals={selfEvals!}
            kamEvals={kamEvals!}
          />
        )
      )}
    </div>
  );
}

function ComparisonBody({
  person,
  year,
  directorEvals,
  selfEvals,
  kamEvals,
}: {
  person: Person;
  year: number;
  directorEvals: DirectorEval[];
  selfEvals: SelfEval[];
  kamEvals: KamEval[];
}) {
  const rows = useMemo(() => {
    return MONTHS.map((_, i) => {
      const month = i + 1;
      const d = directorEvals.find((e) => e.month === month);
      const s = selfEvals.find((e) => e.month === month);
      const kams = kamEvals.filter((e) => e.month === month);

      const directorAvg = d ? average(d.scores as any) : null;
      const selfAvg = s ? average(s.scores as any) : null;
      const kamAvgs = kams.map((k) => ({ name: k.kam_name, avg: average(k.scores as any), status: k.status }));
      const kamCombined = mean(kamAvgs.map((k) => k.avg).filter((v): v is number => v !== null));

      return { month, directorAvg, selfAvg, kamAvgs, kamCombined };
    });
  }, [directorEvals, selfEvals, kamEvals]);

  const chartData = rows.map((r) => ({ label: MONTHS[r.month - 1].slice(0, 3), score: r.directorAvg }));

  const quarters = QUARTERS.map((q) => {
    const inQ = rows.filter((r) => q.months.includes(r.month));
    const director = mean(inQ.map((r) => r.directorAvg).filter((v): v is number => v !== null));
    const self = mean(inQ.map((r) => r.selfAvg).filter((v): v is number => v !== null));
    const kam = mean(inQ.map((r) => r.kamCombined).filter((v): v is number => v !== null));
    return { name: q.name, director, self, kam };
  });

  const annualDirector = mean(rows.map((r) => r.directorAvg).filter((v): v is number => v !== null));
  const annualSelf = mean(rows.map((r) => r.selfAvg).filter((v): v is number => v !== null));
  const annualKam = mean(rows.map((r) => r.kamCombined).filter((v): v is number => v !== null));

  return (
    <div className="space-y-5">
      <section className="card p-6">
        <h2 className="mb-4 text-lg font-bold text-ink">
          {person.name} — Director&rsquo;s official monthly score
        </h2>
        <ScoreBarChart data={chartData} />
      </section>

      <section className="card overflow-x-auto p-6">
        <h2 className="mb-4 text-lg font-bold text-ink">Month by month comparison</h2>
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-surface-line text-left text-xs uppercase tracking-wide text-ink-muted">
              <th className="pb-2 pr-4">Month</th>
              <th className="pb-2 pr-4">Self-score</th>
              <th className="pb-2 pr-4">KAM score</th>
              <th className="pb-2 pr-4">Variance (KAM − Self)</th>
              <th className="pb-2">Director&rsquo;s official</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const v = variance(r.selfAvg, r.kamCombined);
              return (
                <tr key={r.month} className="border-b border-surface-line/60 last:border-0 align-top">
                  <td className="py-2.5 pr-4 font-semibold">{MONTHS[r.month - 1]}</td>
                  <td className="py-2.5 pr-4 font-bold text-ink">{fmtScore(r.selfAvg)}</td>
                  <td className="py-2.5 pr-4">
                    <div className="font-bold text-ink">{fmtScore(r.kamCombined)}</div>
                    {r.kamAvgs.map((k) => (
                      <div key={k.name} className="text-[11px] text-ink-muted">
                        {k.name}: {fmtScore(k.avg)}
                        {k.status === "submitted" && " (awaiting CEO)"}
                        {k.status === "denied" && " (denied)"}
                      </div>
                    ))}
                  </td>
                  <td className="py-2.5 pr-4">
                    {v === null ? (
                      <span className="text-xs text-ink-muted">—</span>
                    ) : (
                      <span
                        className={
                          "font-bold " +
                          (v > 0.5 ? "text-band-good" : v < -0.5 ? "text-band-critical" : "text-ink-soft")
                        }
                      >
                        {v > 0 ? "+" : ""}
                        {v}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 font-bold text-accent">{fmtScore(r.directorAvg)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="card p-6">
        <h2 className="mb-4 text-lg font-bold text-ink">Quarterly rollup</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quarters.map((q) => (
            <div key={q.name} className="rounded-xl border border-surface-line bg-surface-alt p-4">
              <div className="mb-2 font-bold text-ink">{q.name}</div>
              <RollupLine label="Self" value={q.self} />
              <RollupLine label="KAM" value={q.kam} />
              <RollupLine label="Director" value={q.director} highlight />
            </div>
          ))}
        </div>
      </section>

      <section className="card p-6">
        <h2 className="mb-4 text-lg font-bold text-ink">Annual rollup — {year}</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-surface-line bg-surface-alt p-4">
            <RollupLine label="Self" value={annualSelf} />
          </div>
          <div className="rounded-xl border border-surface-line bg-surface-alt p-4">
            <RollupLine label="KAM" value={annualKam} />
          </div>
          <div className="rounded-xl border border-surface-line bg-surface-alt p-4">
            <RollupLine label="Director (official)" value={annualDirector} highlight />
            {annualDirector !== null && (
              <div className="mt-1">
                <BandChip band={bandOf(annualDirector)} label={ADMIN_BAND[bandOf(annualDirector)].label} />
              </div>
            )}
          </div>
        </div>
      </section>

      <SelfEvalNotes selfEvals={selfEvals} />
    </div>
  );
}

function RollupLine({ label, value, highlight }: { label: string; value: number | null; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={highlight ? "font-bold text-ink" : "text-ink-soft"}>{label}</span>
      <span className={highlight ? "font-bold text-accent" : "font-semibold text-ink"}>{fmtScore(value)}</span>
    </div>
  );
}

function SelfEvalNotes({ selfEvals }: { selfEvals: SelfEval[] }) {
  const withNotes = selfEvals.filter((e) => e.notes && Object.values(e.notes).some((n) => n));
  if (withNotes.length === 0) return null;
  return (
    <section className="card p-6">
      <h2 className="mb-4 text-lg font-bold text-ink">CSM&rsquo;s self-evaluation notes</h2>
      <div className="space-y-4">
        {withNotes.map((e) => (
          <div key={e.month} className="rounded-xl border border-surface-line bg-surface-alt p-4">
            <div className="mb-2 font-bold text-ink">{MONTHS[e.month - 1]}</div>
            <div className="space-y-2">
              {CATEGORIES.map((c) => {
                const note = e.notes?.[c.key];
                if (!note) return null;
                return (
                  <div key={c.key} className="text-sm">
                    <span className="font-semibold text-accent">{c.label}</span>
                    <span className="mx-1.5 text-ink-muted">·</span>
                    <span className="text-ink-soft">{note}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
