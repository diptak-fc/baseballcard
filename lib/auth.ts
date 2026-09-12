import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const SESSION_COOKIE = "fc_session";

export type Role = "ADMIN" | "CEO" | "CSM" | "KAM";
export type Session = { uid: number; role: Role; name: string; email: string };

function secretKey(): Uint8Array {
  const raw =
    process.env.AUTH_SECRET ||
    // Fallback keeps the app functional with zero extra config; the derived
    // value is unique per deployment because the connection string is.
    "fc-derived-" + (process.env.DATABASE_URL || "local-dev-secret");
  return new TextEncoder().encode(raw);
}

export async function createSessionToken(payload: Session): Promise<string> {
  return new SignJWT({
    uid: payload.uid,
    role: payload.role,
    name: payload.name,
    email: payload.email,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(secretKey());
}

export async function verifySessionToken(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (typeof payload.uid !== "number" || typeof payload.role !== "string") return null;
    return {
      uid: payload.uid as number,
      role: payload.role as Role,
      name: String(payload.name ?? ""),
      email: String(payload.email ?? ""),
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<Session | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function requireRole(...roles: Role[]): Promise<Session> {
  const s = await getSession();
  if (!s || !roles.includes(s.role)) {
    throw new AuthError(s ? 403 : 401);
  }
  return s;
}

export class AuthError extends Error {
  status: number;
  constructor(status: number) {
    super(status === 401 ? "Not signed in" : "Not allowed");
    this.status = status;
  }
}

export function errorResponse(e: unknown) {
  if (e instanceof AuthError) {
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  const msg = e instanceof Error ? e.message : "Unexpected error";
  return NextResponse.json({ error: msg }, { status: 500 });
}

export function homeForRole(role: Role): string {
  if (role === "ADMIN") return "/admin";
  if (role === "CEO") return "/ceo";
  if (role === "KAM") return "/kam";
  return "/me";
}
