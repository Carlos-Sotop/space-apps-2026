// The ISS position for /api/live/iss, from NASA SSCWeb.
// SSCWeb serves the ISS track ahead of time (measured 2026-11-15: 90 one-minute points for the next 90 minutes in
// under 1 s), while from Cloudflare 7 of 10 calls hung past the 8 s timeout. So the Worker fetches the track once,
// keeps it in memory, and serves the point for the current minute: one good call covers the next hour.
import type { LiveIss } from "../src/live/types.ts";
import { issAt, issTrackUrl, parseSscTrack } from "../src/live/iss.ts";

export { issAt, issTrackUrl } from "../src/live/iss.ts";

/** a track this old is fetched again; while that fails, the old one keeps serving */
export const ISS_TRACK_REFRESH_MS = 30 * 60_000;
const TRY_TIMEOUT_MS = 2500;
const TRIES = 2;

let track: { fetchedAt: number; points: LiveIss[] } | null = null;

/** Tests start from an empty memory. */
export function forgetIssTrack(): void {
  track = null;
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
