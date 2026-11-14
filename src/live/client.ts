import type { LiveContext } from "@/engine/types";
import contextSnapshotWeather from "@/data/snapshots/space-weather.json";
import earthSnapshot from "@/data/snapshots/earth-events.json";
import moonSnapshot from "@/data/snapshots/moon.json";
import issSnapshot from "@/data/snapshots/iss.json";
import dsnSnapshot from "@/data/snapshots/dsn.json";
import apodSnapshot from "@/data/snapshots/apod.json";
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

/** One small live route (moon, iss, dsn, apod) with its snapshot as fallback. */
export async function fetchLiveRoute<K extends keyof typeof snapshots>(name: K): Promise<(typeof snapshots)[K]> {
  try {
    return await get<(typeof snapshots)[K]>(`/api/live/${name}`);
  } catch {
    return snapshots[name];
  }
}
