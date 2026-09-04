import { NextResponse } from "next/server";
import { getInstanceRow } from "@/lib/instance-repo";
import { keepaliveConsoleSession } from "@/lib/console/session";
import { errorResponse } from "@/lib/api-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

/** Pings the console to keep the server-held session alive; called on each refresh cycle. */
export async function POST(_request: Request, { params }: Context) {
  try {
    const { id } = await params;
    const row = getInstanceRow(id);
    if (!row) return NextResponse.json({ error: "Instance not found." }, { status: 404 });
    return NextResponse.json({ keepalive: await keepaliveConsoleSession(row) });
  } catch (error) {
    return errorResponse(error);
  }
}
