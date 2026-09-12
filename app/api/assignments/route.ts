import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, errorResponse } from "@/lib/auth";

// POST: add a pod/KAM/clients assignment to a CSM (Admin).
// body: { userId, pod, kamUserId, clients }
export async function POST(req: NextRequest) {
  try {
    await requireRole("ADMIN");
    const { userId, pod, kamUserId, clients } = await req.json();
    if (!userId || !pod || !kamUserId) {
      return NextResponse.json({ error: "POD and a KAM are required" }, { status: 400 });
    }
    const sql = await db();
    const kamRows = await sql`SELECT name FROM users WHERE id = ${Number(kamUserId)} AND role = 'KAM'`;
    if (kamRows.length === 0) {
      return NextResponse.json({ error: "Choose a valid KAM" }, { status: 400 });
    }
    const kamName = (kamRows[0] as { name: string }).name;
    const rows = await sql`
      INSERT INTO assignments (user_id, pod, kam, kam_user_id, clients)
      VALUES (${Number(userId)}, ${pod}, ${kamName}, ${Number(kamUserId)}, ${JSON.stringify(clients || [])})
      RETURNING id, user_id, pod, kam, kam_user_id, clients`;
    return NextResponse.json({ assignment: rows[0] });
  } catch (e) {
    return errorResponse(e);
  }
}
