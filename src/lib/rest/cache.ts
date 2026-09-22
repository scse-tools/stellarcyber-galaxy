/**
 * A tiny in-memory, per-process cache with single-flight de-duplication, used to pool the
 * per-tile upstream calls (case stats, sensor and connector status) across concurrent viewers.
 *
 * Every connected browser polls each tile on its own timer, so without this each viewer would
 * trigger its own upstream request to the Stellar Cyber console. Here, requests for the same key
 * (instance + tenant + time window) within the TTL share one result, and simultaneous misses
 * collapse onto a single in-flight fetch — so upstream load is bounded by unique keys per TTL
 * rather than by the number of viewers.
 */

/** How long a cached tile result stays fresh. Kept short so a manual refresh still feels live. */
export const STATS_CACHE_TTL_MS = Number(process.env.GALAXY_STATS_CACHE_MS ?? 30_000);

interface Entry<T> {
  value?: T;
  expiresAt: number;
  inflight?: Promise<T>;
}

// Module-scoped on globalThis so the cache survives dev hot-reloads and is shared per process.
const globalForCache = globalThis as typeof globalThis & {
  galaxyStatsCache?: Map<string, Entry<unknown>>;
};
const store = (globalForCache.galaxyStatsCache ??= new Map<string, Entry<unknown>>());

/**
 * Returns a cached value for `key` when fresh; otherwise runs `fn`, sharing a single in-flight
 * promise among concurrent callers. `cacheIf` decides whether a resolved value is worth caching
 * (used to avoid caching error results), and thrown errors are never cached.
 */
export async function cached<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>,
  cacheIf: (value: T) => boolean = () => true,
): Promise<T> {
  const now = Date.now();
  const existing = store.get(key) as Entry<T> | undefined;
  if (existing) {
    if (existing.value !== undefined && existing.expiresAt > now) return existing.value;
    if (existing.inflight) return existing.inflight;
  }

  const promise = fn();
  const entry: Entry<T> = { expiresAt: 0, inflight: promise };
  store.set(key, entry as Entry<unknown>);
  try {
    const value = await promise;
    if (cacheIf(value)) {
      entry.value = value;
      entry.expiresAt = Date.now() + ttlMs;
      entry.inflight = undefined;
    } else {
      store.delete(key);
    }
    return value;
  } catch (error) {
    store.delete(key);
    throw error;
  }
}

/** True when a tile result is worth caching — i.e. it actually reached the console. */
export const isOk = (value: { status?: string }): boolean => value.status === "ok";
