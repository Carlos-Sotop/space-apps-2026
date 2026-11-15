// The ISS track from NASA SSCWeb, shared by the Worker (worker/iss.ts) and the browser (client.ts).
// SSCWeb serves the track ahead of time and answers browsers (Access-Control-Allow-Origin: *). Measured 2026-11-15:
// from this Mac every call answered in about 1 s, from Cloudflare 7 of 10 hung past 8 s, so the browser can ask
// SSCWeb itself when the Worker's answer is the snapshot.
import type { LiveIss } from "./types";

export const ISS_TRACK_BACK_MS = 5 * 60_000;
export const ISS_TRACK_AHEAD_MS = 90 * 60_000;
/** a point serves only within this distance in time from now */
export const ISS_POINT_WINDOW_MS = 2 * 60_000;

const stamp = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");

export const issTrackUrl = (now: number) =>
  `https://sscweb.gsfc.nasa.gov/WS/sscr/2/locations/iss/${stamp(now - ISS_TRACK_BACK_MS)},${stamp(now + ISS_TRACK_AHEAD_MS)}/geo/`;

function values(xml: string, tag: string): number[] {
  const out: number[] = [];
  for (const m of xml.matchAll(new RegExp(`<${tag}>([^<]+)</${tag}>`, "g"))) out.push(parseFloat(m[1]));
  return out;
}

/** Every SSCWeb sample, in time order, with longitudes in -180..180. */
export function parseSscTrack(xml: string): LiveIss[] {
  const lats = values(xml, "Latitude");
  const lons = values(xml, "Longitude");
  const radii = values(xml, "RadialLength");
  const x = values(xml, "X"), y = values(xml, "Y"), z = values(xml, "Z");
  const times = [...xml.matchAll(/<Time>([^<]+)<\/Time>/g)].map((m) => m[1]);
  const out: LiveIss[] = [];
  for (let i = 0; i < lats.length; i++) {
    const lat = lats[i];
    let lon = lons[i];
    if (lat === undefined || lon === undefined || Number.isNaN(lat) || Number.isNaN(lon) || !times[i] || Number.isNaN(Date.parse(times[i]))) continue;
    if (lon > 180) lon -= 360;
    let radius = radii[i];
    if (radius === undefined || Number.isNaN(radius)) radius = x[i] !== undefined ? Math.hypot(x[i], y[i], z[i]) : NaN;
    if (!Number.isFinite(radius)) continue;
    out.push({ lat: Math.round(lat * 1000) / 1000, lon: Math.round(lon * 1000) / 1000, altitudeKm: Math.round(radius - 6371), time: times[i] });
  }
  return out;
}

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
