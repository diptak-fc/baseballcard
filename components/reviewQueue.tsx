"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MONTHS,
  SELF_KAM_CATEGORIES,
  GWC_ITEMS,
  averageSelfKam,
  mean,
  variance,
  bandOf,
  ADMIN_BAND,
  fmtScore,
  gwcComplete,
  type GwcScores,
} from "@/lib/scoring";
import { BandChip, StatusChip, ScoreTile, Spinner, EmptyState } from "@/components/ui";
import { Avatar } from "@/components/photo";

type Status = "submitted" | "approved" | "denied";

type KamBreakdown = {
  kamUserId: number;
  kamName: string;
  scores: Record<string, number>;
  gwc?: GwcScores | null;
  status: string;
};

type Item = {
  id: number;
  csm_user_id: number;
  year: number;
  month: number;
  scores: Record<string, number>; // combined, KAM-derived — the "official" record
  feedback?: string; // Director's own note (not a score)
  self_scores?: Record<string, number> | null;
  kam_breakdown?: KamBreakdown[] | null;
  status: Status;
  ceo_note: string;
  submitted_at: string | null;
  decided_at: string | null;
  name: string; // CSM name
  title: string;
  photo?: string | null;
};

type PanelView = "consolidated" | "monthly";

const DECLINE_SUGGESTIONS = [
  "I don't think I align with the KPIs.",
  "I don't think this is a fair review.",
  "This review requires further discussion.",
];

function anyGwcIncomplete(item: Item): boolean {
  return (item.kam_breakdown || []).some((k) => !gwcComplete(k.gwc));
}

