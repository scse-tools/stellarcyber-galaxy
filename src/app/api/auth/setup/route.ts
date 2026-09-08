import { NextResponse } from "next/server";
import { setupSchema } from "@/lib/auth/schemas";
import { countUsers, createUser } from "@/lib/auth/user-repo";
import { createSession } from "@/lib/auth/session-repo";
import { setSessionCookie } from "@/lib/auth/session";
import { errorResponse } from "@/lib/api-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** One-time creation of the first administrator. Refused once any user exists. */
export async function POST(request: Request) {
  try {
    if (countUsers() > 0) {
      return NextResponse.json({ error: "Setup has already been completed." }, { status: 409 });
    }
    const parsed = setupSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input." },
        { status: 400 },
      );
    }
    const admin = createUser({ ...parsed.data, role: "admin" });
    const session = createSession(admin.id);
    const response = NextResponse.json({
      user: { id: admin.id, username: admin.username, role: admin.role, mustChangePassword: false },
    });
    setSessionCookie(response, session.token, session.expiresAt);
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
