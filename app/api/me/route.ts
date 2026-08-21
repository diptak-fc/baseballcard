import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, errorResponse } from "@/lib/auth";

// GET: the signed-in user's profile and (for CSMs) their assignments.
export async function GET() {
  try {
    const session = await requireRole("ADMIN", "CEO", "CSM");
    const sql = await db();
    const users = await sql`
      SELECT id, email, name, role, title FROM users WHERE id = ${session.uid}`;
    const assignments =
      session.role === "CSM"
        ? await sql`SELECT id, pod, kam, clients FROM assignments WHERE user_id = ${session.uid} ORDER BY pod`
        : [];
    return NextResponse.json({ user: users[0], assignments });
  } catch (e) {
    return errorResponse(e);
  }
}
