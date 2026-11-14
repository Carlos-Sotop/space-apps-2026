// Pure normalizers for the NASA upstreams. No fetch here, so the snapshot script and tests can reuse them.
import type { LiveEarthEvent, LiveSpaceWeather } from "../src/engine/types.ts";
import type { LiveApod, LiveDsn, LiveIss, LiveMoon } from "../src/live/types.ts";

const AU_KM = 149_597_870.7;
const C_KM_S = 299_792.458;

type Json = Record<string, unknown>;

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : NaN);
const arr = (v: unknown): Json[] => (Array.isArray(v) ? (v as Json[]) : []);

function trimNote(note: string, max = 160): string {
  const clean = note.replace(/\s+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max - 1).trimEnd() + "…" : clean;
}

export function normalizeCme(raw: unknown): LiveSpaceWeather[] {
  return arr(raw).map((r) => ({
    id: str(r.activityID),
    kind: "CME" as const,
    time: str(r.startTime),
    note: trimNote(str(r.note) || "Coronal mass ejection observed"),
    link: str(r.link),
  })).filter((r) => r.id);
}

export function normalizeGst(raw: unknown): LiveSpaceWeather[] {
  return arr(raw).map((r) => {
    const kps = arr(r.allKpIndex).map((k) => num(k.kpIndex)).filter((k) => !Number.isNaN(k));
    const peak = kps.length ? Math.max(...kps) : undefined;
    return {
      id: str(r.gstID),
      kind: "GST" as const,
      time: str(r.startTime),
      note: peak !== undefined ? `Geomagnetic storm, peak Kp ${peak.toFixed(2)}` : "Geomagnetic storm",
      link: str(r.link),
      magnitude: peak !== undefined ? `Kp ${peak.toFixed(1)}` : undefined,
    };
  }).filter((r) => r.id);
}

export function normalizeFlr(raw: unknown): LiveSpaceWeather[] {
  return arr(raw).map((r) => ({
    id: str(r.flrID),
    kind: "FLR" as const,
    time: str(r.beginTime),
    note: trimNote(`Solar flare class ${str(r.classType)} from region ${str(r.activeRegionNum) || "unknown"}`),
    link: str(r.link),
    magnitude: str(r.classType) || undefined,
  })).filter((r) => r.id);
}

export function normalizeEonet(raw: unknown): LiveEarthEvent[] {
  const events = arr((raw as Json | null)?.events);
  const out: LiveEarthEvent[] = [];
  for (const e of events) {
    const geoms = arr(e.geometry).filter((g) => g.type === "Point" && Array.isArray(g.coordinates));
    const last = geoms[geoms.length - 1];
    if (!last) continue;
    const [lon, lat] = last.coordinates as number[];
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    out.push({
      id: str(e.id),
      title: str(e.title),
      category: str(arr(e.categories)[0]?.id) || "other",
      lat,
      lon,
      link: str(e.link),
    });
  }
  return out;
}

export function parseHorizons(raw: unknown): LiveMoon | null {
  const result = str((raw as Json | null)?.result);
  const block = result.split("$$SOE")[1]?.split("$$EOE")[0];
  if (!block) return null;
  const line = block.trim().split("\n")[0]?.trim().split(/\s+/);
  // columns: date time delta deldot
  const delta = line ? parseFloat(line[2] ?? "") : NaN;
  if (!Number.isFinite(delta)) return null;
  const moonDistanceKm = Math.round(delta * AU_KM);
  return { moonDistanceKm, lightTimeS: Math.round((moonDistanceKm / C_KM_S) * 1000) / 1000 };
}

function tagValues(xml: string, tag: string): number[] {
  const out: number[] = [];
  for (const m of xml.matchAll(new RegExp(`<${tag}>([^<]+)</${tag}>`, "g"))) out.push(parseFloat(m[1]));
  return out;
}

export function parseSsc(xml: string): LiveIss | null {
  const lats = tagValues(xml, "Latitude");
  const lons = tagValues(xml, "Longitude");
  const radii = tagValues(xml, "RadialLength");
  const times = [...xml.matchAll(/<Time>([^<]+)<\/Time>/g)].map((m) => m[1]);
  const lat = lats[lats.length - 1];
  let lon = lons[lons.length - 1];
  if (lat === undefined || lon === undefined || Number.isNaN(lat) || Number.isNaN(lon)) return null;
  if (lon > 180) lon -= 360;
  let radius = radii[radii.length - 1];
  if (radius === undefined || Number.isNaN(radius)) {
    const x = tagValues(xml, "X"), y = tagValues(xml, "Y"), z = tagValues(xml, "Z");
    const i = x.length - 1;
    radius = i >= 0 ? Math.hypot(x[i], y[i], z[i]) : NaN;
  }
  if (!Number.isFinite(radius)) return null;
  return {
    lat: Math.round(lat * 1000) / 1000,
    lon: Math.round(lon * 1000) / 1000,
    altitudeKm: Math.round(radius - 6371),
    time: times[times.length - 1] ?? new Date().toISOString(),
  };
}

const STATION_NAMES = new Set(["gdscc", "mdscc", "cdscc"]);

export function parseDsn(xml: string): LiveDsn | null {
  const stations: LiveDsn["stations"] = [];
  // The feed is flat: a <station> element is followed by its <dish> elements until the next <station>.
  const tokens = xml.matchAll(/<station\s+([^>]*?)\/>|<dish\s+([^>]*?)>([\s\S]*?)<\/dish>/g);
  const attr = (s: string, k: string) => s.match(new RegExp(`\\b${k}="([^"]*)"`))?.[1] ?? "";
  for (const t of tokens) {
    if (t[1] !== undefined) {
      const name = attr(t[1], "name");
      if (STATION_NAMES.has(name)) stations.push({ name, friendlyName: attr(t[1], "friendlyName"), dishes: [] });
    } else if (stations.length) {
      const body = t[3];
      const targets = [...body.matchAll(/<target\s+[^>]*?name="([^"]*)"/g)].map((m) => m[1]).filter((n) => n && n !== "DSN");
      const downlinkActive = [...body.matchAll(/<downSignal\s+[^>]*?active="true"/g)].length > 0;
      stations[stations.length - 1].dishes.push({
        name: attr(t[2], "name"),
        activity: attr(t[2], "activity"),
        targets: [...new Set(targets)],
        downlinkActive,
      });
    }
  }
  return stations.length ? { stations } : null;
}

export function normalizeApod(raw: unknown): LiveApod | null {
  const r = raw as Json | null;
  if (!r || !str(r.title) || !str(r.url) || /logo/i.test(str(r.url))) return null;
  return {
    title: str(r.title),
    url: str(r.url),
    mediaType: str(r.media_type) || "image",
    date: str(r.date),
    ...(str(r.copyright) ? { copyright: str(r.copyright).trim() } : {}),
  };
}

export const isoDay = (d: Date) => d.toISOString().slice(0, 10);
export const sscStamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
