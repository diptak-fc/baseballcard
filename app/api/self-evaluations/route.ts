import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, errorResponse } from "@/lib/auth";
import { SELF_KAM_CATEGORIES, MAX_SELF_NOTE_WORDS, wordCount } from "@/lib/scoring";

// GET a CSM's self-evaluations.
//   CSM: always their own (?year=).
//   Admin/CEO: ?userId=&year=  — one CSM's whole year (comparative analysis view)
//   Admin/CEO: ?year=&month=  (no userId) — every CSM's self-evaluation for that
//              single month, for the Director's monthly review page.
export async function GET(req: NextRequest) {
  try {
    const session = await requireRole("ADMIN", "CEO", "CSM");
    const sp = req.nextUrl.searchParams;
    const year = Number(sp.get("year")) || new Date().getFullYear();
    const month = sp.get("month") ? Number(sp.get("month")) : null;
    let userId = sp.get("userId") ? Number(sp.get("userId")) : null;
    if (session.role === "CSM") userId = session.uid;

    const sql = await db();

    if (!userId && (session.role === "ADMIN" || session.role === "CEO") && month) {
      const rows = await sql`
        SELECT id, user_id, year, month, scores, notes, submitted_at, updated_at
        FROM self_evaluations WHERE year = ${year} AND month = ${month}
        ORDER BY user_id`;
      return NextResponse.json({ evaluations: rows });
    }

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const rows = await sql`
      SELECT id, user_id, year, month, scores, notes, submitted_at, updated_at
      FROM self_evaluations WHERE user_id = ${userId} AND year = ${year}
      ORDER BY month`;
    return NextResponse.json({ evaluations: rows });
  } catch (e) {
    return errorResponse(e);
  }
}

// POST: a CSM saves/updates their own monthly self-evaluation.
//   body: { year, month, scores, notes }
// notes is { [categoryKey]: string } — each capped at 300 words, optional.
// No approval gate: the CSM can revise this at any time.
export async function POST(req: NextRequest) {
  try {
    const session = await requireRole("CSM");
    const { year, month, scores, notes } = await req.json();
    if (!year || !month) {
      return NextResponse.json({ error: "year and month are required" }, { status: 400 });
    }

    const cleanScores: Record<string, number> = {};
    for (const c of SELF_KAM_CATEGORIES) {
      const v = scores?.[c.key];
      if (v !== undefined && v !== null && v !== "") {
        const n = Number(v);
        if (Number.isNaN(n) || n < 0 || n > 10) {
          return NextResponse.json({ error: `${c.label} must be between 0 and 10` }, { status: 400 });
        }
        cleanScores[c.key] = Math.round(n * 10) / 10;
      }
    }

    const cleanNotes: Record<string, string> = {};
    for (const c of SELF_KAM_CATEGORIES) {
      const n = notes?.[c.key];
      if (typeof n === "string" && n.trim()) {
        if (wordCount(n) > MAX_SELF_NOTE_WORDS) {
          return NextResponse.json(
            { error: `Your note for ${c.label} is over ${MAX_SELF_NOTE_WORDS} words` },
            { status: 400 }
          );
        }
        cleanNotes[c.key] = n.trim();
      }
    }

    const sql = await db();
    const rows = await sql`
      INSERT INTO self_evaluations (user_id, year, month, scores, notes, submitted_at, updated_at)
      VALUES (${session.uid}, ${year}, ${month}, ${JSON.stringify(cleanScores)},
              ${JSON.stringify(cleanNotes)}, NOW(), NOW())
      ON CONFLICT (user_id, year, month) DO UPDATE SET
        scores = EXCLUDED.scores,
        notes = EXCLUDED.notes,
        submitted_at = NOW(),
        updated_at = NOW()
      RETURNING id, user_id, year, month, scores, notes, submitted_at, updated_at`;

    return NextResponse.json({ evaluation: rows[0] });
  } catch (e) {
    return errorResponse(e);
  }
}
