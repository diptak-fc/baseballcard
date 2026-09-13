import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, errorResponse } from "@/lib/auth";
import { SELF_KAM_CATEGORIES, MAX_NOTE_WORDS, wordCount } from "@/lib/scoring";

// GET evaluations — these are now the Director-published, KAM-derived
// "official" combined record (8 categories: the original six plus
// Results-Driven and Follow Through).
//   ?year=2026&month=8       → that month, all CSMs   (Admin/CEO)
//   ?year=2026&userId=5      → whole year for one CSM (Admin/CEO)
//   ?year=2026               → whole year, all CSMs   (Admin/CEO)
//   CSMs always receive only their own rows, and only ones the CEO has
//   approved are shown to them; drafts/pending ones are hidden.
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

// POST: the Director publishes a CSM's combined monthly record to the CEO.
//   body: { userId, year, month, note? }
//
// The Director no longer enters scores. Instead this computes the "official"
// score as the mean, per category, across every KAM evaluation submitted for
// this CSM this month (there is normally one assigned KAM, but this averages
// across all of them if more than one contributed). The Director may attach
// an optional note (max 500 words) — their own commentary, not a score.
// Publishing requires at least one submitted (or already-approved) KAM
// evaluation to exist for that CSM/month; an already-approved record is
// locked and cannot be re-published.
export async function POST(req: NextRequest) {
  try {
    await requireRole("ADMIN");
    const { userId, year, month, note } = await req.json();
    if (!userId || !year || !month) {
      return NextResponse.json({ error: "userId, year and month are required" }, { status: 400 });
    }

    if (typeof note === "string" && wordCount(note) > MAX_NOTE_WORDS) {
      return NextResponse.json(
        { error: `Your note is over ${MAX_NOTE_WORDS} words` },
        { status: 400 }
      );
    }

    const sql = await db();

    const existing = await sql`
      SELECT id, status FROM evaluations
      WHERE user_id = ${userId} AND year = ${year} AND month = ${month}`;
    const current = existing[0] as { id: number; status: string } | undefined;

    if (current?.status === "approved") {
      return NextResponse.json(
        { error: "This month is already approved by the CEO and locked" },
        { status: 409 }
      );
    }

    const kamRows = await sql`
      SELECT scores FROM kam_evaluations
      WHERE csm_user_id = ${userId} AND year = ${year} AND month = ${month}
        AND status IN ('submitted', 'approved')`;

    if (kamRows.length === 0) {
      return NextResponse.json(
        { error: "No KAM evaluation has been submitted for this CSM this month yet — nothing to publish." },
        { status: 400 }
      );
    }

    const combined: Record<string, number> = {};
    for (const c of SELF_KAM_CATEGORIES) {
      const vals = (kamRows as any[])
        .map((r) => (r.scores as Record<string, number> | null)?.[c.key])
        .filter((v): v is number => typeof v === "number" && !Number.isNaN(v));
      if (vals.length > 0) {
        combined[c.key] = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
      }
    }

    const rows = await sql`
      INSERT INTO evaluations (user_id, year, month, scores, feedback, status, submitted_at, updated_at)
      VALUES (${userId}, ${year}, ${month}, ${JSON.stringify(combined)},
              ${note || ""}, 'submitted', NOW(), NOW())
      ON CONFLICT (user_id, year, month) DO UPDATE SET
        scores = EXCLUDED.scores,
        feedback = EXCLUDED.feedback,
        status = 'submitted',
        submitted_at = NOW(),
        ceo_note = '',
        decided_at = NULL,
        updated_at = NOW()
      RETURNING id, user_id, year, month, scores, feedback, status, ceo_note, submitted_at, decided_at`;

    return NextResponse.json({ evaluation: rows[0] });
  } catch (e) {
    return errorResponse(e);
  }
}
