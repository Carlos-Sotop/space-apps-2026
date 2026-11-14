import type { Catalog, MissionDesign } from "../../engine/types";
import type { OpsScenario, Rng, StormCard } from "../scenario";
import { DAYS_PER_TURN, type OpsLive, type Storm } from "../types";
import { clamp, defOf, shuffle } from "../util";

/** Storms from live DONKI records (most recent first), on seeded turns 2 to maxTurns-2. Without live data: one simulated flare. */
export function placeStorms(rng: Rng, live: OpsLive | undefined, maxTurns: number): Map<number, Storm> {
  const list: Storm[] = live?.storms?.length
    ? live.storms.slice(0, 3)
    : [{ kind: "FLR", severity: 2, note: "Solar flare forecast (simulated)" }];
  const turns: number[] = [];
  for (let t = 2; t <= Math.max(2, maxTurns - 2); t++) turns.push(t);
  const picked = shuffle(turns, rng).slice(0, list.length);
  const out = new Map<number, Storm>();
  picked.forEach((t, i) => out.set(t, list[i]));
  return out;
}

/** Smooth 0..1 signal whose share of values at or above 0.5 is about `fraction`. */
export function periodicSignal(day: number, periodDays: number, phase: number, fraction: number): number {
  const f = clamp(fraction, 0.02, 0.98);
  const c = Math.cos(Math.PI * f);
  const x = Math.cos((2 * Math.PI * day) / periodDays + phase);
  return x >= c ? 0.5 + (0.5 * (x - c)) / (1 - c) : (0.5 * (x + 1)) / (c + 1);
}

export function dsnSeries(rng: Rng, base: number, spread: number): number {
  return clamp(base + (rng() - 0.5) * 2 * spread, 0.3, 1);
}

/** 40 percent of what the design could return over the phase, rounded to 10 (at least 10). */
export function returnTarget(design: MissionDesign, catalog: Catalog, sc: OpsScenario, maxTurns: number, dsn = 0.7): number {
  const days = maxTurns * DAYS_PER_TURN;
  let make = 0;
  let send = 0;
  for (const id of design.moduleIds) {
    const kind = sc.moduleKinds[id];
    const def = kind ? defOf(sc, kind) : undefined;
    const m = catalog.modules.find((x) => x.id === id);
    if (!def || !m) continue;
    if (def.traits.includes("instrument")) make += (m.dataGbPerDay ?? 0) * days;
    if (def.traits.includes("relay") || def.traits.includes("direct")) send += (m.downlinkGbPerDay ?? 0) * days * dsn;
  }
  const raw = 0.4 * Math.min(make, send);
  return Math.max(10, Math.round(raw / 10) * 10);
}

export const stormCardPowerDown = (): StormCard => ({
  title: "Solar storm incoming",
  shelter: { label: "Shelter: power down science this turn", hint: "No data or science this turn, no damage" },
  work: { label: "Keep working", hint: "Structures with no berm next to them lose health" },
});

export const lerp = (rng: Rng, lo: number, hi: number) => Math.round(lo + rng() * (hi - lo));
