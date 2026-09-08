import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { countUsers } from "@/lib/auth/user-repo";
import { errorResponse } from "@/lib/api-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Bootstrap probe for the client: is setup needed, and who (if anyone) is signed in. */
export async function GET(request: Request) {
  try {
    const user = await getSessionUser(request);
    return NextResponse.json({ needsSetup: countUsers() === 0, user });
  } catch (error) {
    return errorResponse(error);
  }
}
