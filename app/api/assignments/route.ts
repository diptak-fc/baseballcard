import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, errorResponse } from "@/lib/auth";

// POST: add a pod/KAM/clients assignment to a CSM (Admin)
export async function POST(req: NextRequest) {
  try {
    await requireRole("ADMIN");
    const { userId, pod, kam, clients } = await req.json();
    if (!userId || !pod || !kam) {
      return NextResponse.json({ error: "POD and KAM are required" }, { status: 400 });
    }
    const sql = await db();
    const rows = await sql`
      INSERT INTO assignments (user_id, pod, kam, clients)
      VALUES (${Number(userId)}, ${pod}, ${kam}, ${JSON.stringify(clients || [])})
      RETURNING id, user_id, pod, kam, clients`;
    return NextResponse.json({ assignment: rows[0] });
  } catch (e) {
    return errorResponse(e);
  }
}
