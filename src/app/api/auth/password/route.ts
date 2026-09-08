import { NextResponse } from "next/server";
import { changePasswordSchema } from "@/lib/auth/schemas";
import { getUserRecordByUsername, setUserPassword } from "@/lib/auth/user-repo";
import { verifyPassword } from "@/lib/auth/password";
import { getSessionUser } from "@/lib/auth/session";
import { deleteUserSessions, createSession } from "@/lib/auth/session-repo";
import { setSessionCookie } from "@/lib/auth/session";
import { errorResponse } from "@/lib/api-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Change your own password; re-issues the session so other sessions are invalidated. */
export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const parsed = changePasswordSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input." },
        { status: 400 },
      );
    }
    const record = getUserRecordByUsername(user.username);
    if (!record || !verifyPassword(parsed.data.currentPassword, record.password_hash)) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
    }
    setUserPassword(user.id, parsed.data.newPassword, false);
    deleteUserSessions(user.id);
    const session = createSession(user.id);
    const response = NextResponse.json({ ok: true });
    setSessionCookie(response, session.token, session.expiresAt);
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
