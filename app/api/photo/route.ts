import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, errorResponse } from "@/lib/auth";

// POST: set (or clear) a profile photo.
//   body: { userId?, dataUrl }  — dataUrl is a small data:image/... string,
//   or null to remove the photo.
// Admins can set anyone's photo; CSMs and KAMs can only set their own.
export async function POST(req: NextRequest) {
  try {
    const session = await requireRole("ADMIN", "CSM", "KAM");
    const { userId, dataUrl } = await req.json();

    const targetId =
      session.role === "ADMIN" && userId ? Number(userId) : session.uid;
    if (session.role !== "ADMIN" && userId && Number(userId) !== session.uid) {
      return NextResponse.json({ error: "You can only change your own photo" }, { status: 403 });
    }

    if (dataUrl !== null && dataUrl !== undefined) {
      if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) {
        return NextResponse.json({ error: "Invalid image" }, { status: 400 });
      }
      if (dataUrl.length > 500_000) {
        return NextResponse.json(
          { error: "Image is too large — please choose a smaller photo" },
          { status: 400 }
        );
      }
    }

    const sql = await db();
    await sql`UPDATE users SET photo = ${dataUrl ?? null} WHERE id = ${targetId}`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
