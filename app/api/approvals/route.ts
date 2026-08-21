import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, errorResponse } from "@/lib/auth";

// GET: pending queue + decision history (CEO; Admin may view read-only)
export async function GET() {
  try {
    await requireRole("CEO", "ADMIN");
    const sql = await db();
    const rows = await sql`
      SELECT e.id, e.user_id, e.year, e.month, e.scores, e.feedback, e.status,
             e.ceo_note, e.submitted_at, e.decided_at, u.name, u.title, u.photo
      FROM evaluations e
      JOIN users u ON u.id = e.user_id
      WHERE e.status IN ('submitted', 'approved', 'denied')
      ORDER BY (e.status = 'submitted') DESC, e.submitted_at DESC NULLS LAST
      LIMIT 300`;
    return NextResponse.json({ items: rows });
  } catch (e) {
    return errorResponse(e);
  }
}

// POST: record the CEO's decision.  body: { id, decision, note? }
export async function POST(req: NextRequest) {
  try {
    await requireRole("CEO");
    const { id, decision, note } = await req.json();
    if (!id || !["approved", "denied"].includes(decision)) {
      return NextResponse.json({ error: "A valid decision is required" }, { status: 400 });
    }
    const sql = await db();
    const rows = await sql`
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
