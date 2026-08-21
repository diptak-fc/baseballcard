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
    if (body.kam !== undefined)
      await sql`UPDATE assignments SET kam = ${body.kam} WHERE id = ${id}`;
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
