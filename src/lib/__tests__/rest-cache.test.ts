import { cached, isOk } from "@/lib/rest/cache";

describe("cached", () => {
  it("coalesces concurrent misses into a single call", async () => {
    let calls = 0;
    const fn = () =>
      new Promise<{ status: string; n: number }>((resolve) =>
        setTimeout(() => resolve({ status: "ok", n: ++calls }), 5),
      );
    const key = `t:concurrent:${Math.random()}`;
    const [a, b, c] = await Promise.all([
      cached(key, 1000, fn),
      cached(key, 1000, fn),
      cached(key, 1000, fn),
    ]);
    expect(calls).toBe(1);
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it("serves the cached value within the TTL, then refetches after it expires", async () => {
    let calls = 0;
    const fn = async () => ({ status: "ok", n: ++calls });
    const key = `t:ttl:${Math.random()}`;

    await cached(key, 20, fn);
    await cached(key, 20, fn);
    expect(calls).toBe(1); // second call hit the cache

    await new Promise((r) => setTimeout(r, 30));
    await cached(key, 20, fn);
    expect(calls).toBe(2); // expired, so it refetched
  });

  it("does not cache results rejected by cacheIf (e.g. errors)", async () => {
    let calls = 0;
    const fn = async () => ({ status: "error", n: ++calls });
    const key = `t:error:${Math.random()}`;

    await cached(key, 1000, fn, isOk);
    await cached(key, 1000, fn, isOk);
    expect(calls).toBe(2); // error result was not cached, so both calls ran
  });

  it("never caches a thrown error", async () => {
    let calls = 0;
    const fn = async (): Promise<{ status: string }> => {
      calls += 1;
      throw new Error("boom");
    };
    const key = `t:throw:${Math.random()}`;

    await expect(cached(key, 1000, fn)).rejects.toThrow("boom");
    await expect(cached(key, 1000, fn)).rejects.toThrow("boom");
    expect(calls).toBe(2);
  });
});
