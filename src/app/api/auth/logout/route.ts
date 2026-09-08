import { NextResponse } from "next/server";
import { SESSION_COOKIE, clearSessionCookie } from "@/lib/auth/session";
import { deleteSession } from "@/lib/auth/session-repo";
import { errorResponse } from "@/lib/api-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const header = request.headers.get("cookie") ?? "";
    const match = header.split(";").map((p) => p.trim()).find((p) => p.startsWith(`${SESSION_COOKIE}=`));
    if (match) deleteSession(decodeURIComponent(match.slice(SESSION_COOKIE.length + 1)));
    const response = NextResponse.json({ ok: true });
    clearSessionCookie(response);
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
