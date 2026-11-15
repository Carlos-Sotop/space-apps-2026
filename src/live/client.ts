import type { LiveContext } from "@/engine/types";
import contextSnapshotWeather from "@/data/snapshots/space-weather.json";
import earthSnapshot from "@/data/snapshots/earth-events.json";
import moonSnapshot from "@/data/snapshots/moon.json";
import issSnapshot from "@/data/snapshots/iss.json";
import dsnSnapshot from "@/data/snapshots/dsn.json";
import apodSnapshot from "@/data/snapshots/apod.json";
import { issAt, issTrackUrl, parseSscTrack } from "./iss";
import type { LiveApod, LiveDsn, LiveIss, LiveMoon } from "./types";

export function snapshotContext(): LiveContext {
  return {
    fetchedAt: earthSnapshot.fetchedAt,
    snapshot: true,
    spaceWeather: contextSnapshotWeather.items as LiveContext["spaceWeather"],
    earthEvents: earthSnapshot.items as LiveContext["earthEvents"],
    moonDistanceKm: moonSnapshot.moonDistanceKm,
  };
}

async function get<T>(path: string, timeoutMs = 6000): Promise<T> {
  const res = await fetch(path, { signal: AbortSignal.timeout(timeoutMs), headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(String(res.status));
  const type = res.headers.get("content-type") ?? "";
  if (!type.includes("json")) throw new Error("not json");
  return (await res.json()) as T;
}

/** Live context from the Worker, or the bundled snapshot when /api is unreachable. */
export async function fetchLiveContext(): Promise<LiveContext> {
  try {
    const ctx = await get<LiveContext>("/api/live/context");
    if (!Array.isArray(ctx.spaceWeather) || !Array.isArray(ctx.earthEvents)) throw new Error("bad shape");
    return ctx;
  } catch {
    return snapshotContext();
  }
}

type Meta = { snapshot: boolean; fetchedAt: string };

export const snapshots = {
  moon: moonSnapshot as LiveMoon & Meta,
  iss: issSnapshot as LiveIss & Meta,
  dsn: dsnSnapshot as LiveDsn & Meta,
  apod: apodSnapshot as LiveApod & Meta,
};

// The ISS track read straight from NASA SSCWeb, which answers browsers, when the Worker could only give the snapshot.
const ISS_TRACK_REFRESH_MS = 30 * 60_000;
let issTrack: { fetchedAt: number; points: LiveIss[] } | null = null;
let issLoading: Promise<void> | null = null;

/** Tests start from an empty memory. */
export function forgetBrowserIssTrack(): void {
  issTrack = null;
  issLoading = null;
}

async function issFromSscWeb(now: number): Promise<LiveIss | null> {
  if (!issTrack || now - issTrack.fetchedAt > ISS_TRACK_REFRESH_MS || !issAt(issTrack.points, now)) {
    issLoading ??= (async () => {
      const res = await fetch(issTrackUrl(now), { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error(String(res.status));
      const points = parseSscTrack(await res.text());
      if (points.length) issTrack = { fetchedAt: now, points };
    })().finally(() => {
      issLoading = null;
    });
    await issLoading;
  }
  return issTrack ? issAt(issTrack.points, now) : null;
}

/** One small live route (moon, iss, dsn, apod) with its snapshot as fallback. */
export async function fetchLiveRoute<K extends keyof typeof snapshots>(name: K): Promise<(typeof snapshots)[K]> {
  let answer: (typeof snapshots)[K];
  try {
    answer = await get<(typeof snapshots)[K]>(`/api/live/${name}`);
  } catch {
    answer = snapshots[name];
  }
  if (name === "iss" && answer.snapshot) {
    try {
      const now = Date.now();
      const point = await issFromSscWeb(now);
      if (point) return { ...point, snapshot: false, fetchedAt: new Date(now).toISOString() } as (typeof snapshots)[K];
    } catch {
      // SSCWeb did not answer either: keep the snapshot
    }
  }
  return answer;
}
