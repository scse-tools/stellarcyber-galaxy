import { NextResponse } from "next/server";
import { requireAdmin, isGuardFailure } from "@/lib/auth/session";
import { updateUserSchema } from "@/lib/auth/schemas";
import {
  countAdmins,
  deleteUser,
  getUserById,
  setUserPassword,
  setUserRole,
} from "@/lib/auth/user-repo";
import { deleteUserSessions } from "@/lib/auth/session-repo";
import { errorResponse } from "@/lib/api-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    const admin = await requireAdmin(request);
    if (isGuardFailure(admin)) return admin;
    const { id } = await params;
    const target = getUserById(id);
    if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });

    const parsed = updateUserSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input." },
        { status: 400 },
      );
    }
    // Never allow demoting the last remaining administrator.
    if (parsed.data.role === "user" && target.role === "admin" && countAdmins() <= 1) {
      return NextResponse.json({ error: "The last administrator cannot be demoted." }, { status: 400 });
    }
    if (parsed.data.role) setUserRole(id, parsed.data.role);
    if (parsed.data.password) {
      setUserPassword(id, parsed.data.password, true);
      deleteUserSessions(id); // force re-login with the new password
    }
    return NextResponse.json({ user: getUserById(id) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    const admin = await requireAdmin(request);
    if (isGuardFailure(admin)) return admin;
    const { id } = await params;
    const target = getUserById(id);
    if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });
    if (target.id === admin.id) {
      return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });
    }
    if (target.role === "admin" && countAdmins() <= 1) {
      return NextResponse.json({ error: "The last administrator cannot be deleted." }, { status: 400 });
    }
    deleteUser(id);
    deleteUserSessions(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
