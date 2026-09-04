import { NextResponse } from "next/server";
import { getInstanceRow } from "@/lib/instance-repo";
import { establishConsoleSession } from "@/lib/console/session";
import { errorResponse } from "@/lib/api-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

/** Logs the stored credentials into the console and returns the browser auto-login form fields. */
export async function POST(_request: Request, { params }: Context) {
  try {
    const { id } = await params;
    const row = getInstanceRow(id);
    if (!row) return NextResponse.json({ error: "Instance not found." }, { status: 404 });
    return NextResponse.json({ login: await establishConsoleSession(row) });
  } catch (error) {
    return errorResponse(error);
  }
}
