import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, errorResponse } from "@/lib/auth";
import { KAM_PARAMS } from "@/lib/scoring";

// GET a CSM's feedback on their KAM(s). Never exposed to the KAM being rated
// — only the CSM who wrote it, and the Admin/CEO, may read it.
//   CSM:        ?year=          → their own feedback for every month
//   Admin/CEO:  ?year=&csmUserId=   or   ?year=&month=
export async function GET(req: NextRequest) {
  try {
    const session = await requireRole("ADMIN", "CEO", "CSM");
    const sp = req.nextUrl.searchParams;
    const year = Number(sp.get("year")) || new Date().getFullYear();
    const month = sp.get("month") ? Number(sp.get("month")) : null;
    let csmUserId = sp.get("csmUserId") ? Number(sp.get("csmUserId")) : null;
    const kamUserId = sp.get("kamUserId") ? Number(sp.get("kamUserId")) : null;
    if (session.role === "CSM") csmUserId = session.uid;

    const sql = await db();
    const rows = await sql`
      SELECT f.id, f.csm_user_id, f.kam_user_id, f.year, f.month, f.scores, f.updated_at,
             csm.name AS csm_name, kam.name AS kam_name
      FROM kam_feedback f
      JOIN users csm ON csm.id = f.csm_user_id
      JOIN users kam ON kam.id = f.kam_user_id
      WHERE f.year = ${year}
        AND (${month}::int IS NULL OR f.month = ${month})
        AND (${csmUserId}::int IS NULL OR f.csm_user_id = ${csmUserId})
        AND (${kamUserId}::int IS NULL OR f.kam_user_id = ${kamUserId})
      ORDER BY f.month, kam.name`;
    return NextResponse.json({ feedback: rows });
  } catch (e) {
    return errorResponse(e);
  }
}

// POST: a CSM saves/updates their monthly rating of one of their KAMs.
//   body: { kamUserId, year, month, scores }
// scores: { coordination, collaboration, leadership, knowledgeSharing, meetingAvailability }
// No free text, no approval gate — visible to Admin/CEO as soon as saved.
export async function POST(req: NextRequest) {
  try {
    const session = await requireRole("CSM");
    const { kamUserId, year, month, scores } = await req.json();
    if (!kamUserId || !year || !month) {
      return NextResponse.json({ error: "kamUserId, year and month are required" }, { status: 400 });
    }

    const sql = await db();
    const assigned = await sql`
      SELECT 1 FROM assignments WHERE user_id = ${session.uid} AND kam_user_id = ${kamUserId} LIMIT 1`;
    if (assigned.length === 0) {
      return NextResponse.json({ error: "That KAM is not assigned to you" }, { status: 403 });
    }

    const cleanScores: Record<string, number> = {};
    for (const p of KAM_PARAMS) {
      const v = scores?.[p.key];
      if (v === undefined || v === null || v === "") continue;
      const n = Number(v);
      const max = p.scale[p.scale.length - 1].value;
      if (Number.isNaN(n) || n < 1 || n > max) {
        return NextResponse.json({ error: `${p.label} must be between 1 and ${max}` }, { status: 400 });
      }
      cleanScores[p.key] = n;
    }

    const rows = await sql`
      INSERT INTO kam_feedback (csm_user_id, kam_user_id, year, month, scores, updated_at)
      VALUES (${session.uid}, ${kamUserId}, ${year}, ${month}, ${JSON.stringify(cleanScores)}, NOW())
      ON CONFLICT (csm_user_id, kam_user_id, year, month) DO UPDATE SET
        scores = EXCLUDED.scores,
        updated_at = NOW()
      RETURNING id, csm_user_id, kam_user_id, year, month, scores, updated_at`;

    return NextResponse.json({ feedback: rows[0] });
  } catch (e) {
    return errorResponse(e);
  }
}
