// The live routes against a fake NASA and a fake Workers cache: how many upstream calls each request costs.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import worker, { KEYED_SNAPSHOT_TTL_S } from "./index.ts";

type Env = Parameters<typeof worker.fetch>[1];

let calls: string[];
let nasaStatus: number;
let pending: Promise<unknown>[];
const store = new Map<string, Response>();

function fakeFetch(input: RequestInfo | URL): Promise<Response> {
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
  calls.push(`${url.host}${url.pathname}`);
  if (url.host === "api.nasa.gov") {
    return Promise.resolve(nasaStatus === 200 ? Response.json([]) : new Response("{}", { status: nasaStatus }));
  }
  // every other upstream is down: those routes serve their snapshots
  return Promise.resolve(new Response("down", { status: 500 }));
}

const ctx = {
  waitUntil: (p: Promise<unknown>) => void pending.push(p),
  passThroughOnException() {},
} as unknown as ExecutionContext;

async function get(path: string): Promise<{ res: Response; body: Record<string, unknown> }> {
  const res = await worker.fetch(new Request(`https://spacedao.test${path}`), {} as Env, ctx);
  await Promise.all(pending);
  pending = [];
  return { res, body: (await res.clone().json()) as Record<string, unknown> };
}

const donki = () => calls.filter((c) => c.startsWith("api.nasa.gov/DONKI")).length;

beforeEach(() => {
  calls = [];
  pending = [];
  nasaStatus = 200;
  store.clear();
  vi.stubGlobal("fetch", fakeFetch);
  vi.stubGlobal("caches", {
    default: {
      match: async (req: Request) => store.get(req.url)?.clone(),
      put: async (req: Request, res: Response) => void store.set(req.url, res),
    },
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("live NASA routes spend the key sparingly", () => {
  it("one DONKI round serves both the space-weather and the context route", async () => {
    await get("/api/live/space-weather");
    expect(donki()).toBe(2);
    const { body } = await get("/api/live/context");
    expect(donki()).toBe(2);
    expect(Array.isArray(body.spaceWeather)).toBe(true);
  });

  it("does not call DONKI/FLR, which answers 404", async () => {
    await get("/api/live/space-weather");
    expect(calls.some((c) => c.includes("/DONKI/FLR"))).toBe(false);
  });

  it("a rate-limited keyed route serves its snapshot for 30 minutes before calling NASA again", async () => {
    nasaStatus = 429;
    const first = await get("/api/live/space-weather");
    expect(first.body.snapshot).toBe(true);
    expect(first.res.headers.get("cache-control")).toBe(`public, max-age=${KEYED_SNAPSHOT_TTL_S}`);
    const spent = donki();
    await get("/api/live/space-weather");
    await get("/api/live/context");
    expect(donki()).toBe(spent);
  });

  it("a keyless route still retries a failed upstream after a minute", async () => {
    const { res, body } = await get("/api/live/earth-events");
    expect(body.snapshot).toBe(true);
    expect(res.headers.get("cache-control")).toBe("public, max-age=60");
  });
});
