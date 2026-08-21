import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import {
  createSessionToken,
  SESSION_COOKIE,
  homeForRole,
  errorResponse,
  Role,
} from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }
    const sql = await db();
    const rows = await sql`
      SELECT id, email, name, password_hash, role, active
      FROM users WHERE LOWER(email) = LOWER(${email}) LIMIT 1`;
    const user = rows[0] as
      | { id: number; email: string; name: string; password_hash: string; role: Role; active: boolean }
      | undefined;

    if (!user || !user.active || !(await bcrypt.compare(password, user.password_hash))) {
      return NextResponse.json({ error: "Incorrect email or password" }, { status: 401 });
    }

    const token = await createSessionToken({
      uid: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
    });

    const res = NextResponse.json({ ok: true, home: homeForRole(user.role) });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 14,
    });
    return res;
  } catch (e) {
    return errorResponse(e);
  }
}
