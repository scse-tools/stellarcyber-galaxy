import { NextResponse } from "next/server";
import { MissingEncryptionKeyError } from "@/lib/crypto";

/** Turns a thrown value into a response without ever echoing secret material. */
export function errorResponse(error: unknown): NextResponse {
  if (error instanceof MissingEncryptionKeyError) {
    return NextResponse.json({ error: error.message }, { status: 503 });
  }
  if (error instanceof SyntaxError) {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }
  const message = error instanceof Error ? error.message : "Unexpected server error.";
  return NextResponse.json({ error: message }, { status: 500 });
}
