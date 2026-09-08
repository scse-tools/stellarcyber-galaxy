import { NextResponse } from "next/server";
import { loginSchema } from "@/lib/auth/schemas";
import { getUserRecordByUsername } from "@/lib/auth/user-repo";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session-repo";
import { setSessionCookie } from "@/lib/auth/session";
import { errorResponse } from "@/lib/api-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const parsed = loginSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Enter a username and password." }, { status: 400 });
    }
    const record = getUserRecordByUsername(parsed.data.username);
    // Verify even when the user is unknown to keep the response time uniform.
    const ok = record
      ? verifyPassword(parsed.data.password, record.password_hash)
      : verifyPassword(parsed.data.password, "scrypt$16384$8$1$AAAA$AAAA");
    if (!record || !ok) {
      return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
    }
    const session = createSession(record.id);
    const response = NextResponse.json({
      user: {
        id: record.id,
        username: record.username,
        role: record.role === "admin" ? "admin" : "user",
        mustChangePassword: record.must_change_password === 1,
      },
    });
    setSessionCookie(response, session.token, session.expiresAt);
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
