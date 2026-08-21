import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db, DEFAULT_PASSWORD } from "@/lib/db";
import { requireRole, errorResponse } from "@/lib/auth";

// PATCH: edit a CSM's details / reset password / deactivate (Admin)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireRole("ADMIN");
    const id = Number(params.id);
    const body = await req.json();
    const sql = await db();

    if (body.name !== undefined)
      await sql`UPDATE users SET name = ${body.name} WHERE id = ${id} AND role = 'CSM'`;
    if (body.email !== undefined)
      await sql`UPDATE users SET email = ${String(body.email).toLowerCase()} WHERE id = ${id} AND role = 'CSM'`;
    if (body.title !== undefined)
      await sql`UPDATE users SET title = ${body.title} WHERE id = ${id} AND role = 'CSM'`;
    if (body.active !== undefined)
      await sql`UPDATE users SET active = ${!!body.active} WHERE id = ${id} AND role = 'CSM'`;

    let resetTo: string | undefined;
    if (body.resetPassword) {
      const pw: string =
        typeof body.resetPassword === "string" ? body.resetPassword : DEFAULT_PASSWORD;
      resetTo = pw;
      const hash = await bcrypt.hash(pw, 10);
      await sql`UPDATE users SET password_hash = ${hash} WHERE id = ${id} AND role = 'CSM'`;
    }
    return NextResponse.json({ ok: true, resetTo });
  } catch (e: any) {
    if (String(e?.message || "").includes("duplicate key")) {
      return NextResponse.json({ error: "That email is already in use" }, { status: 409 });
    }
    return errorResponse(e);
  }
}

// DELETE: remove a CSM entirely, including their evaluations (Admin)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireRole("ADMIN");
    const sql = await db();
    await sql`DELETE FROM users WHERE id = ${Number(params.id)} AND role = 'CSM'`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