// The dedicated review page both the CEO (who can decide) and the Director
// (read-only) use — one combined, KAM-derived record per CSM per month, with
// a consolidated summary and a monthly, bulk-actionable list.
export function ReviewQueue({ canDecide }: { canDecide: boolean }) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [selectedCsmId, setSelectedCsmId] = useState<number | null>(null);

  const load = useCallback(async () => {
    const d = await fetch("/api/approvals").then((r) => r.json());
    setItems(d.items || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const groups = useMemo(() => {
    if (!items) return [];
    const map = new Map<
      number,
      { id: number; name: string; photo?: string | null; title?: string; items: Item[] }
    >();
    for (const it of items) {
      if (!map.has(it.csm_user_id)) {
        map.set(it.csm_user_id, { id: it.csm_user_id, name: it.name, photo: it.photo, title: it.title, items: [] });
      }
      map.get(it.csm_user_id)!.items.push(it);
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  const selectedGroup = groups.find((g) => g.id === selectedCsmId) || null;
  const totalPending = items?.filter((i) => i.status === "submitted").length ?? 0;

  if (!items) return <Spinner />;

  if (selectedGroup) {
    return (
      <GroupPanel
        group={selectedGroup}
        canDecide={canDecide}
        onBack={() => setSelectedCsmId(null)}
        onChanged={load}
      />
    );
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-soft">
          {totalPending === 0
            ? "Nothing is waiting for a decision right now."
            : `${totalPending} evaluation${totalPending === 1 ? "" : "s"} awaiting a decision.`}
        </p>
      </div>

      {groups.length === 0 ? (
        <EmptyState
          title="Nothing published yet"
          hint="Evaluations appear here once the Director publishes a CSM's combined monthly record for CEO approval."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => {
            const pending = g.items.filter((i) => i.status === "submitted");
            const gwcAttention = pending.some(anyGwcIncomplete);
            return (
              <button
                key={g.id}
                onClick={() => setSelectedCsmId(g.id)}
                className="card flex items-center gap-3 p-4 text-left transition-colors hover:border-accent"
              >
                <Avatar name={g.name} photo={g.photo} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="truncate font-bold text-ink">{g.name}</div>
                    {gwcAttention && <span title="GWC incomplete on a pending review">⚠️</span>}
                  </div>
                  <div className="mt-0.5 text-xs text-ink-muted">
                    {pending.length === 0 ? "Nothing pending" : `${pending.length} pending`}
                  </div>
                </div>
                {pending.length > 0 && (
                  <span className="chip bg-band-warnBg text-band-warn">{pending.length}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function GroupPanel({
  group,
  canDecide,
  onBack,
  onChanged,
}: {
  group: { id: number; name: string; photo?: string | null; items: Item[] };
  canDecide: boolean;
  onBack: () => void;
  onChanged: () => Promise<void>;
}) {
  const [view, setView] = useState<PanelView>("consolidated");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [declineTarget, setDeclineTarget] = useState<Item[] | null>(null);
  const [busy, setBusy] = useState(false);

  const items = group.items.slice().sort((a, b) => b.year - a.year || b.month - a.month);
  const pending = items.filter((i) => i.status === "submitted");
  const decided = items.filter((i) => i.status !== "submitted");

  async function submitDecisions(list: { id: number; decision: Status; note?: string }[]) {
    if (list.length === 0) return;
    setBusy(true);
    await fetch("/api/approvals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: list }),
    });
    setBusy(false);
    setSelected(new Set());
    setDeclineTarget(null);
    await onChanged();
  }

  function toggle(id: number) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedPendingItems = pending.filter((i) => selected.has(i.id));

  return (
    <div>
      <button onClick={onBack} className="mb-4 text-sm font-semibold text-accent hover:underline">
        ← Back to all CSMs
      </button>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar name={group.name} photo={group.photo} size={48} />
          <div>
            <h1 className="text-xl font-bold text-ink">{group.name}</h1>
            <p className="text-xs text-ink-muted">
              {items.length} month{items.length === 1 ? "" : "s"} on record · {pending.length} pending
            </p>
          </div>
        </div>
        <div className="flex rounded-xl border border-surface-line bg-surface p-1">
          {(["consolidated", "monthly"] as PanelView[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={
                "rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors " +
                (view === v ? "bg-accent text-accent-ink" : "text-ink-soft hover:text-accent")
              }
            >
              {v === "consolidated" ? "Consolidated" : "Monthly"}
            </button>
          ))}
        </div>
      </div>

      {view === "consolidated" ? (
        <ConsolidatedView items={items} onGoMonthly={() => setView("monthly")} />
      ) : (
        <div>
          {canDecide && (
            <div className="card mb-4 flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  className="btn-secondary text-xs"
                  disabled={pending.length === 0}
                  onClick={() =>
                    setSelected(new Set(pending.length === selected.size ? [] : pending.map((i) => i.id)))
                  }
                >
                  {pending.length > 0 && selected.size === pending.length ? "Unselect all" : "Select all pending"}
                </button>
                <span className="text-xs text-ink-muted">{selected.size} selected</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className="btn-secondary text-xs"
                  disabled={busy || selectedPendingItems.length === 0}
                  onClick={() =>
                    submitDecisions(selectedPendingItems.map((i) => ({ id: i.id, decision: "approved" as Status })))
                  }
                >
                  ✓ Approve selected ({selectedPendingItems.length})
                </button>
                <button
                  className="btn-danger text-xs"
                  disabled={busy || selectedPendingItems.length === 0}
                  onClick={() => setDeclineTarget(selectedPendingItems)}
                >
                  ✕ Decline selected ({selectedPendingItems.length})
                </button>
                <button
                  className="btn-primary text-xs"
                  disabled={busy || pending.length === 0}
                  onClick={() => submitDecisions(pending.map((i) => ({ id: i.id, decision: "approved" as Status })))}
                >
                  Approve all pending ({pending.length})
                </button>
                {decided.length > 0 && (
                  <button
                    className="btn-secondary text-xs"
                    disabled={busy}
                    onClick={() => submitDecisions(decided.map((i) => ({ id: i.id, decision: "submitted" as Status })))}
                  >
                    ↺ Revert all decided ({decided.length})
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="space-y-3">
            {items.map((it) => (
              <MonthlyRow
                key={it.id}
                item={it}
                canDecide={canDecide}
                checked={selected.has(it.id)}
                onToggle={() => toggle(it.id)}
                onRevert={() => submitDecisions([{ id: it.id, decision: "submitted" }])}
                busy={busy}
              />
            ))}
          </div>
        </div>
      )}

      {declineTarget && (
        <DeclineDialog
          count={declineTarget.length}
          busy={busy}
          onCancel={() => setDeclineTarget(null)}
          onConfirm={(note) =>
            submitDecisions(declineTarget.map((i) => ({ id: i.id, decision: "denied", note })))
          }
        />
      )}
    </div>
  );
}

function ConsolidatedView({ items, onGoMonthly }: { items: Item[]; onGoMonthly: () => void }) {
  const pending = items.filter((i) => i.status === "submitted").length;
  const approved = items.filter((i) => i.status === "approved").length;
  const denied = items.filter((i) => i.status === "denied").length;

  const officialAvg = mean(items.map((i) => averageSelfKam(i.scores as any)).filter((v): v is number => v !== null));

  const selfByMonth = new Map<number, number>();
  for (const i of items) {
    if (i.self_scores) {
      const a = averageSelfKam(i.self_scores as any);
      if (a !== null) selfByMonth.set(i.month, a);
    }
  }
  const selfAvg = mean(Array.from(selfByMonth.values()));

  const allKam = items.flatMap((i) => i.kam_breakdown || []);
  const gwcTotal = allKam.length;
  const gwcDone = allKam.filter((k) => gwcComplete(k.gwc)).length;
  const gwcIncompleteItems = items.filter(anyGwcIncomplete);

  const headline = officialAvg ?? selfAvg;
  const band = headline !== null && headline !== undefined ? bandOf(headline) : null;

  return (
    <div className="space-y-5">
      <section className="card p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-ink">Overview</h2>
          {headline !== null && headline !== undefined && band && (
            <BandChip band={band} label={`${fmtScore(headline)} · ${ADMIN_BAND[band].label}`} />
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-surface-line bg-surface-alt p-4 text-center">
            <div className="text-xs font-semibold uppercase text-ink-muted">Pending</div>
            <div className="mt-1 text-xl font-bold text-band-warn">{pending}</div>
          </div>
          <div className="rounded-xl border border-surface-line bg-surface-alt p-4 text-center">
            <div className="text-xs font-semibold uppercase text-ink-muted">Approved</div>
            <div className="mt-1 text-xl font-bold text-band-good">{approved}</div>
          </div>
          <div className="rounded-xl border border-surface-line bg-surface-alt p-4 text-center">
            <div className="text-xs font-semibold uppercase text-ink-muted">Denied</div>
            <div className="mt-1 text-xl font-bold text-band-critical">{denied}</div>
          </div>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="mb-4 text-lg font-bold text-ink">Self vs. Official (KAM-derived) score</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <RollupTile label="Self-evaluation" value={selfAvg} />
          <RollupTile label="Official (via KAM, published by Director)" value={officialAvg} highlight />
        </div>
        {selfAvg !== null && officialAvg !== null && (
          <p className="mt-3 text-xs text-ink-muted">
            Variance (Official − Self): {" "}
            <span className="font-bold text-ink">
              {variance(selfAvg, officialAvg)! > 0 ? "+" : ""}
              {variance(selfAvg, officialAvg)}
            </span>
          </p>
        )}
      </section>

      {allKam.length > 0 && (
        <section className="card p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-ink">GWC completion</h2>
            <span className="text-sm font-bold text-accent">
              {gwcDone}/{gwcTotal} complete
            </span>
          </div>
          {gwcIncompleteItems.length === 0 ? (
            <p className="text-sm text-ink-soft">Every contributing KAM evaluation here has a completed GWC panel.</p>
          ) : (
            <div className="space-y-2">
              {gwcIncompleteItems.map((i) => (
                <div key={i.id} className="flex items-center justify-between rounded-lg bg-surface-alt px-3 py-2 text-sm">
                  <span className="text-ink-soft">
                    ⚠️ {MONTHS[i.month - 1]} {i.year}
                  </span>
                  <StatusChip status={i.status} />
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <div className="flex justify-end">
        <button className="btn-primary" onClick={onGoMonthly}>
          Switch to Monthly view →
        </button>
      </div>
    </div>
  );
}

function RollupTile({ label, value, highlight }: { label: string; value: number | null; highlight?: boolean }) {
  return (
    <div className={"rounded-xl border p-4 text-center " + (highlight ? "border-accent/40 bg-accent/10" : "border-surface-line bg-surface-alt")}>
      <div className={"text-xs font-semibold uppercase " + (highlight ? "text-accent" : "text-ink-muted")}>{label}</div>
      <div className={"mt-1 text-xl font-bold " + (highlight ? "text-accent" : "text-ink")}>{fmtScore(value)}</div>
    </div>
  );
}

function MonthlyRow({
  item,
  canDecide,
  checked,
  onToggle,
  onRevert,
  busy,
}: {
  item: Item;
  canDecide: boolean;
  checked: boolean;
  onToggle: () => void;
  onRevert: () => void;
  busy: boolean;
}) {
  const [open, setOpen] = useState(false);
  const avg = averageSelfKam(item.scores as any);
  const band = avg !== null ? bandOf(avg) : null;
  const selfAvg = item.self_scores ? averageSelfKam(item.self_scores as any) : null;
  const gwcOk = !anyGwcIncomplete(item);
  const isPending = item.status === "submitted";
  const kamNames = (item.kam_breakdown || []).map((k) => k.kamName).join(", ") || "—";

  return (
    <section className="card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {canDecide && isPending && (
            <input type="checkbox" className="h-4 w-4 accent-accent" checked={checked} onChange={onToggle} />
          )}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-ink">
                {MONTHS[item.month - 1]} {item.year}
              </span>
              <span className="chip bg-surface-raise text-ink-soft">Scored by KAM: {kamNames}</span>
              {!gwcOk && <span title="GWC panel incomplete on a contributing KAM evaluation">⚠️</span>}
            </div>
            {avg !== null && band && (
              <span className="mt-0.5 block text-xs text-ink-muted">
                Combined score: <span className="font-bold text-accent">{fmtScore(avg)}</span> · {ADMIN_BAND[band].label}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusChip status={item.status} />
          {canDecide && !isPending && (
            <button className="btn-secondary text-xs" disabled={busy} onClick={onRevert}>
              ↺ Revert to pending
            </button>
          )}
          <button className="text-xs font-semibold text-accent hover:underline" onClick={() => setOpen((o) => !o)}>
            {open ? "Hide details" : "Details"}
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-8">
            {SELF_KAM_CATEGORIES.map((c) => (
              <ScoreTile key={c.key} label={c.label} value={item.scores?.[c.key]} />
            ))}
          </div>

          {item.feedback && (
            <div className="rounded-lg bg-surface-alt px-3 py-2 text-sm text-ink-soft">
              <span className="font-semibold text-ink">Director&rsquo;s note:</span> {item.feedback}
            </div>
          )}

          <div className="rounded-xl border border-surface-line bg-surface-alt p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wide text-ink-muted">
                Self-evaluation, for comparison
              </span>
              {selfAvg !== null && (
                <span className="text-sm font-bold text-accent">{fmtScore(selfAvg)}/10 self-scored</span>
              )}
            </div>
            {!item.self_scores ? (
              <p className="text-xs text-ink-muted">No self-evaluation was submitted for this month.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-8">
                {SELF_KAM_CATEGORIES.map((c) => {
                  const v = variance(item.self_scores?.[c.key], item.scores?.[c.key]);
                  return (
                    <div key={c.key} className="rounded-lg bg-surface px-2 py-1.5 text-center">
                      <div className="text-[10px] font-semibold uppercase text-ink-muted">{c.label}</div>
                      <div className="text-sm font-bold text-ink">{fmtScore(item.self_scores?.[c.key])}</div>
                      {v !== null && v !== 0 && (
                        <div className={"text-[10px] font-bold " + (v > 0 ? "text-band-good" : "text-band-critical")}>
                          {v > 0 ? "+" : ""}
                          {v} vs. official
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {(item.kam_breakdown || []).map((k) => {
            const kOk = gwcComplete(k.gwc);
            return (
              <div key={k.kamUserId} className="rounded-xl border border-surface-line bg-surface-alt p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wide text-ink-muted">
                    KAM evaluation — {k.kamName}
                  </span>
                  {!kOk && <span className="text-xs font-bold text-band-warn">⚠ GWC incomplete</span>}
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
          })}

          {item.ceo_note && (
            <p className="rounded-lg bg-band-criticalBg px-3 py-2 text-sm text-band-critical">
              <span className="font-bold">CEO note:</span> {item.ceo_note}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function DeclineDialog({
  count,
  busy,
  onCancel,
  onConfirm,
}: {
  count: number;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (note: string) => void;
}) {
  const [note, setNote] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="card w-full max-w-md p-6">
        <h3 className="text-lg font-bold text-ink">
          Decline {count} evaluation{count === 1 ? "" : "s"}
        </h3>
        <p className="mt-1 text-xs text-ink-muted">
          Pick a reason, or write your own — this note goes back to the Director.
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {DECLINE_SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setNote(s)}
              className={
                "rounded-lg border px-3 py-2 text-left text-sm transition-colors " +
                (note === s ? "border-accent bg-accent/10 text-accent" : "border-surface-line text-ink-soft hover:text-accent")
              }
            >
              {s}
            </button>
          ))}
        </div>
        <textarea
          className="input mt-3 min-h-[70px]"
          placeholder="Or write your own note…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-secondary" disabled={busy} onClick={onCancel}>
            Cancel
          </button>
          <button
            className="btn-danger"
            disabled={busy || !note.trim()}
            onClick={() => onConfirm(note.trim())}
          >
            {busy ? "Declining…" : "Confirm decline"}
          </button>
        </div>
      </div>
    </div>
  );
}
