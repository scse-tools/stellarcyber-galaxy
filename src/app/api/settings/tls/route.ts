import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, isGuardFailure } from "@/lib/auth/session";
import { installCert, readCertInfo } from "@/lib/tls/cert-store";
import { errorResponse } from "@/lib/api-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const installSchema = z.object({
  cert: z.string().min(1, "Certificate is required."),
  key: z.string().min(1, "Private key is required."),
});

export async function GET(request: Request) {
  try {
    const guard = await requireAdmin(request);
    if (isGuardFailure(guard)) return guard;
    return NextResponse.json({ tls: readCertInfo() });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const guard = await requireAdmin(request);
    if (isGuardFailure(guard)) return guard;
    const parsed = installSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input." },
        { status: 400 },
      );
    }
    try {
      return NextResponse.json({ tls: installCert(parsed.data.cert, parsed.data.key) });
    } catch (validationError) {
      return NextResponse.json(
        { error: validationError instanceof Error ? validationError.message : "Invalid certificate." },
        { status: 400 },
      );
    }
  } catch (error) {
    return errorResponse(error);
  }
}
