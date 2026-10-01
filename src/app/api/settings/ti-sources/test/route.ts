import { NextResponse } from "next/server";
import { getSourceRuntime } from "@/lib/investigation/sources-repo";
import { fetchFromSource } from "@/lib/investigation/ti-fetch";
import { errorResponse } from "@/lib/api-error";
import { requireUser, isGuardFailure } from "@/lib/auth/session";
import { findSource } from "@/lib/investigation/ti-catalog";
import type { ObservableKind } from "@/lib/observables";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A representative sample value per observable kind, used only for the connectivity test.
const SAMPLE: Record<ObservableKind, string> = {
  ip_public: "8.8.8.8",
  ip_private: "10.0.0.1",
  mac: "00:1a:2b:3c:4d:5e",
  domain: "example.com",
  hostname: "example.com",
  url: "http://example.com/",
  hash: "44d88612fea8a8f36de82e1278abb02f",
  email: "test@example.com",
  username: "administrator",
  filename: "sample.exe",
  registry: "HKLM\\Software\\Example",
  geo: "United States",
  reputation: "malicious",
};

export async function POST(request: Request) {
  try {
    const guard = await requireUser(request);
    if (isGuardFailure(guard)) return guard;
    const body = (await request.json().catch(() => null)) as { key?: string } | null;
    if (!body?.key) return NextResponse.json({ error: "key is required." }, { status: 400 });

    const source = getSourceRuntime(body.key);
    if (!source) return NextResponse.json({ error: "Source not found." }, { status: 404 });

    const def = findSource(body.key);
    if (def?.tier === "premium" && !source.apiKey) {
      return NextResponse.json({ ok: false, message: "No API key configured." });
    }

    const kind = source.kinds[0] ?? "domain";
    const result = await fetchFromSource(source.key, kind, SAMPLE[kind], source.apiKey, source.custom);
    const failed = result.verdict === "unknown" && /failed|not supported/i.test(result.summary);
    return NextResponse.json({ ok: !failed, message: `${SAMPLE[kind]}: ${result.summary}` });
  } catch (error) {
    return errorResponse(error);
  }
}
