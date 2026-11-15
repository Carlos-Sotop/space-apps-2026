// The ISS position for /api/live/iss, from NASA SSCWeb.
// SSCWeb serves the ISS track ahead of time (measured 2026-11-15: 90 one-minute points for the next 90 minutes in
// under 1 s), while from Cloudflare 7 of 10 calls hung past the 8 s timeout. So the Worker fetches the track once,
// keeps it in memory, and serves the point for the current minute: one good call covers the next hour.
import type { LiveIss } from "../src/live/types.ts";
import { parseSscTrack, sscStamp } from "./normalize.ts";

export const ISS_TRACK_BACK_MS = 5 * 60_000;
export const ISS_TRACK_AHEAD_MS = 90 * 60_000;
/** a track this old is fetched again; while that fails, the old one keeps serving */
export const ISS_TRACK_REFRESH_MS = 30 * 60_000;
/** a point serves only within this distance in time from now */
export const ISS_POINT_WINDOW_MS = 2 * 60_000;
const TRY_TIMEOUT_MS = 2500;
const TRIES = 2;

let track: { fetchedAt: number; points: LiveIss[] } | null = null;

/** Tests start from an empty memory. */
export function forgetIssTrack(): void {
  track = null;
}

export const issTrackUrl = (now: number) =>
  `https://sscweb.gsfc.nasa.gov/WS/sscr/2/locations/iss/${sscStamp(new Date(now - ISS_TRACK_BACK_MS))},${sscStamp(new Date(now + ISS_TRACK_AHEAD_MS))}/geo/`;

/** The track point nearest to now, if one is close enough. */
export function issAt(points: LiveIss[], now: number): LiveIss | null {
  let best: LiveIss | null = null;
  let bestGap = Infinity;
  for (const p of points) {
    const gap = Math.abs(Date.parse(p.time) - now);
    if (gap < bestGap) {
      best = p;
      bestGap = gap;
    }
  }
  return best && bestGap <= ISS_POINT_WINDOW_MS ? best : null;
}

/** The ISS now, from the remembered track or a fresh one. Null when SSCWeb never answered and no track covers now. */
export async function issNow(fetchText: (url: string, timeoutMs: number) => Promise<string>, now = Date.now()): Promise<LiveIss | null> {
  if (track && now - track.fetchedAt < ISS_TRACK_REFRESH_MS) {
    const point = issAt(track.points, now);
    if (point) return point;
  }
  for (let i = 0; i < TRIES; i++) {
    try {
      const points = parseSscTrack(await fetchText(issTrackUrl(now), TRY_TIMEOUT_MS));
      if (points.length) {
        track = { fetchedAt: now, points };
        break;
      }
    } catch {
      // try again, then fall back to the remembered track
    }
  }
  return track ? issAt(track.points, now) : null;
}
