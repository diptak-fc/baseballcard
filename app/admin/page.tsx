"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  SELF_KAM_CATEGORIES,
  GWC_ITEMS,
  MONTHS,
  averageSelfKam,
  bandOf,
  ADMIN_BAND,
  fmtScore,
  MAX_NOTE_WORDS,
  wordCount,
  gwcComplete,
  type GwcScores,
} from "@/lib/scoring";
import { BandChip, StatusChip, ScoreTile, Spinner, EmptyState } from "@/components/ui";
import { Avatar } from "@/components/photo";
import { usePersistedMonth, usePersistedYear } from "@/lib/useMonthYear";

type Assignment = { id: number; pod: string; kam: string; clients: string[] };
type Person = {
  id: number;
  name: string;
  email: string;
  title: string;
  active: boolean;
  photo?: string | null;
  assignments: Assignment[];
};
type SelfEval = { user_id: number; scores: Record<string, number>; notes: Record<string, string> };
type KamEval = {
  id: number;
  kam_user_id: number;
  kam_name: string;
  csm_user_id: number;
  scores: Record<string, number>;
  gwc: GwcScores;
  status: string;
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

// The Director no longer scores CSMs directly. This page is a read-only
// review of what the CSM said about themselves (self-evaluation) and what
// their KAM(s) scored them, plus the KAM's GWC read — the Director's only
// action here is to publish the combined, KAM-derived record to the CEO for
// approval, optionally attaching a short note of their own commentary.
export default function MonthlyReviewPage() {
  const [year, setYear] = usePersistedYear();
  const [month, setMonth] = usePersistedMonth();
  const [people, setPeople] = useState<Person[] | null>(null);
  const [selfEvals, setSelfEvals] = useState<Map<number, SelfEval>>(new Map());
  const [kamEvals, setKamEvals] = useState<Map<number, KamEval[]>>(new Map());
  const [evals, setEvals] = useState<Map<number, Evaluation>>(new Map());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [rosterRes, selfRes, kamRes, evalRes] = await Promise.all([
      fetch("/api/roster").then((r) => r.json()),
      fetch(`/api/self-evaluations?year=${year}&month=${month}`).then((r) => r.json()),
      fetch(`/api/kam-evaluations?year=${year}&month=${month}`).then((r) => r.json()),
      fetch(`/api/evaluations?year=${year}&month=${month}`).then((r) => r.json()),
    ]);
    setPeople((rosterRes.people || []).filter((p: Person) => p.active));

    const sMap = new Map<number, SelfEval>();
    for (const s of selfRes.evaluations || []) sMap.set(s.user_id, s);
    setSelfEvals(sMap);

    const kMap = new Map<number, KamEval[]>();
    for (const k of kamRes.evaluations || []) {
      if (!kMap.has(k.csm_user_id)) kMap.set(k.csm_user_id, []);
      kMap.get(k.csm_user_id)!.push(k);
    }
    setKamEvals(kMap);

    const eMap = new Map<number, Evaluation>();
    for (const e of evalRes.evaluations || []) eMap.set(e.user_id, e);
    setEvals(eMap);

    setLoading(false);
  }, [year, month]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Monthly Review</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Review each CSM&rsquo;s self-evaluation and their KAM&rsquo;s scoring, then publish
            the combined record to the CEO for approval. The Director no longer enters scores here.
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
            <ReviewCard
              key={`${p.id}-${year}-${month}`}
              person={p}
              year={year}
              month={month}
              selfEval={selfEvals.get(p.id)}
              kamEvals={kamEvals.get(p.id) || []}
              existing={evals.get(p.id)}
              onSaved={load}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewCard({
  person,
  year,
  month,
  selfEval,
  kamEvals,
  existing,
  onSaved,
}: {
  person: Person;
  year: number;
  month: number;
  selfEval?: SelfEval;
  kamEvals: KamEval[];
  existing?: Evaluation;
  onSaved: () => void;
}) {
  const [note, setNote] = useState(existing?.feedback || "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const status = existing?.status || "none";
  const locked = status === "approved";

  // Contributing KAM evaluations: submitted or already approved — matches
  // what /api/evaluations will actually average when publishing.
  const contributing = kamEvals.filter((k) => k.status === "submitted" || k.status === "approved");

  const previewCombined = useMemo(() => {
    const out: Record<string, number> = {};
    for (const c of SELF_KAM_CATEGORIES) {
      const vals = contributing
        .map((k) => k.scores?.[c.key])
        .filter((v): v is number => typeof v === "number" && !Number.isNaN(v));
      if (vals.length > 0) out[c.key] = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
    }
    return out;
  }, [contributing]);

  const avg = averageSelfKam(previewCombined as any);
  const band = avg !== null ? bandOf(avg) : null;
  const selfAvg = selfEval ? averageSelfKam(selfEval.scores as any) : null;
  const noteWords = wordCount(note);
  const noteOverLimit = noteWords > MAX_NOTE_WORDS;
  const canPublish = contributing.length > 0 && !locked;

  async function publish() {
    if (noteOverLimit) {
      setMsg({ ok: false, text: `Your note is over ${MAX_NOTE_WORDS} words — trim it before publishing.` });
      return;
    }
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/evaluations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: person.id, year, month, note }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMsg({ ok: false, text: data.error || "Could not publish" });
      return;
    }
    setMsg({ ok: true, text: "Published to the CEO for approval." });
    onSaved();
  }

  return (
    <section className="card p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Avatar name={person.name} photo={person.photo} size={48} />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-ink">{person.name}</h2>
              <span className="chip bg-accent/10 text-accent">{person.title}</span>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {person.assignments.map((a) => (
                <div key={a.id} className="rounded-lg border border-surface-line bg-surface-alt px-2.5 py-1.5 text-xs">
                  <span className="font-bold text-accent">{a.pod}</span>
                  <span className="mx-1.5 text-ink-muted">·</span>
                  <span className="font-semibold text-ink-soft">KAM: {a.kam}</span>
                  <div className="mt-0.5 text-ink-muted">{(a.clients || []).join(", ") || "No clients listed"}</div>
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
          <span className="font-bold">CEO declined this month:</span> {existing.ceo_note}
        </p>
      )}

      <div className="rounded-xl border border-surface-line bg-surface-alt p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wide text-ink-muted">Self-evaluation (read-only)</span>
          {selfAvg !== null && <span className="text-sm font-bold text-accent">{fmtScore(selfAvg)}/10</span>}
        </div>
        {!selfEval ? (
          <p className="text-xs text-ink-muted">This CSM hasn&rsquo;t submitted a self-evaluation for this month.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-8">
            {SELF_KAM_CATEGORIES.map((c) => (
              <ScoreTile key={c.key} label={c.label} value={selfEval.scores?.[c.key]} />
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 space-y-3">
        {kamEvals.length === 0 ? (
          <div className="rounded-xl border border-dashed border-surface-line bg-surface-alt p-4 text-center text-xs text-ink-muted">
            No KAM has scored this CSM for this month yet.
          </div>
        ) : (
          kamEvals.map((k) => {
            const kOk = gwcComplete(k.gwc);
            return (
              <div key={k.id} className="rounded-xl border border-surface-line bg-surface-alt p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wide text-ink-muted">
                    KAM evaluation — {k.kam_name}
                  </span>
                  <div className="flex items-center gap-2">
                    {!kOk && <span className="text-xs font-bold text-band-warn">⚠ GWC incomplete</span>}
                    <StatusChip status={k.status} />
                  </div>
                </div>
                <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-8">
                  {SELF_KAM_CATEGORIES.map((c) => (
                    <ScoreTile key={c.key} label={c.label} value={k.scores?.[c.key]} />
                  ))}
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  {GWC_ITEMS.map((g) => {
                    const a = k.gwc?.[g.key];
                    return (
                      <div key={g.key} className="rounded-lg bg-surface px-3 py-2">
                        <div className="text-xs font-semibold text-ink-soft">{g.label}</div>
                        <div
                          className={
                            "text-sm font-bold " +
                            (a?.value === "yes" ? "text-band-good" : a?.value === "no" ? "text-band-critical" : "text-ink-muted")
                          }
                        >
                          {a?.value === "yes" ? "Yes" : a?.value === "no" ? "No" : "—"}
                        </div>
                        {a?.remark && <div className="mt-1 text-xs text-ink-muted">{a.remark}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-4 rounded-xl border border-accent/30 bg-accent/5 p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wide text-accent">
            Combined score preview (this is what gets published)
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-8">
          {SELF_KAM_CATEGORIES.map((c) => (
            <ScoreTile key={c.key} label={c.label} value={previewCombined[c.key]} />
          ))}
        </div>
      </div>

      <div className="mt-4">
        <label className="label">Director&rsquo;s note (optional — your own commentary, not a score)</label>
        <textarea
          className={"input min-h-[72px] " + (noteOverLimit ? "!border-band-critical !text-band-critical" : "")}
          placeholder={`Optional note for ${person.name} (max ${MAX_NOTE_WORDS} words)`}
          disabled={locked}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <div className={"mt-1 text-right text-[11px] " + (noteOverLimit ? "font-bold text-band-critical" : "text-ink-muted")}>
          {noteWords}/{MAX_NOTE_WORDS} words
          {noteOverLimit && " — over the limit, trim it to publish"}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-ink-muted">
          {locked
            ? "Approved by the CEO — this month is locked."
            : contributing.length === 0
            ? "Publish is disabled until at least one KAM has submitted a score for this CSM this month."
            : status === "submitted"
            ? "Awaiting CEO review. Publishing again will refresh the combined score and re-submit it."
            : "Ready to publish — the score shown above is the mean of every KAM evaluation submitted for this CSM this month."}
        </div>
        {!locked && (
          <button className="btn-primary" disabled={busy || !canPublish || noteOverLimit} onClick={publish}>
            {busy ? "Publishing…" : "Publish to CEO"}
          </button>
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
