import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db, DEFAULT_PASSWORD } from "@/lib/db";
import { requireRole, errorResponse } from "@/lib/auth";

// GET: full roster with assignments (Admin + CEO) — CSMs plus the KAM list.
export async function GET() {
  try {
    await requireRole("ADMIN", "CEO");
    const sql = await db();
    const people = await sql`
      SELECT id, email, name, role, title, active, photo
      FROM users WHERE role = 'CSM' ORDER BY name`;
    const kams = await sql`
      SELECT id, email, name, role, title, active, photo
      FROM users WHERE role = 'KAM' ORDER BY name`;
    const assignments = await sql`
      SELECT id, user_id, pod, kam, kam_user_id, clients FROM assignments ORDER BY pod`;
    return NextResponse.json({
      people: (people as any[]).map((p) => ({
        ...p,
        assignments: (assignments as any[]).filter((a) => a.user_id === p.id),
      })),
      kams,
    });
  } catch (e) {
    return errorResponse(e);
  }
}

// POST: add a new CSM/CSA or a new KAM (Admin). body: { name, email, title, role?, password? }
export async function POST(req: NextRequest) {
  try {
    await requireRole("ADMIN");
    const { name, email, title, password, role } = await req.json();
    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }
    const userRole = role === "KAM" ? "KAM" : "CSM";
    const defaultTitle = userRole === "KAM" ? "Key Account Manager" : "CSM";
    const sql = await db();
    const hash = await bcrypt.hash(password || DEFAULT_PASSWORD, 10);
    const rows = await sql`
      INSERT INTO users (email, name, password_hash, role, title)
      VALUES (${String(email).toLowerCase()}, ${name}, ${hash}, ${userRole}, ${title || defaultTitle})
      RETURNING id, email, name, role, title, active`;
    return NextResponse.json({ person: rows[0], defaultPassword: password ? undefined : DEFAULT_PASSWORD });
  } catch (e: any) {
    if (String(e?.message || "").includes("duplicate key")) {
      return NextResponse.json({ error: "That email is already in use" }, { status: 409 });
    }
    return errorResponse(e);
  }
}
