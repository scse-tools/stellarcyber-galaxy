import { NextResponse } from "next/server";
import { requireAdmin, isGuardFailure } from "@/lib/auth/session";
import { createUserSchema } from "@/lib/auth/schemas";
import { createUser, getUserRecordByUsername, listUsers } from "@/lib/auth/user-repo";
import { errorResponse } from "@/lib/api-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const guard = await requireAdmin(request);
    if (isGuardFailure(guard)) return guard;
    return NextResponse.json({ users: listUsers() });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const guard = await requireAdmin(request);
    if (isGuardFailure(guard)) return guard;

    const parsed = createUserSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input." },
        { status: 400 },
      );
    }
    if (getUserRecordByUsername(parsed.data.username)) {
      return NextResponse.json({ error: "That username is already taken." }, { status: 409 });
    }
    return NextResponse.json({ user: createUser(parsed.data) }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
