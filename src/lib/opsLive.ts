import type { LiveContext } from "@/engine/types";
import type { LiveDsn } from "@/live/types";
import type { OpsLive, Storm } from "@/ops/types";

const DONKI = "https://kauai.ccmc.gsfc.nasa.gov/DONKI/";
const DSN_NOW = { title: "NASA Deep Space Network Now", url: "https://eyes.nasa.gov/dsn/dsn.html" };

function severity(kind: Storm["kind"], magnitude?: string): Storm["severity"] {
  if (!magnitude) return 1;
  if (kind === "FLR") return magnitude.startsWith("X") ? 3 : magnitude.startsWith("M") ? 2 : 1;
  const kp = Number(magnitude.replace(/[^0-9.]/g, ""));
  return kp >= 7 ? 3 : kp >= 5 ? 2 : 1;
}

const KIND_WORD: Record<Storm["kind"], string> = { CME: "Coronal mass ejection", FLR: "Solar flare", GST: "Geomagnetic storm" };

/** Live NASA records the Operations phase plays with: DONKI storms, DSN load, EONET events. */
export function toOpsLive(live: LiveContext | null, dsn: LiveDsn | null): OpsLive {
  const storms: Storm[] = (live?.spaceWeather ?? []).slice(0, 6).map((w) => ({
    kind: w.kind,
    severity: severity(w.kind, w.magnitude),
    note: `${KIND_WORD[w.kind]}${w.magnitude ? ` ${w.magnitude}` : ""} on ${w.time.slice(0, 10)}`,
    liveSource: { title: `NASA DONKI ${w.kind} ${w.time.slice(0, 10)}`, url: w.link || DONKI },
  }));
  const dishes = dsn?.stations.flatMap((s) => s.dishes) ?? [];
  const busy = dishes.filter((d) => d.targets.length > 0 || d.downlinkActive).length;
  return {
    storms,
    dsnFreeFraction: dishes.length ? Math.max(0.2, 1 - busy / dishes.length) : undefined,
    dsnSource: dishes.length ? DSN_NOW : undefined,
    moonDistanceKm: live?.moonDistanceKm,
    earthEvents: (live?.earthEvents ?? []).slice(0, 30).map((e) => ({
      id: e.id, title: e.title, category: e.category, lat: e.lat, lon: e.lon,
      source: { title: `NASA EONET: ${e.title}`, url: e.link },
    })),
  };
}
