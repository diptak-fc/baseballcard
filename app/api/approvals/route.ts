import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, errorResponse } from "@/lib/auth";

// GET: the CEO's approval queue. Now a single combined item per CSM per
// month — the Director-published, KAM-derived "official" record — since the
// Director no longer scores independently and KAM evaluations are no longer
// approved as their own separate line items. Each item still carries:
//   - self_scores: the CSM's own self-evaluation for that month (comparison)
//   - kam_breakdown: every contributing KAM evaluation (name, scores, gwc) —
//     so the CEO can see who scored what and their GWC read, without a
//     separate approval action on those rows.
export async function GET() {
  try {
    await requireRole("CEO", "ADMIN");
    const sql = await db();

    const rows = await sql`
      SELECT e.id, e.user_id AS csm_user_id, e.year, e.month, e.scores, e.feedback, e.status,
             e.ceo_note, e.submitted_at, e.decided_at, u.name, u.title, u.photo,
             s.scores AS self_scores,
             (
               SELECT json_agg(json_build_object(
                 'kamUserId', k.kam_user_id,
                 'kamName', kam.name,
                 'scores', k.scores,
                 'gwc', k.gwc,
                 'status', k.status
               ))
               FROM kam_evaluations k
               JOIN users kam ON kam.id = k.kam_user_id
               WHERE k.csm_user_id = e.user_id AND k.year = e.year AND k.month = e.month
                 AND k.status IN ('submitted', 'approved')
             ) AS kam_breakdown
      FROM evaluations e
      JOIN users u ON u.id = e.user_id
      LEFT JOIN self_evaluations s
        ON s.user_id = e.user_id AND s.year = e.year AND s.month = e.month
      WHERE e.status IN ('submitted', 'approved', 'denied')
      ORDER BY (e.status = 'submitted') DESC, e.submitted_at DESC NULLS LAST
      LIMIT 600`;

    const items = (rows as any[]).map((r) => ({ ...r, kind: "director" as const }));

    return NextResponse.json({ items });
  } catch (e) {
    return errorResponse(e);
  }
}

type Decision = "approved" | "denied" | "submitted"; // "submitted" = revert to pending

async function applyOne(
  sql: Awaited<ReturnType<typeof db>>,
  id: number,
  decision: Decision,
  note: string
) {
  const isRevert = decision === "submitted";
  // Reverting only makes sense from a decided state; deciding only makes
  // sense from the pending ("submitted") state — each guarded separately so
  // a stale/duplicate request can't double-apply.
  const rows = isRevert
    ? await sql`
        UPDATE evaluations SET status = 'submitted', ceo_note = '', decided_at = NULL, updated_at = NOW()
        WHERE id = ${id} AND status IN ('approved', 'denied')
        RETURNING id, status`
    : await sql`
        UPDATE evaluations SET status = ${decision}, ceo_note = ${note}, decided_at = NOW(), updated_at = NOW()
        WHERE id = ${id} AND status = 'submitted'
        RETURNING id, status`;
  return { ok: rows.length > 0, status: rows[0]?.status as string | undefined };
}

// POST: record the CEO's decision(s) on the combined monthly record.
//   Single:  { id, decision: "approved"|"denied"|"submitted", note? }
//   Bulk:    { items: [{ id, decision, note? }, ...] }
// decision "submitted" reverts an already-approved/denied item back to
// pending, clearing the CEO's note — used for "undo my decision" (CEOs can
// change their mind as circumstances change).
export async function POST(req: NextRequest) {
  try {
    await requireRole("CEO");
    const body = await req.json();
    const sql = await db();

    if (Array.isArray(body.items)) {
      const results: { id: number; ok: boolean; status?: string }[] = [];
      for (const raw of body.items) {
        const id = Number(raw?.id);
        const decision = raw?.decision as Decision;
        if (!id || !["approved", "denied", "submitted"].includes(decision)) {
          results.push({ id, ok: false });
          continue;
        }
        const r = await applyOne(sql, id, decision, raw?.note || "");
        results.push({ id, ok: r.ok, status: r.status });
      }
      return NextResponse.json({ ok: true, results });
    }

    const { id, decision, note } = body;
    if (!id || !["approved", "denied", "submitted"].includes(decision)) {
      return NextResponse.json({ error: "A valid decision is required" }, { status: 400 });
    }
    const r = await applyOne(sql, Number(id), decision, note || "");
    if (!r.ok) {
      return NextResponse.json(
        { error: "This evaluation is not in a state that decision can be applied to" },
        { status: 409 }
      );
    }
    return NextResponse.json({ ok: true, item: { id: Number(id), status: r.status } });
  } catch (e) {
    return errorResponse(e);
  }
}
