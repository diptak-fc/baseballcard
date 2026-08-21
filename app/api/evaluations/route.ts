import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, errorResponse } from "@/lib/auth";
import { CATEGORIES } from "@/lib/scoring";

// GET evaluations.
//   ?year=2026&month=8       → that month, all CSMs   (Admin/CEO)
//   ?year=2026&userId=5      → whole year for one CSM (Admin/CEO)
//   ?year=2026               → whole year, all CSMs   (Admin/CEO)
//   CSMs always receive only their own rows, and only submitted/decided ones
//   are shown with status; drafts are hidden from them.
export async function GET(req: NextRequest) {
  try {
    const session = await requireRole("ADMIN", "CEO", "CSM");
    const sp = req.nextUrl.searchParams;
    const year = Number(sp.get("year")) || new Date().getFullYear();
    const month = sp.get("month") ? Number(sp.get("month")) : null;
    let userId = sp.get("userId") ? Number(sp.get("userId")) : null;

    if (session.role === "CSM") userId = session.uid;

    const sql = await db();
    const rows = await sql`
      SELECT e.id, e.user_id, e.year, e.month, e.scores, e.feedback, e.status,
             e.ceo_note, e.submitted_at, e.decided_at, u.name, u.title, u.photo
      FROM evaluations e
      JOIN users u ON u.id = e.user_id
      WHERE e.year = ${year}
        AND (${month}::int IS NULL OR e.month = ${month})
        AND (${userId}::int IS NULL OR e.user_id = ${userId})
      ORDER BY e.month, u.name`;

    let out = rows as any[];
    if (session.role === "CSM") {
      // CSMs only see evaluations that have been approved by the CEO.
      out = out.filter((r) => r.status === "approved");
    }
    return NextResponse.json({ evaluations: out });
  } catch (e) {
    return errorResponse(e);
  }
}

// POST: create/update a monthly evaluation (Admin).
//   body: { userId, year, month, scores, feedback, action?: "save" | "submit" }
// Rules: approved evaluations are locked; editing a submitted one pulls it
// back to draft; "submit" requires all six scores and moves it to the CEO.
export async function POST(req: NextRequest) {
  try {
    await requireRole("ADMIN");
    const { userId, year, month, scores, feedback, action } = await req.json();
    if (!userId || !year || !month) {
      return NextResponse.json({ error: "userId, year and month are required" }, { status: 400 });
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

    const sql = await db();
    const existing = await sql`
      SELECT id, status FROM evaluations
      WHERE user_id = ${userId} AND year = ${year} AND month = ${month}`;
    const current = existing[0] as { id: number; status: string } | undefined;

    if (current?.status === "approved") {
      return NextResponse.json(
        { error: "This evaluation is approved and locked" },
        { status: 409 }
      );
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
      INSERT INTO evaluations (user_id, year, month, scores, feedback, status, submitted_at, updated_at)
      VALUES (${userId}, ${year}, ${month}, ${JSON.stringify(cleanScores)},
              ${feedback || ""}, ${status},
              ${submitting ? new Date().toISOString() : null}, NOW())
      ON CONFLICT (user_id, year, month) DO UPDATE SET
        scores = EXCLUDED.scores,
        feedback = EXCLUDED.feedback,
        status = EXCLUDED.status,
        submitted_at = EXCLUDED.submitted_at,
        ceo_note = CASE WHEN EXCLUDED.status = 'submitted' THEN '' ELSE evaluations.ceo_note END,
        decided_at = NULL,
        updated_at = NOW()
      RETURNING id, user_id, year, month, scores, feedback, status, ceo_note, submitted_at, decided_at`;

    return NextResponse.json({ evaluation: rows[0] });
  } catch (e) {
    return errorResponse(e);
  }
}
