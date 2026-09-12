import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, errorResponse } from "@/lib/auth";

// PATCH: edit an assignment's pod, KAM, or client list (Admin)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireRole("ADMIN");
    const id = Number(params.id);
    const body = await req.json();
    const sql = await db();
    if (body.pod !== undefined)
      await sql`UPDATE assignments SET pod = ${body.pod} WHERE id = ${id}`;
    if (body.kamUserId !== undefined) {
      const kamRows = await sql`SELECT name FROM users WHERE id = ${Number(body.kamUserId)} AND role = 'KAM'`;
      if (kamRows.length === 0) {
        return NextResponse.json({ error: "Choose a valid KAM" }, { status: 400 });
      }
      const kamName = (kamRows[0] as { name: string }).name;
      await sql`UPDATE assignments SET kam_user_id = ${Number(body.kamUserId)}, kam = ${kamName} WHERE id = ${id}`;
    }
    if (body.clients !== undefined)
      await sql`UPDATE assignments SET clients = ${JSON.stringify(body.clients)} WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}

// DELETE: remove an assignment (Admin)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireRole("ADMIN");
    const sql = await db();
    await sql`DELETE FROM assignments WHERE id = ${Number(params.id)}`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
