import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, isGuardFailure } from "@/lib/auth/session";
import { getInstanceRow } from "@/lib/instance-repo";
import { fetchTenants, fetchTenantsWith } from "@/lib/rest/tenants";
import { errorResponse } from "@/lib/api-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const previewSchema = z.object({
  instanceId: z.string().optional(),
  consoleUrl: z.string().optional(),
  apiKey: z.string().optional(),
});

/**
 * Lists the tenants an API key can see, so the config form's "Lock to tenant" dropdown can be
 * populated after a key is entered/tested — using the inline key when given, else the stored one.
 */
export async function POST(request: Request) {
  try {
    const guard = await requireAdmin(request);
    if (isGuardFailure(guard)) return guard;

    const parsed = previewSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    const { instanceId, consoleUrl, apiKey } = parsed.data;

    // Prefer the freshly entered key; fall back to the saved instance's stored key.
    if (apiKey && consoleUrl && URL.canParse(consoleUrl)) {
      const id =
        "preview:" + createHash("sha256").update(consoleUrl + apiKey).digest("hex").slice(0, 16);
      return NextResponse.json({ tenants: await fetchTenantsWith({ id, consoleUrl, apiKey }) });
    }
    if (instanceId) {
      const row = getInstanceRow(instanceId);
      if (!row) return NextResponse.json({ error: "Instance not found." }, { status: 404 });
      return NextResponse.json({ tenants: await fetchTenants(row) });
    }
    return NextResponse.json({ error: "A console URL and API key are required." }, { status: 400 });
  } catch (error) {
    return errorResponse(error);
  }
}
