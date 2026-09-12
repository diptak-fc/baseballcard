import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, errorResponse } from "@/lib/auth";

// GET: one combined queue for the CEO — the Director's official evaluations
// AND the KAMs' evaluations of their CSMs, tagged by `kind` so the CEO can
// tell them apart. Each KAM item also carries the CSM's self-evaluation for
// that month (if one exists) so the CEO can see the comparison while
// deciding, without a second screen.
export async function GET() {
  try {
    await requireRole("CEO", "ADMIN");
    const sql = await db();

    const directorRows = await sql`
      SELECT e.id, e.user_id AS csm_user_id, e.year, e.month, e.scores, e.feedback, e.status,
             e.ceo_note, e.submitted_at, e.decided_at, u.name, u.title, u.photo
      FROM evaluations e
      JOIN users u ON u.id = e.user_id
      WHERE e.status IN ('submitted', 'approved', 'denied')
      ORDER BY (e.status = 'submitted') DESC, e.submitted_at DESC NULLS LAST
      LIMIT 300`;

    const kamRows = await sql`
      SELECT k.id, k.csm_user_id, k.kam_user_id, k.year, k.month, k.scores, k.status,
             k.ceo_note, k.submitted_at, k.decided_at, csm.name, csm.title, csm.photo,
             kam.name AS kam_name,
             s.scores AS self_scores
      FROM kam_evaluations k
      JOIN users csm ON csm.id = k.csm_user_id
      JOIN users kam ON kam.id = k.kam_user_id
      LEFT JOIN self_evaluations s
        ON s.user_id = k.csm_user_id AND s.year = k.year AND s.month = k.month
      WHERE k.status IN ('submitted', 'approved', 'denied')
      ORDER BY (k.status = 'submitted') DESC, k.submitted_at DESC NULLS LAST
      LIMIT 300`;

    const items = [
      ...(directorRows as any[]).map((r) => ({ ...r, kind: "director" as const })),
      ...(kamRows as any[]).map((r) => ({ ...r, kind: "kam" as const })),
    ].sort((a, b) => {
      const aPending = a.status === "submitted" ? 0 : 1;
      const bPending = b.status === "submitted" ? 0 : 1;
      if (aPending !== bPending) return aPending - bPending;
      const at = a.submitted_at ? new Date(a.submitted_at).getTime() : 0;
      const bt = b.submitted_at ? new Date(b.submitted_at).getTime() : 0;
      return bt - at;
    });

    return NextResponse.json({ items });
  } catch (e) {
    return errorResponse(e);
  }
}

// POST: record the CEO's decision on either kind of submission.
//   body: { kind: "director" | "kam", id, decision, note? }
export async function POST(req: NextRequest) {
  try {
    await requireRole("CEO");
    const { kind, id, decision, note } = await req.json();
    if (!id || !["approved", "denied"].includes(decision) || !["director", "kam"].includes(kind)) {
      return NextResponse.json({ error: "A valid decision is required" }, { status: 400 });
    }
    const sql = await db();
    const rows =
      kind === "kam"
        ? await sql`
            UPDATE kam_evaluations
            SET status = ${decision}, ceo_note = ${note || ""}, decided_at = NOW(), updated_at = NOW()
            WHERE id = ${Number(id)} AND status = 'submitted'
            RETURNING id, status`
        : await sql`
            UPDATE evaluations
            SET status = ${decision}, ceo_note = ${note || ""}, decided_at = NOW(), updated_at = NOW()
            WHERE id = ${Number(id)} AND status = 'submitted'
            RETURNING id, status`;
    if (rows.length === 0) {
      return NextResponse.json(
        { error: "This evaluation is not awaiting approval" },
        { status: 409 }
      );
    }
    return NextResponse.json({ ok: true, item: rows[0] });
  } catch (e) {
    return errorResponse(e);
  }
}
