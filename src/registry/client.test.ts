import { describe, expect, it } from "vitest";
import type { Blueprint } from "@/engine/types";
import { createRegistry, makeCallsign } from "./client";

const bp: Blueprint = { id: "bp-player-abc", name: "Test", authorId: "esa", parentId: null, category: "power", modifiers: [], summary: "s", contentHash: "a".repeat(64), adoptions: 0 };
const entry = { missionId: "moon-base-zero" as const, leadId: "nasa", callsign: "NASA-7K2Q", score: 812.4, grade: "A", success: true, science: 80, safety: 70, efficiency: 60, collaboration: 50 };

function fake(status: number, body: unknown = null) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetch = async (url: string, init: RequestInit) => { calls.push({ url, init }); return new Response(body === null ? null : JSON.stringify(body), { status }); };
  return { calls, fetch };
}
const cfg = { url: "https://x.supabase.co", key: "sb_publishable_test" };

describe("registry client", () => {
  it("is disabled and answers 'not available' without keys", async () => {
    const f = fake(200, []);
    const r = createRegistry({ url: undefined, key: undefined, fetch: f.fetch });
    expect(r.enabled).toBe(false);
    expect(await r.publishBlueprint(bp)).toBe(false);
    expect(await r.listBlueprints()).toEqual([]);
    expect(await r.submitMission(entry)).toBe(false);
    expect(await r.topMissions("moon-base-zero")).toBeNull();
    expect(f.calls).toHaveLength(0);
  });

  it("publishes a blueprint with only the publishable key and snake_case columns", async () => {
    const f = fake(201);
    const r = createRegistry({ ...cfg, fetch: f.fetch });
    expect(await r.publishBlueprint(bp)).toBe(true);
    const { url, init } = f.calls[0];
    expect(url).toBe("https://x.supabase.co/rest/v1/blueprints");
    expect((init.headers as Record<string, string>).apikey).toBe("sb_publishable_test");
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
    const sent = JSON.parse(init.body as string);
    expect(sent).toMatchObject({ id: "bp-player-abc", author_id: "esa", parent_id: null, content_hash: "a".repeat(64) });
    expect(sent.adoptions).toBeUndefined();
    expect(sent.tx_hash).toBeUndefined();
  });

  it("treats a duplicate publish (409) as stored and a server error as not stored", async () => {
    expect(await createRegistry({ ...cfg, fetch: fake(409).fetch }).publishBlueprint(bp)).toBe(true);
    expect(await createRegistry({ ...cfg, fetch: fake(500).fetch }).publishBlueprint(bp)).toBe(false);
  });

  it("never throws when the network fails or times out", async () => {
    const boom = async () => { throw new Error("offline"); };
    const hang = (_u: string, init: RequestInit) => new Promise<Response>((_, rej) => init.signal?.addEventListener("abort", () => rej(new Error("aborted"))));
    const r1 = createRegistry({ ...cfg, fetch: boom });
    expect(await r1.submitMission(entry)).toBe(false);
    expect(await r1.topMissions("orbital-lab")).toBeNull();
    const r2 = createRegistry({ ...cfg, fetch: hang, timeoutMs: 20 });
    expect(await r2.listBlueprints()).toEqual([]);
  });

  it("rounds and clamps scores before posting", async () => {
    const f = fake(201);
    await createRegistry({ ...cfg, fetch: f.fetch }).submitMission({ ...entry, score: 1e9, science: -5, safety: NaN });
    const sent = JSON.parse(f.calls[0].init.body as string);
    expect(sent).toMatchObject({ score: 10000, science: 0, safety: 0, mission_id: "moon-base-zero", lost_at: null, manifest_hash: null });
  });

  it("reads the leaderboard and skips malformed rows", async () => {
    const rows = [
      { id: "1", callsign: "ESA-AAAA", lead_id: "esa", score: 900, grade: "S", success: true, created_at: "2026-11-14T10:00:00Z" },
      { nonsense: true },
      { id: "2", callsign: "NASA-BBBB", lead_id: "nasa", score: 700, grade: "B", success: false, created_at: "2026-11-14T11:00:00Z" },
    ];
    const f = fake(200, rows);
    const top = await createRegistry({ ...cfg, fetch: f.fetch }).topMissions("moon-base-zero", 5);
    expect(top?.map((t) => t.callsign)).toEqual(["ESA-AAAA", "NASA-BBBB"]);
    expect(f.calls[0].url).toContain("mission_id=eq.moon-base-zero");
    expect(f.calls[0].url).toContain("order=score.desc");
    expect(f.calls[0].url).toContain("limit=5");
    expect(await createRegistry({ ...cfg, fetch: fake(200, []).fetch }).topMissions("orbital-lab")).toEqual([]);
  });

  it("maps published blueprints back to the game shape", async () => {
    const rows = [{ id: "bp-player-z", name: "N", author_id: "isro", parent_id: "esa-array", category: "power", modifiers: [{ stat: "moduleMass", op: "mul", value: 0.9 }], summary: "x", content_hash: "b".repeat(64), tx_hash: null, adoptions: 3 }, { id: 5 }];
    const list = await createRegistry({ ...cfg, fetch: fake(200, rows).fetch }).listBlueprints();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: "bp-player-z", authorId: "isro", parentId: "esa-array", adoptions: 3 });
  });

  it("makes callsigns the database accepts", () => {
    const re = /^[A-Za-z0-9-]{3,24}$/;
    for (const n of ["ESA", "Space Corp. (X)", "", "héllo wörld long name"]) expect(makeCallsign(n)).toMatch(re);
    expect(makeCallsign("ESA", () => 0)).toBe("ESA-AAAA");
  });
});
