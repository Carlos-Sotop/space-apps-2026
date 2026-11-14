// Refresh src/data/snapshots/*.json from the live NASA APIs. Run: node scripts/make-snapshots.ts
// Optional: NASA_API_KEY=... (defaults to DEMO_KEY). Falls back to RAW_DIR files when a call fails.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { normalizeApod, normalizeCme, normalizeEonet, normalizeFlr, normalizeGst, parseDsn, parseHorizons, parseSsc, isoDay, sscStamp } from "../worker/normalize.ts";

const KEY = process.env.NASA_API_KEY || "DEMO_KEY";
const RAW = process.env.RAW_DIR || "";
const OUT = new URL("../src/data/snapshots/", import.meta.url);
const now = new Date();
const day = (offset: number) => isoDay(new Date(now.getTime() + offset * 86_400_000));

async function get(url: string, rawFile: string, asText = false): Promise<unknown> {
  try {
    const res = await fetch(url, { headers: { "user-agent": "spacedao-snapshots" } });
    if (!res.ok) throw new Error(String(res.status));
    return asText ? await res.text() : await res.json();
  } catch (e) {
    const p = `${RAW}/${rawFile}`;
    if (RAW && existsSync(p)) {
      console.warn(`live call failed (${(e as Error).message}) for ${rawFile}, using raw file`);
      const t = readFileSync(p, "utf8");
      return asText ? t : JSON.parse(t);
    }
    console.warn(`live call failed for ${rawFile}: ${(e as Error).message}`);
    return null;
  }
}

const meta = { snapshot: true, fetchedAt: now.toISOString() };
const save = (name: string, data: unknown) => writeFileSync(new URL(name, OUT), JSON.stringify(data, null, 1) + "\n");

const range = `startDate=${day(-30)}&endDate=${day(0)}&api_key=${KEY}`;
const cme = normalizeCme(await get(`https://api.nasa.gov/DONKI/CME?${range}`, "donki_cme.json"));
const gst = normalizeGst(await get(`https://api.nasa.gov/DONKI/GST?${range}`, "gst.json"));
const flr = normalizeFlr(await get(`https://api.nasa.gov/DONKI/FLR?${range}`, "donki_flr.json"));
const byTime = (a: { time: string }, b: { time: string }) => b.time.localeCompare(a.time);
const spaceWeather = [...cme.sort(byTime).slice(0, 12), ...gst.sort(byTime).slice(0, 6), ...flr.sort(byTime).slice(0, 6)];
save("space-weather.json", { ...meta, items: spaceWeather });

const eonet = normalizeEonet(await get("https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=80&days=30", "eonet.json"));
save("earth-events.json", { ...meta, items: eonet });

const moon = parseHorizons(await get(
  `https://ssd.jpl.nasa.gov/api/horizons.api?format=json&COMMAND='301'&EPHEM_TYPE=OBSERVER&CENTER='500@399'&START_TIME=${day(0)}&STOP_TIME=${day(1)}&STEP_SIZE='1d'&QUANTITIES='20'`,
  "horizons.json"));
save("moon.json", { ...meta, ...(moon ?? { moonDistanceKm: 384400, lightTimeS: 1.282 }) });

const iss = parseSsc(await get(
  `https://sscweb.gsfc.nasa.gov/WS/sscr/2/locations/iss/${sscStamp(new Date(now.getTime() - 300_000))},${sscStamp(now)}/geo/`,
  "ssc.xml", true) as string ?? "");
save("iss.json", { ...meta, ...(iss ?? { lat: 0, lon: 0, altitudeKm: 420, time: now.toISOString() }) });

const dsn = parseDsn(await get("https://eyes.nasa.gov/dsn/data/dsn.xml", "dsn.xml", true) as string ?? "");
save("dsn.json", { ...meta, ...(dsn ?? { stations: [] }) });

let apod = normalizeApod(await get(`https://api.nasa.gov/planetary/apod?api_key=${KEY}&date=${day(0)}`, "apod2.json"));
if (!apod) apod = normalizeApod(await get(`https://api.nasa.gov/planetary/apod?api_key=${KEY}&date=${day(-1)}`, "apod2.json"));
save("apod.json", { ...meta, ...(apod ?? { title: "Astronomy Picture of the Day", url: "https://apod.nasa.gov/apod/astropix.html", mediaType: "other", date: day(0) }) });

console.log(`space weather ${spaceWeather.length}, earth events ${eonet.length}, moon ${moon?.moonDistanceKm}, iss ${iss ? "ok" : "fallback"}, dsn ${dsn?.stations.length ?? 0} stations, apod ${apod?.date}`);
