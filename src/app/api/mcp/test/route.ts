import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse } from "@/lib/api-error";
import { requireAdmin, isGuardFailure } from "@/lib/auth/session";
import { getInstanceRow, readCredentials } from "@/lib/instance-repo";
import { runDiagnostics } from "@/lib/mcp/diagnostics";
import { forgetToken } from "@/lib/mcp/stats";
import { rangeFromBody } from "@/lib/mcp/range-params";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const testSchema = z.object({
  instanceId: z.string().optional(),
  mcpUrl: z.string().optional(),
  apiKey: z.string().optional(),
  tenantId: z.string().optional(),
  toolName: z.string().optional(),
  toolArgs: z.string().optional(),
  from: z.number().optional(),
  to: z.number().optional(),
});

/**
 * Tests one connection end to end. Accepts an `instanceId` (uses the stored, encrypted
 * credentials) and/or inline fields, so the add/edit form can test values before saving.
 */
export async function POST(request: Request) {
  try {
    const guard = await requireAdmin(request);
    if (isGuardFailure(guard)) return guard;
    const parsed = testSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid test request." }, { status: 400 });
    }
    const input = parsed.data;

    const stored = input.instanceId ? getInstanceRow(input.instanceId) : null;
    if (input.instanceId && !stored) {
      return NextResponse.json({ error: "Instance not found." }, { status: 404 });
    }
    const storedCredentials = stored ? readCredentials(stored) : null;

    const config = {
      mcpUrl: input.mcpUrl || stored?.mcpUrl || "",
      apiKey: input.apiKey || storedCredentials?.apiKey || "",
      tenantId: input.tenantId ?? stored?.tenantId ?? null,
      toolName: input.toolName ?? stored?.toolName ?? null,
      toolArgs: input.toolArgs ?? stored?.toolArgs ?? null,
      ...rangeFromBody(input),
    };

    if (!URL.canParse(config.mcpUrl)) {
      return NextResponse.json({ error: "A valid MCP endpoint URL is required." }, { status: 400 });
    }
    if (!config.apiKey) {
      return NextResponse.json(
        { error: "An API key (bearer token) is required to test." },
        { status: 400 },
      );
    }

    // A test always performs a fresh handshake rather than trusting a cached access token.
    if (input.instanceId) forgetToken(input.instanceId);
    return NextResponse.json({ result: await runDiagnostics(config) });
  } catch (error) {
    return errorResponse(error);
  }
}
