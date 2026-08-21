"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CATEGORIES,
  MONTHS,
  average,
  bandOf,
  ADMIN_BAND,
  fmtScore,
} from "@/lib/scoring";
import { BandChip, StatusChip, ScoreTile, Spinner, EmptyState } from "@/components/ui";
import { Avatar } from "@/components/photo";

type Item = {
  id: number;
  user_id: number;
  year: number;
  month: number;
  scores: Record<string, number>;
  feedback: string;
  status: string;
  ceo_note: string;
  submitted_at: string | null;
  decided_at: string | null;
  name: string;
  title: string;
  photo?: string | null;
};

export default function CeoPage() {
  const [items, setItems] = useState<Item[] | null>(null);

  const load = useCallback(async () => {
    const d = await fetch("/api/approvals").then((r) => r.json());
    setItems(d.items || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!items) return <Spinner />;

  const pending = items.filter((i) => i.status === "submitted");
  const decided = items.filter((i) => i.status !== "submitted");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink">CEO Review</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Evaluations submitted by the Director of Client Success. Approve to
          publish the result to the CSM, or deny to send it back with a note.
        </p>
      </div>

      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-muted">
        Awaiting your decision ({pending.length})
      </h2>
      {pending.length === 0 ? (
        <EmptyState
          title="Nothing waiting for approval"
          hint="When the Director submits a monthly evaluation, it will appear here."
        />
      ) : (
        <div className="space-y-4">
          {pending.map((i) => (
            <ReviewCard key={i.id} item={i} onDecided={load} />
          ))}
        </div>
      )}

      {decided.length > 0 && (
        <>
          <h2 className="mb-3 mt-10 text-sm font-bold uppercase tracking-wide text-ink-muted">
            Decision history
          </h2>
          <div className="card divide-y divide-surface-line">
            {decided.map((i) => {
              const avg = average(i.scores as any);
              return (
                <div key={i.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                  <div>
                    <span className="font-semibold">{i.name}</span>
                    <span className="mx-2 text-ink-muted">·</span>
                    <span className="text-sm text-ink-soft">
                      {MONTHS[i.month - 1]} {i.year}
                    </span>
                    {i.ceo_note && (
                      <div className="mt-0.5 text-xs text-ink-muted">Note: {i.ceo_note}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-accent">{fmtScore(avg)}/10</span>
                    <StatusChip status={i.status} />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function ReviewCard({ item, onDecided }: { item: Item; onDecided: () => void }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<null | "approved" | "denied">(null);
  const avg = average(item.scores as any);
  const band = avg !== null ? bandOf(avg) : null;

  async function decide(decision: "approved" | "denied") {
    if (decision === "denied" && !note.trim()) {
      alert("Please add a note explaining why you are denying, so the Director can revise it.");
      return;
    }
    setBusy(decision);
    await fetch("/api/approvals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, decision, note }),
    });
    setBusy(null);
    onDecided();
  }

  return (
    <section className="card p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar name={item.name} photo={item.photo} size={44} />
          <div>
            <h3 className="text-lg font-bold text-ink">
              {item.name} <span className="text-sm font-semibold text-ink-muted">({item.title})</span>
            </h3>
            <div className="text-sm text-ink-soft">
              {MONTHS[item.month - 1]} {item.year}
            </div>
          </div>
        </div>
        {avg !== null && band && (
          <BandChip band={band} label={`${fmtScore(avg)} · ${ADMIN_BAND[band].label}`} />
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {CATEGORIES.map((c) => (
          <ScoreTile key={c.key} label={c.label} value={item.scores?.[c.key]} />
        ))}
      </div>

      {item.feedback && (
        <div className="mt-4 rounded-lg bg-surface-alt px-3 py-2 text-sm text-ink-soft">
          <span className="font-semibold text-ink">Director&rsquo;s feedback:</span> {item.feedback}
        </div>
      )}

      <div className="mt-4">
        <label className="label">Note to the Director (required when denying)</label>
        <input
          className="input"
          placeholder="Optional note…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button className="btn-danger" disabled={busy !== null} onClick={() => decide("denied")}>
          {busy === "denied" ? "Recording…" : "✕ Deny"}
        </button>
        <button className="btn-success" disabled={busy !== null} onClick={() => decide("approved")}>
          {busy === "approved" ? "Recording…" : "✓ Approve"}
        </button>
      </div>
    </section>
  );
}
