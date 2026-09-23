import { NextResponse } from "next/server";
import { createTemplate, listTemplates } from "@/lib/connector-templates-repo";
import type { ConnectorTemplateInput } from "@/lib/connector-templates";
import { errorResponse } from "@/lib/api-error";
import { requireUser, requireAdmin, isGuardFailure } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export async function GET(request: Request) {
  try {
    const guard = await requireUser(request);
    if (isGuardFailure(guard)) return guard;
    return NextResponse.json({ templates: listTemplates() });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const guard = await requireAdmin(request);
    if (isGuardFailure(guard)) return guard;
    const body = (await request.json().catch(() => null)) as Partial<ConnectorTemplateInput> | null;
    if (!body) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return NextResponse.json({ error: "A template name is required." }, { status: 400 });
    if (!isRecord(body.fields)) return NextResponse.json({ error: "Missing connector fields." }, { status: 400 });
    const mutableFields = Array.isArray(body.mutableFields)
      ? body.mutableFields.filter((field): field is string => typeof field === "string")
      : [];
    if (mutableFields.length === 0) {
      return NextResponse.json({ error: "Select at least one mutable field." }, { status: 400 });
    }

    const template = createTemplate({
      name,
      instanceId: String(body.instanceId ?? ""),
      instanceName: String(body.instanceName ?? ""),
      connectorType: String(body.connectorType ?? ""),
      connectorName: String(body.connectorName ?? ""),
      fields: body.fields,
      mutableFields,
    });
    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
