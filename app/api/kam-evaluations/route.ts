import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, errorResponse } from "@/lib/auth";
import { CATEGORIES } from "@/lib/scoring";

// GET KAM evaluations of CSMs.
//   KAM:        ?year=&month=   → this KAM's scores of their own CSMs that month
//   Admin/CEO:  ?year=&userId=  → all KAM scores of one CSM across the year
//               ?year=&month=   → all KAM scores for that month, all CSMs
export async function GET(req: NextRequest) {
  try {
    const session = await requireRole("ADMIN", "CEO", "KAM");
    const sp = req.nextUrl.searchParams;
    const year = Number(sp.get("year")) || new Date().getFullYear();
    const month = sp.get("month") ? Number(sp.get("month")) : null;
    const userId = sp.get("userId") ? Number(sp.get("userId")) : null;
    const kamFilter = session.role === "KAM" ? session.uid : null;

    const sql = await db();
    const rows = await sql`
      SELECT k.id, k.kam_user_id, k.csm_user_id, k.year, k.month, k.scores, k.status,
             k.ceo_note, k.submitted_at, k.decided_at,
             csm.name AS csm_name, kam.name AS kam_name
      FROM kam_evaluations k
      JOIN users csm ON csm.id = k.csm_user_id
      JOIN users kam ON kam.id = k.kam_user_id
      WHERE k.year = ${year}
        AND (${month}::int IS NULL OR k.month = ${month})
        AND (${userId}::int IS NULL OR k.csm_user_id = ${userId})
        AND (${kamFilter}::int IS NULL OR k.kam_user_id = ${kamFilter})
      ORDER BY k.month, csm.name`;

    return NextResponse.json({ evaluations: rows });
  } catch (e) {
    return errorResponse(e);
  }
}

// POST: a KAM saves/submits their monthly score of one of their CSMs.
//   body: { csmUserId, year, month, scores, action: "save" | "submit" }
export async function POST(req: NextRequest) {
  try {
    const session = await requireRole("KAM");
    const { csmUserId, year, month, scores, action } = await req.json();
    if (!csmUserId || !year || !month) {
      return NextResponse.json({ error: "csmUserId, year and month are required" }, { status: 400 });
    }

    const sql = await db();
    // Confirm this KAM is actually assigned to this CSM.
    const assigned = await sql`
      SELECT 1 FROM assignments WHERE user_id = ${csmUserId} AND kam_user_id = ${session.uid} LIMIT 1`;
    if (assigned.length === 0) {
      return NextResponse.json({ error: "This CSM is not assigned to you" }, { status: 403 });
    }

    const cleanScores: Record<string, number> = {};
    for (const c of CATEGORIES) {
      const v = scores?.[c.key];
      if (v !== undefined && v !== null && v !== "") {
        const n = Number(v);
        if (Number.isNaN(n) || n < 0 || n > 10) {
          return NextResponse.json({ error: `${c.label} must be between 0 and 10` }, { status: 400 });
        }
        cleanScores[c.key] = Math.round(n * 10) / 10;
      }
    }

    const existing = await sql`
      SELECT id, status FROM kam_evaluations
      WHERE kam_user_id = ${session.uid} AND csm_user_id = ${csmUserId} AND year = ${year} AND month = ${month}`;
    const current = existing[0] as { id: number; status: string } | undefined;
    if (current?.status === "approved") {
      return NextResponse.json({ error: "This evaluation is approved and locked" }, { status: 409 });
    }

    const submitting = action === "submit";
    if (submitting) {
      const missing = CATEGORIES.filter((c) => cleanScores[c.key] === undefined);
      if (missing.length > 0) {
        return NextResponse.json(
          { error: `Fill in every score before submitting (missing: ${missing.map((m) => m.label).join(", ")})` },
          { status: 400 }
        );
      }
    }

    const status = submitting ? "submitted" : "draft";
    const rows = await sql`
      INSERT INTO kam_evaluations (kam_user_id, csm_user_id, year, month, scores, status, submitted_at, updated_at)
      VALUES (${session.uid}, ${csmUserId}, ${year}, ${month}, ${JSON.stringify(cleanScores)},
              ${status}, ${submitting ? new Date().toISOString() : null}, NOW())
      ON CONFLICT (kam_user_id, csm_user_id, year, month) DO UPDATE SET
        scores = EXCLUDED.scores,
        status = EXCLUDED.status,
        submitted_at = EXCLUDED.submitted_at,
        ceo_note = CASE WHEN EXCLUDED.status = 'submitted' THEN '' ELSE kam_evaluations.ceo_note END,
        decided_at = NULL,
        updated_at = NOW()
      RETURNING id, kam_user_id, csm_user_id, year, month, scores, status, ceo_note, submitted_at, decided_at`;

    return NextResponse.json({ evaluation: rows[0] });
  } catch (e) {
    return errorResponse(e);
  }
}
