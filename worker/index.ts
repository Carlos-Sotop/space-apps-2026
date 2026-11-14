// Cloudflare Worker: /api/live/* routes (NASA data, cached, snapshot fallback), /api/chain/* (optional Solana devnet record,
// see chain.ts); everything else is static assets.
import type { LiveContext, LiveEarthEvent, LiveSpaceWeather } from "../src/engine/types.ts";
import type { LiveApod, LiveDsn, LiveIss, LiveMoon } from "../src/live/types.ts";
import { handleScores, type ScoresEnv } from "./scores.ts";
import { isoDay, normalizeApod, normalizeCme, normalizeEonet, normalizeGst, parseDsn, parseHorizons, parseSsc, sscStamp } from "./normalize.ts";
import spaceWeatherSnap from "../src/data/snapshots/space-weather.json";
import earthEventsSnap from "../src/data/snapshots/earth-events.json";
import moonSnap from "../src/data/snapshots/moon.json";
import issSnap from "../src/data/snapshots/iss.json";
import dsnSnap from "../src/data/snapshots/dsn.json";
import apodSnap from "../src/data/snapshots/apod.json";
import { chainRoutes, type ChainEnv } from "./chain.ts";

interface Env extends ChainEnv, ScoresEnv {
  ASSETS?: Fetcher;
  NASA_API_KEY?: string;
  FIRMS_MAP_KEY?: string;
}

type Result<T> = { data: T; snapshot: boolean };

const DAY = 86_400_000;
const UPSTREAM_TIMEOUT_MS = 8000;
/**
 * api.nasa.gov routes (DONKI, APOD) share one key. Without NASA_API_KEY the Worker uses DEMO_KEY, which
 * allowed 10 calls per hour when measured on 2026-11-14 (x-ratelimit-limit). A failed keyed route serves
 * its snapshot for this long before it calls NASA again, so a rate limit can recover.
 */
export const KEYED_SNAPSHOT_TTL_S = 1800;
/** keyless routes retry a failed upstream soon, so a recovered service shows up quickly */
const SNAPSHOT_TTL_S = 60;

async function upstream(url: string): Promise<Response> {
  const res = await fetch(url, { signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS), headers: { "user-agent": "spacedao-worker" } });
  if (!res.ok) throw new Error(`upstream ${res.status}`);
  return res;
}

const upstreamJson = async (url: string): Promise<unknown> => (await upstream(url)).json();
const upstreamText = async (url: string): Promise<string> => (await upstream(url)).text();

const byTime = (a: { time: string }, b: { time: string }) => b.time.localeCompare(a.time);

async function spaceWeather(env: Env): Promise<Result<LiveSpaceWeather[]>> {
  const key = env.NASA_API_KEY || "DEMO_KEY";
  const now = new Date();
  const range = `startDate=${isoDay(new Date(now.getTime() - 30 * DAY))}&endDate=${isoDay(now)}&api_key=${key}`;
  try {
    // DONKI/FLR answered 404 on 2026-11-14 (docs/DATA_SOURCES.md), so it is not called: each call spends key quota.
    const [cme, gst] = await Promise.allSettled([
      upstreamJson(`https://api.nasa.gov/DONKI/CME?${range}`),
      upstreamJson(`https://api.nasa.gov/DONKI/GST?${range}`),
    ]);
    if (cme.status === "rejected" && gst.status === "rejected") throw new Error("DONKI unavailable");
    const items = [
      ...(cme.status === "fulfilled" ? normalizeCme(cme.value).sort(byTime).slice(0, 12) : []),
      ...(gst.status === "fulfilled" ? normalizeGst(gst.value).sort(byTime).slice(0, 6) : []),
    ];
    return { data: items, snapshot: false };
  } catch {
    return { data: spaceWeatherSnap.items as LiveSpaceWeather[], snapshot: true };
  }
}

async function earthEvents(): Promise<Result<LiveEarthEvent[]>> {
  try {
    const raw = await upstreamJson("https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=80&days=30");
    const items = normalizeEonet(raw);
    if (!items.length) throw new Error("empty");
    return { data: items, snapshot: false };
  } catch {
    return { data: earthEventsSnap.items as LiveEarthEvent[], snapshot: true };
  }
}

async function moon(): Promise<Result<LiveMoon>> {
  const now = new Date();
  const url = `https://ssd.jpl.nasa.gov/api/horizons.api?format=json&COMMAND='301'&EPHEM_TYPE=OBSERVER&CENTER='500@399'&START_TIME=${isoDay(now)}&STOP_TIME=${isoDay(new Date(now.getTime() + DAY))}&STEP_SIZE='1d'&QUANTITIES='20'`;
  try {
    const parsed = parseHorizons(await upstreamJson(url));
    if (!parsed) throw new Error("parse");
    return { data: parsed, snapshot: false };
  } catch {
    return { data: { moonDistanceKm: moonSnap.moonDistanceKm, lightTimeS: moonSnap.lightTimeS }, snapshot: true };
  }
}

async function iss(): Promise<Result<LiveIss>> {
  const now = new Date();
  try {
    const xml = await upstreamText(`https://sscweb.gsfc.nasa.gov/WS/sscr/2/locations/iss/${sscStamp(new Date(now.getTime() - 300_000))},${sscStamp(now)}/geo/`);
    const parsed = parseSsc(xml);
    if (!parsed) throw new Error("parse");
    return { data: parsed, snapshot: false };
  } catch {
    const { lat, lon, altitudeKm, time } = issSnap;
    return { data: { lat, lon, altitudeKm, time }, snapshot: true };
  }
}

