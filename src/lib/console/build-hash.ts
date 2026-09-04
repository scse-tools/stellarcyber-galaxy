import { proxiedFetch } from "@/lib/console/fetch";

// The build hash is the AES passphrase the console's own login uses; it is baked into a JS chunk.
const ENCODE_PASSWORD = /encodePassword\(\w+\)\{return \w+\.AES\.encrypt\(\w+,(\w+)\)/;
const BATCH = 12;

const cache = new Map<string, string>();

function hashFrom(js: string): string | null {
  const match = js.match(ENCODE_PASSWORD);
  if (!match) return null;
  const varName = match[1];
  const value = js.match(new RegExp(`\\b${varName}\\s*=\\s*["\`]([0-9a-f]{6,12})["\`]`));
  return value?.[1] ?? null;
}

async function text(url: string): Promise<string> {
  try {
    const response = await proxiedFetch(url);
    return response.ok ? await response.text() : "";
  } catch {
    return "";
  }
}

/** Reads the console's `<origin>` and finds the login build hash, scanning its JS bundles once. */
export async function discoverBuildHash(consoleUrl: string): Promise<string> {
  const origin = new URL(consoleUrl).origin;
  const cached = cache.get(origin);
  if (cached) return cached;

  const shell = await text(`${origin}/`);
  const mainName = shell.match(/src="(main-[A-Z0-9]+\.js)"/i)?.[1];
  const mainJs = mainName ? await text(`${origin}/${mainName}`) : "";

  const direct = hashFrom(mainJs);
  if (direct) return cacheHit(origin, direct);

  const names = new Set<string>([
    ...[...shell.matchAll(/(?:src|href)="(chunk-[A-Z0-9]+\.js)"/gi)].map((m) => m[1]),
    ...[...mainJs.matchAll(/chunk-[A-Z0-9]{8}\.js/g)].map((m) => m[0]),
  ]);
  const list = [...names];

  for (let i = 0; i < list.length; i += BATCH) {
    const batch = await Promise.all(
      list.slice(i, i + BATCH).map(async (chunk) => hashFrom(await text(`${origin}/${chunk}`))),
    );
    const found = batch.find(Boolean);
    if (found) return cacheHit(origin, found);
  }

  throw new Error(
    "Could not find the console's login build hash automatically. Set it manually in the instance's advanced settings.",
  );
}

function cacheHit(origin: string, hash: string): string {
  cache.set(origin, hash);
  return hash;
}

export function primeBuildHash(consoleUrl: string, hash: string): void {
  cache.set(new URL(consoleUrl).origin, hash);
}
