import type { Catalog, MissionDesign, Module } from "../engine/types";
import type { OpsScenario, ResearchEffect, Rng, StructureDef } from "./scenario";
import { DAYS_PER_TURN, type OpsLogEntry, type OpsState, type Structure, type Tile } from "./types";

export const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

export function hexDist(a: { q: number; r: number }, b: { q: number; r: number }): number {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
}

export const tileIdOf = (q: number, r: number) => `t${q}_${r}`;

const DIRS: [number, number][] = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];

/** The 19 hexes of radius 2: the hub first, then ring 1, then ring 2. */
export function hexCoords(): { q: number; r: number }[] {
  const out = [{ q: 0, r: 0 }];
  for (const radius of [1, 2]) {
    let q = DIRS[4][0] * radius;
    let r = DIRS[4][1] * radius;
    for (let d = 0; d < 6; d++) {
      for (let i = 0; i < radius; i++) {
        out.push({ q, r });
        q += DIRS[d][0];
        r += DIRS[d][1];
      }
    }
  }
  return out;
}

export function shuffle<T>(xs: T[], rng: Rng): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const tileById = (s: { tiles: Tile[] }, id: string): Tile | undefined => s.tiles.find((t) => t.id === id);
export const hubTile = (s: { tiles: Tile[] }): Tile => s.tiles.find((t) => t.q === 0 && t.r === 0) as Tile;
export const defOf = (sc: OpsScenario, kind: string): StructureDef | undefined => sc.structures.find((d) => d.kind === kind);
export const hasTrait = (sc: OpsScenario, st: Structure, trait: string): boolean =>
  (defOf(sc, st.kind)?.traits as string[] | undefined)?.includes(trait) ?? false;

export function moduleOf(catalog: Catalog, id: string | undefined): Module | undefined {
  return id ? catalog.modules.find((m) => m.id === id) : undefined;
}

export interface Stats {
  powerW: number;
  generatesW: number;
  storageWh: number;
  dataGbPerDay: number;
  downlinkGbPerDay: number;
}

export function statsOf(st: Structure, sc: OpsScenario, catalog: Catalog): Stats {
  const m = moduleOf(catalog, st.moduleId);
  const d = defOf(sc, st.kind);
  return {
    powerW: m?.powerW ?? d?.stats?.powerW ?? d?.powerW ?? 0,
    generatesW: m?.generatesW ?? d?.stats?.generatesW ?? 0,
    storageWh: m?.storageWh ?? d?.stats?.storageWh ?? 0,
    dataGbPerDay: m?.dataGbPerDay ?? d?.stats?.dataGbPerDay ?? 0,
    downlinkGbPerDay: m?.downlinkGbPerDay ?? d?.stats?.downlinkGbPerDay ?? 0,
  };
}

/** Switched on and not broken. */
export const isActive = (st: Structure) => st.on && st.health > 0;

export interface Effects {
  ap: number;
  downlinkMul: number;
  generationMul: number;
  healthLossMul: number;
  dataMul: number;
  unlocked: Set<string>;
  powerMulKind: Record<string, number>;
  sciencePerAlert: number;
}

export function effectsOf(s: OpsState, sc: OpsScenario): Effects {
  const fx: Effects = { ap: 0, downlinkMul: 1, generationMul: 1, healthLossMul: 1, dataMul: 1, unlocked: new Set(), powerMulKind: {}, sciencePerAlert: 0 };
  for (const r of s.research) {
    if (!r.unlocked) continue;
    const e: ResearchEffect | undefined = sc.research.find((x) => x.id === r.id)?.effect;
    if (!e) continue;
    fx.ap += e.ap ?? 0;
    fx.downlinkMul *= e.downlinkMul ?? 1;
    fx.generationMul *= e.generationMul ?? 1;
    fx.healthLossMul *= e.healthLossMul ?? 1;
    fx.dataMul *= e.dataMul ?? 1;
    fx.sciencePerAlert += e.sciencePerAlert ?? 0;
    if (e.unlockBuild) fx.unlocked.add(e.unlockBuild);
    if (e.powerMulKind) fx.powerMulKind[e.powerMulKind.kind] = (fx.powerMulKind[e.powerMulKind.kind] ?? 1) * e.powerMulKind.mul;
  }
  return fx;
}

export function addLog(s: OpsState, kind: OpsLogEntry["kind"], text: string, liveSource?: OpsLogEntry["liveSource"]): void {
  s.log.push(liveSource ? { turn: s.turn, kind, text, liveSource } : { turn: s.turn, kind, text });
}

/** Hurts structures picked by a filter: all of them, or one at random. */
export function damage(s: OpsState, pick: (st: Structure) => boolean, amount: number, rng: Rng, mode: "one" | "all"): Structure[] {
  const pool = s.structures.filter((st) => st.health > 0 && pick(st));
  const hit = mode === "all" ? pool : pool.length ? [pool[Math.floor(rng() * pool.length)]] : [];
  for (const st of hit) st.health = Math.max(0, st.health - amount);
  return hit;
}

export const tileLabel = (s: OpsState, tileId: string): string => tileById(s, tileId)?.label ?? tileId;

/** A live shield on the same tile or next to it. */
export function shielded(s: OpsState, sc: OpsScenario, st: Structure): boolean {
  const t = tileById(s, st.tileId);
  if (!t) return false;
  return s.structures.some((o) => {
    if (o.health <= 0 || !hasTrait(sc, o, "shield")) return false;
    const ot = tileById(s, o.tileId);
    return !!ot && hexDist(ot, t) <= 1;
  });
}

/** A working heater on the same tile or next to it. */
export function heated(s: OpsState, sc: OpsScenario, st: Structure): boolean {
  const t = tileById(s, st.tileId);
  if (!t) return false;
  return s.structures.some((o) => {
    if (!isActive(o) || !hasTrait(sc, o, "heater")) return false;
    const ot = tileById(s, o.tileId);
    return !!ot && hexDist(ot, t) <= 1;
  });
}

export function hubStructure(s: OpsState, sc: OpsScenario): Structure | undefined {
  return s.structures.find((st) => st.kind === sc.hubKind);
}

export const flag = (s: OpsState, key: string): number => s.flags[key] ?? 0;
export const bump = (s: OpsState, key: string, by = 1): void => {
  s.flags[key] = (s.flags[key] ?? 0) + by;
};
export const flagCount = (s: OpsState, prefix: string): number =>
  Object.keys(s.flags).filter((k) => k.startsWith(prefix) && s.flags[k] > 0).length;

export const MAX_TURNS_CAP = 15;

/** The operations phase in turns: 3 days each, at most 15. */
export function maxTurnsFor(design: MissionDesign, catalog: Catalog): number {
  const mission = catalog.missions.find((m) => m.id === design.missionId);
  const days = mission?.phases.find((p) => p.id === "operations")?.days ?? mission?.durationDays ?? 30;
  return Math.max(1, Math.min(MAX_TURNS_CAP, Math.ceil(days / DAYS_PER_TURN)));
}