async function dsn(): Promise<Result<LiveDsn>> {
  try {
    const parsed = parseDsn(await upstreamText("https://eyes.nasa.gov/dsn/data/dsn.xml"));
    if (!parsed) throw new Error("parse");
    return { data: parsed, snapshot: false };
  } catch {
    return { data: { stations: dsnSnap.stations }, snapshot: true };
  }
}

async function apod(env: Env): Promise<Result<LiveApod>> {
  const key = env.NASA_API_KEY || "DEMO_KEY";
  const now = new Date();
  for (const d of [now, new Date(now.getTime() - DAY)]) {
    try {
      const parsed = normalizeApod(await upstreamJson(`https://api.nasa.gov/planetary/apod?api_key=${key}&date=${isoDay(d)}`));
      if (parsed) return { data: parsed, snapshot: false };
    } catch {
      // try the previous day, then the snapshot
    }
  }
  const { title, url, mediaType, date } = apodSnap;
  return { data: { title, url, mediaType, date }, snapshot: true };
}

type Body = Record<string, unknown>;
/** reads another live route through its own cache entry, so the context never calls NASA a second time */
type Sub = (path: string) => Promise<Body>;

async function context(_env: Env, sub: Sub): Promise<Result<LiveContext>> {
  const [sw, ee, mn] = await Promise.all([sub("/api/live/space-weather"), sub("/api/live/earth-events"), sub("/api/live/moon")]);
  const spaceWeather = Array.isArray(sw.items) ? (sw.items as LiveSpaceWeather[]) : (spaceWeatherSnap.items as LiveSpaceWeather[]);
  const earthEvents = Array.isArray(ee.items) ? (ee.items as LiveEarthEvent[]) : (earthEventsSnap.items as LiveEarthEvent[]);
  const moonDistanceKm = typeof mn.moonDistanceKm === "number" ? mn.moonDistanceKm : moonSnap.moonDistanceKm;
  const snapshot = sw.snapshot !== false || ee.snapshot !== false || mn.snapshot !== false;
  return { snapshot, data: { fetchedAt: new Date().toISOString(), snapshot, spaceWeather, earthEvents, moonDistanceKm } };
}

interface Route {
  ttlS: number;
  /** calls api.nasa.gov with the shared key: a failure backs off for KEYED_SNAPSHOT_TTL_S */
  keyed?: boolean;
  run: (env: Env, sub: Sub) => Promise<Result<unknown>>;
}

const ROUTES: Record<string, Route> = {
  "/api/live/space-weather": { ttlS: 3600, keyed: true, run: spaceWeather },
  "/api/live/earth-events": { ttlS: 1800, run: () => earthEvents() },
  "/api/live/moon": { ttlS: 21_600, run: () => moon() },
  "/api/live/iss": { ttlS: 120, run: () => iss() },
  "/api/live/dsn": { ttlS: 60, run: () => dsn() },
  "/api/live/apod": { ttlS: 21_600, keyed: true, run: apod },
  "/api/live/context": { ttlS: 1800, run: context },
};

function json(body: unknown, ttlS: number, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": `public, max-age=${ttlS}` },
  });
}

async function handleLive(request: Request, env: Env, ctx: ExecutionContext, route: Route): Promise<Response> {
  const cache = (caches as unknown as { default: Cache }).default;
  const cacheKey = new Request(new URL(request.url).toString(), { method: "GET" });
  try {
    const hit = await cache.match(cacheKey);
    if (hit) return hit;
  } catch {
    // cache unavailable (local dev): continue without it
  }
  try {
    const sub: Sub = async (path) => {
      const subRoute = ROUTES[path];
      if (!subRoute) return {};
      return (await (await handleLive(new Request(new URL(path, request.url).toString()), env, ctx, subRoute)).json()) as Body;
    };
    const { data, snapshot } = await route.run(env, sub);
    const payload = Array.isArray(data) || typeof data !== "object" || data === null
      ? { items: data, snapshot, fetchedAt: new Date().toISOString() }
      : { ...(data as object), snapshot, fetchedAt: (data as { fetchedAt?: string }).fetchedAt ?? new Date().toISOString() };
    const res = json(payload, snapshot ? (route.keyed ? KEYED_SNAPSHOT_TTL_S : SNAPSHOT_TTL_S) : route.ttlS);
    try {
      ctx.waitUntil(cache.put(cacheKey, res.clone()));
    } catch {
      // ignore cache write failures
    }
    return res;
  } catch {
    return json({ error: "unavailable", snapshot: true, fetchedAt: new Date().toISOString() }, 30, 503);
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      const url = new URL(request.url);
      if (url.pathname.startsWith("/api/chain/")) return await chainRoutes.handle(request, env);
      if (url.pathname.replace(/\/$/, "") === "/api/scores") return await handleScores(request, env);
      if (request.method === "GET" && url.pathname.startsWith("/api/")) {
        const route = ROUTES[url.pathname.replace(/\/$/, "")];
        if (route) return await handleLive(request, env, ctx, route);
        return json({ error: "not found" }, 0, 404);
      }
      if (env.ASSETS) return await env.ASSETS.fetch(request);
      return new Response("Not found", { status: 404 });
    } catch {
      return json({ error: "internal" }, 0, 500);
    }
  },
} satisfies ExportedHandler<Env>;

