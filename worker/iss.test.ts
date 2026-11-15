// C8: the live routes on *.workers.dev, where the Workers Cache API does nothing, and the ISS from a remembered track.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import worker from "./index.ts";
import { forgetIssTrack, issAt, issNow, issTrackUrl, ISS_TRACK_REFRESH_MS } from "./iss.ts";
import { forgetAll } from "./memory.ts";
import { parseSscTrack } from "../src/live/iss.ts";

type Env = Parameters<typeof worker.fetch>[1];

const T0 = Date.parse("2026-11-15T17:00:00.000Z");
const minute = (i: number) => new Date(T0 + i * 60_000).toISOString();

/** An SSCWeb answer with one point per minute from `from` to `to` (minutes after T0). */
function track(from: number, to: number): string {
  let xml = "<Coordinates>";
  for (let i = from; i <= to; i++) xml += `<X>1</X><Y>1</Y><Z>1</Z><Latitude>${i}</Latitude><Longitude>${200 + i}</Longitude><RadialLength>6791</RadialLength>`;
  xml += "</Coordinates>";
  for (let i = from; i <= to; i++) xml += `<Time>${minute(i)}</Time>`;
  return xml;
}

describe("SSCWeb track", () => {
  it("parses every sample in order, with longitudes in -180..180", () => {
    const points = parseSscTrack(track(0, 2));
    expect(points).toEqual([
      { lat: 0, lon: -160, altitudeKm: 420, time: minute(0) },
      { lat: 1, lon: -159, altitudeKm: 420, time: minute(1) },
      { lat: 2, lon: -158, altitudeKm: 420, time: minute(2) },
    ]);
  });

  it("picks the point nearest to now, and none when the track is more than 2 minutes away", () => {
    const points = parseSscTrack(track(0, 10));
    expect(issAt(points, T0 + 4 * 60_000 + 20_000)?.time).toBe(minute(4));
    expect(issAt(points, T0 + 13 * 60_000)).toBeNull();
  });

  it("asks for 5 minutes back and 90 minutes ahead", () => {
    expect(issTrackUrl(T0)).toBe("https://sscweb.gsfc.nasa.gov/WS/sscr/2/locations/iss/20261115T165500Z,20261115T183000Z/geo/");
  });
});

describe("issNow", () => {
  beforeEach(() => forgetIssTrack());

  it("one good answer serves the next hour while SSCWeb hangs", async () => {
    const ok = vi.fn(async () => track(-5, 90));
    expect((await issNow(ok, T0))?.time).toBe(minute(0));
    const down = vi.fn(async () => {
      throw new Error("timeout");
    });
    expect((await issNow(down, T0 + 10 * 60_000))?.time).toBe(minute(10));
    expect(down).not.toHaveBeenCalled();
    // past the refresh age it tries again, and still serves the remembered track when that fails
    expect((await issNow(down, T0 + ISS_TRACK_REFRESH_MS + 60_000))?.time).toBe(minute(31));
    expect(down).toHaveBeenCalledTimes(2);
  });

  it("is null when SSCWeb never answered", async () => {
    expect(await issNow(async () => Promise.reject(new Error("timeout")), T0)).toBeNull();
  });

  it("tries a second time when the first call fails", async () => {
    let n = 0;
    const flaky = async () => (n++ === 0 ? Promise.reject(new Error("timeout")) : track(-5, 90));
    expect((await issNow(flaky, T0))?.time).toBe(minute(0));
    expect(n).toBe(2);
  });
});

describe("live routes on *.workers.dev (Cache API is a no-op there)", () => {
  let upstreamCalls: string[];
  const ctx = { waitUntil: () => {}, passThroughOnException() {} } as unknown as ExecutionContext;

  beforeEach(() => {
    forgetAll();
    forgetIssTrack();
    upstreamCalls = [];
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(T0);
    vi.stubGlobal("caches", { default: { match: async () => undefined, put: async () => undefined } });
    vi.stubGlobal("fetch", async (input: RequestInfo | URL) => {
      const url = String(input instanceof Request ? input.url : input);
      upstreamCalls.push(new URL(url).host);
      if (url.includes("sscweb")) return new Response(track(-5, 90), { status: 200 });
      return new Response("down", { status: 500 });
    });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const get = async (path: string) => {
    const res = await worker.fetch(new Request(`https://spacedao.dayon-x.workers.dev${path}`), {} as Env, ctx);
    return { res, body: (await res.json()) as Record<string, unknown> };
  };

  it("answers a repeat from memory, ignoring the query string", async () => {
    const first = await get("/api/live/iss");
    expect(first.body.snapshot).toBe(false);
    expect(first.body.time).toBe(minute(0));
    await get("/api/live/iss?probe=1");
    await get("/api/live/iss/");
    expect(upstreamCalls.filter((h) => h.startsWith("sscweb"))).toHaveLength(1);
  });

  it("keeps the ISS live after the answer expires, from the remembered track", async () => {
    await get("/api/live/iss");
    vi.setSystemTime(T0 + 5 * 60_000);
    const later = await get("/api/live/iss");
    expect(later.body.snapshot).toBe(false);
    expect(later.body.time).toBe(minute(5));
    expect(upstreamCalls.filter((h) => h.startsWith("sscweb"))).toHaveLength(1);
  });

  it("says whether a NASA key is set, never the key", async () => {
    const res = await worker.fetch(new Request("https://spacedao.dayon-x.workers.dev/api/live/config"), { NASA_API_KEY: "secret-value" } as Env, ctx);
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ nasaApiKey: true });
    expect(text).not.toContain("secret-value");
    expect((await get("/api/live/config")).body).toEqual({ nasaApiKey: false });
    const demo = await worker.fetch(new Request("https://spacedao.dayon-x.workers.dev/api/live/config"), { NASA_API_KEY: "DEMO_KEY" } as Env, ctx);
    expect(await demo.json()).toEqual({ nasaApiKey: false });
  });

  it("serves a failed keyless route from memory until its retry time", async () => {
    const first = await get("/api/live/dsn");
    expect(first.body.snapshot).toBe(true);
    await get("/api/live/dsn");
    expect(upstreamCalls.filter((h) => h === "eyes.nasa.gov")).toHaveLength(1);
    vi.setSystemTime(T0 + 61_000);
    await get("/api/live/dsn");
    expect(upstreamCalls.filter((h) => h === "eyes.nasa.gov")).toHaveLength(2);
  });
});
