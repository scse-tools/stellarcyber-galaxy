import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { resolveSession } from "@/lib/auth/session-repo";
import type { SessionUser } from "@/lib/auth/types";

export const SESSION_COOKIE = "galaxy_session";

function baseCookie() {
  return { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" };
}

export function setSessionCookie(response: NextResponse, token: string, expiresAt: Date): void {
  response.cookies.set(SESSION_COOKIE, token, { ...baseCookie(), expires: expiresAt });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE, "", { ...baseCookie(), maxAge: 0 });
}

function tokenFromRequest(request: Request): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    if (part.slice(0, index).trim() === SESSION_COOKIE) {
      return decodeURIComponent(part.slice(index + 1).trim());
    }
  }
  return null;
}

/** The signed-in user for an API request, or null. */
export async function getSessionUser(request: Request): Promise<SessionUser | null> {
  const token = tokenFromRequest(request);
  return token ? resolveSession(token) : null;
}

/** For server components / pages: reads the cookie via next/headers. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  return token ? resolveSession(token) : null;
}

/** Guard: returns the user, or a 401 response to return directly from the route. */
export async function requireUser(request: Request): Promise<SessionUser | NextResponse> {
  const user = await getSessionUser(request);
  return user ?? NextResponse.json({ error: "Authentication required." }, { status: 401 });
}

/** Guard: returns the user only when they are an administrator. */
export async function requireAdmin(request: Request): Promise<SessionUser | NextResponse> {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  }
  return user;
}

export function isGuardFailure(value: SessionUser | NextResponse): value is NextResponse {
  return value instanceof NextResponse;
}
