import { afterEach, describe, expect, it, vi } from "vitest";
import { keepAlive } from "./scores.ts";

describe("Supabase keep-alive", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("reads one row of scores with the secret key", async () => {
    const calls: { url: string; key: string | null }[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, key: new Headers(init.headers).get("apikey") });
      return new Response("[]", { status: 200 });
    });
    const status = await keepAlive({ SUPABASE_URL: "https://x.supabase.co/", SUPABASE_SECRET_KEY: "k" });
    expect(status).toBe(200);
    expect(calls).toEqual([{ url: "https://x.supabase.co/rest/v1/scores?select=id&limit=1", key: "k" }]);
  });

  it("does nothing when the ranking is not configured, and never throws", async () => {
    vi.stubGlobal("fetch", async () => { throw new Error("offline"); });
    expect(await keepAlive({})).toBe(0);
    expect(await keepAlive({ SUPABASE_URL: "https://x.supabase.co", SUPABASE_SECRET_KEY: "k" })).toBe(0);
  });
});
