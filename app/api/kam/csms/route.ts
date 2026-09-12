import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, errorResponse } from "@/lib/auth";

// GET: the CSMs assigned to the signed-in KAM, with their PODs and clients.
export async function GET() {
  try {
    const session = await requireRole("KAM");
    const sql = await db();
    const rows = await sql`
      SELECT u.id, u.name, u.title, u.photo, u.active, a.id AS assignment_id, a.pod, a.clients
      FROM assignments a
      JOIN users u ON u.id = a.user_id
      WHERE a.kam_user_id = ${session.uid} AND u.active = TRUE
      ORDER BY u.name, a.pod`;

    const byUser = new Map<number, any>();
    for (const r of rows as any[]) {
      if (!byUser.has(r.id)) {
        byUser.set(r.id, {
          id: r.id,
          name: r.name,
          title: r.title,
          photo: r.photo,
          assignments: [],
        });
      }
      byUser.get(r.id).assignments.push({ id: r.assignment_id, pod: r.pod, clients: r.clients });
    }
    return NextResponse.json({ csms: Array.from(byUser.values()) });
  } catch (e) {
    return errorResponse(e);
  }
}
