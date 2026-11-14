import type { Catalog, MissionDesign, MissionId, ResourceReport, ScoreBreakdown } from "./types";
import { resolveDesign, strongCapabilities } from "./design";
import { applyStat, effectiveModifiers } from "./modifiers";
import { computeResources } from "./resources";

export interface UnitOutcome {
  category: string;
  scienceValue: number;
  /** Gb planned over the operations phase */
  planned: number;
  returned: number;
  failed: boolean;
  /** true for modules (scaled by destination factor and modifiers), false for rideshares */
  isModule: boolean;
}

export interface ScoreInput {
  success: boolean;
  reachedOperations: boolean;
  objectivesMet: string[];
  units: UnitOutcome[];
  bonusScience: number;
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

export function gradeFor(total: number): string {
  if (total >= 950) return "S";
  if (total >= 800) return "A";
  if (total >= 600) return "B";
  if (total >= 400) return "C";
  return "F";
}

export const ZERO_SCORE: ScoreBreakdown = { science: 0, safety: 0, efficiency: 0, collaboration: 0, total: 0, grade: "F" };

function margin(g: { used: number; capacity: number }): number {
  if (g.capacity > 0) return (g.capacity - g.used) / g.capacity;
  return g.used > 0 ? -1 : 0;
}

export function successProbability(design: MissionDesign, catalog: Catalog): number {
  const r = resolveDesign(design, catalog);
  const mods = effectiveModifiers(design, catalog);
  const launch = clamp((r.vehicle?.reliability ?? 0) * applyStat(1, "launchReliability", mods, { missionId: design.missionId }), 0, 1);
  const arrival = clamp(
    (r.carrier?.reliability ?? 0.98) * (r.destination?.arrivalFactor ?? 1) * applyStat(1, "landingReliability", mods, { missionId: design.missionId }),
    0,
    1,
  );
  const avg = r.modules.length ? r.modules.reduce((s, m) => s + m.reliability, 0) / r.modules.length : 1;
  return launch * arrival * avg;
}

export function scoreFlight(design: MissionDesign, catalog: Catalog, input: ScoreInput, report?: ResourceReport): ScoreBreakdown {
  const r = resolveDesign(design, catalog);
  const mods = effectiveModifiers(design, catalog);
  const rep = report ?? computeResources(design, catalog);
  const mid: MissionId = design.missionId;
  const factor = r.destination?.scienceFactor ?? 1;

  // science
  const objValue = (id: string) =>
    id === r.mission.primaryObjective.id
      ? r.mission.primaryObjective.scienceValue
      : (r.mission.secondaryObjectives.find((o) => o.id === id)?.scienceValue ?? 0);
  const modScience = (id: string) => {
    const m = catalog.modules.find((x) => x.id === id);
    return m ? applyStat(m.scienceValue ?? 0, "scienceValue", mods, { category: m.category, missionId: mid }) * factor : 0;
  };
  const top = (xs: number[], n: number) => [...xs].sort((a, b) => b - a).slice(0, n).reduce((s, x) => s + x, 0);
  const reference =
    r.mission.primaryObjective.scienceValue +
    top(r.mission.secondaryObjectives.map((o) => o.scienceValue), 2) +
    top(r.mission.moduleIds.map(modScience), 3) +
    top(
      r.mission.rideshareOfferIds.map((id) => catalog.rideshareOffers.find((o) => o.id === id)?.scienceValue ?? 0),
      2,
    );
  let returned = input.objectivesMet.reduce((s, id) => s + objValue(id), 0) + input.bonusScience;
  for (const u of input.units) {
    const full = u.isModule
      ? applyStat(u.scienceValue, "scienceValue", mods, { category: u.category as never, missionId: mid }) * factor
      : u.scienceValue;
    const share = !input.reachedOperations ? 0 : u.planned > 0 ? clamp(u.returned / u.planned, 0, 1) : u.failed ? 0 : 1;
    returned += full * share;
  }
  const science = reference > 0 ? clamp((100 * returned) / reference, 0, 100) : 0;

  // safety
  const keys = ["mass", "power", "budget", "data", "comms", "lifetime"] as const;
  const marginScore = keys.reduce((s, k) => s + clamp(margin(rep[k]) / 0.2, 0, 1), 0) / keys.length;
  const safety = 100 * (0.5 * marginScore + 0.5 * successProbability(design, catalog));

  // efficiency
  const treasury = rep.budget.capacity;
  const left = treasury - rep.budget.used;
  const revenue = r.rideshares.reduce((s, o) => s + o.paysMUsd, 0);
  const efficiency =
    treasury > 0 ? 100 * (0.7 * clamp(left / treasury, 0, 1) + 0.3 * clamp(revenue / treasury, 0, 1)) : 0;

  // collaboration
  const used = new Set<string>();
  const cats = new Set(r.modules.map((m) => m.category));
  const usedCaps = new Set<string>(["funding"]);
  if (r.vehicle) usedCaps.add("launch");
  if (r.modules.length) usedCaps.add("spacecraft");
  if (cats.has("lander")) usedCaps.add("landing");
  if (cats.has("habitat")) usedCaps.add("habitat");
  if (cats.has("rover")) usedCaps.add("robotics");
  if (cats.has("instrument") || cats.has("experiment")) {
    usedCaps.add("science");
    if (mid === "earth-guardian") usedCaps.add("earth-observation");
  }
  if (cats.has("comms")) {
    usedCaps.add("comms");
    usedCaps.add("ground-segment");
  }
  for (const a of r.members) {
    const provided =
      r.vehicle?.providerId === a.id ||
      r.modules.some((m) => m.providerId === a.id) ||
      r.rideshares.some((o) => o.actorId === a.id);
    if (provided || strongCapabilities(a).some((c) => usedCaps.has(c))) used.add(a.id);
  }
  const collaboration = Math.min(100, 25 * used.size + 10 * r.rideshares.length + 10 * design.blueprintIds.length);

  const v = design.values;
  const total = Math.round(
    10 * (v.science * science + v.safety * safety + v.cost * efficiency) * (input.success ? 1 : 0.25) + 2 * collaboration,
  );
  return { science, safety, efficiency, collaboration, total, grade: gradeFor(total) };
}

