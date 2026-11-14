// Display formatting only. Data and engine always use kg, W, Wh, $M, Gb, days.
const nf = (maxFrac: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: maxFrac });

function compact(n: number, digits = 1): string {
  const abs = Math.abs(n);
  if (abs >= 1e6) return `${nf(digits).format(n / 1e6)}M`;
  if (abs >= 1e4) return `${nf(digits).format(n / 1e3)}k`;
  return nf(abs >= 100 ? 0 : digits).format(n);
}

export const fmtKg = (kg: number) => (Math.abs(kg) >= 1000 ? `${nf(2).format(kg / 1000)} t` : `${nf(0).format(kg)} kg`);
export const fmtW = (w: number) => (Math.abs(w) >= 1000 ? `${nf(2).format(w / 1000)} kW` : `${nf(0).format(w)} W`);
export const fmtWh = (wh: number) => (Math.abs(wh) >= 1000 ? `${nf(1).format(wh / 1000)} kWh` : `${nf(0).format(wh)} Wh`);
export const fmtMUsd = (m: number) => (Math.abs(m) >= 1000 ? `$${nf(2).format(m / 1000)}B` : `$${nf(m < 10 ? 1 : 0).format(m)}M`);
export const fmtGb = (gb: number) => (Math.abs(gb) >= 1000 ? `${nf(1).format(gb / 1000)} Tb` : `${nf(gb < 10 ? 1 : 0).format(gb)} Gb`);
export const fmtGbPerDay = (gb: number) => `${fmtGb(gb)}/day`;
export const fmtDays = (d: number) => (Math.abs(d) >= 365 ? `${nf(1).format(d / 365)} yr` : `${nf(0).format(d)} d`);
export const fmtPct = (ratio: number, digits = 0) => `${nf(digits).format(ratio * 100)}%`;
export const fmtNum = (n: number) => compact(n);
export const fmtKm = (km: number) => `${nf(0).format(km)} km`;
export const fmtSeconds = (s: number) => (s < 1 ? `${nf(2).format(s)} s` : `${nf(1).format(s)} s`);

import type { ResourceKey } from "@/engine/types";

export const RESOURCE_LABEL: Record<ResourceKey, string> = {
  mass: "Mass", power: "Power", budget: "Budget", data: "Data", comms: "Comms", lifetime: "Lifetime",
};

/** Format a resource amount in its natural unit. Comms values are link coverage percentages. */
export function fmtResource(key: ResourceKey, v: number): string {
  switch (key) {
    case "mass": return fmtKg(v);
    case "power": return fmtW(v);
    case "budget": return fmtMUsd(v);
    case "data": return fmtGbPerDay(v);
    // the engine reports link coverage as a 0-1 fraction
    case "comms": return `${nf(0).format(v * 100)}%`;
    case "lifetime": return fmtDays(v);
  }
}
