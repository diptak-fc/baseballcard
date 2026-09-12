import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requireRole, errorResponse } from "@/lib/auth";

// Change your own password (any signed-in role).
export async function POST(req: NextRequest) {
  try {
    const session = await requireRole("ADMIN", "CEO", "CSM", "KAM");
    const { currentPassword, newPassword } = await req.json();
    if (!currentPassword || !newPassword || String(newPassword).length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters" },
        { status: 400 }
      );
    }
    const sql = await db();
    const rows = await sql`SELECT password_hash FROM users WHERE id = ${session.uid}`;
    const user = rows[0] as { password_hash: string } | undefined;
    if (!user || !(await bcrypt.compare(currentPassword, user.password_hash))) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
    }
    const hash = await bcrypt.hash(String(newPassword), 10);
    await sql`UPDATE users SET password_hash = ${hash} WHERE id = ${session.uid}`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
