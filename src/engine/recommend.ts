// Recommended choices for each Mission Control step: they power Quick play and the "Use recommended" buttons.
//
// autoDesign searches destinations, rockets, carriers and parts for the design with the best expected
// score that passes review with margin to spare. recommendStep runs the same search with the player's
// earlier steps held fixed, so each step's advice fits what the player already chose.
import { councilValues } from "./council";
import { coreModuleSets, designMoves, getActor, getLaunchVehicle, getMission, getModule, isCarrierModule, missionCarriers, resolveDesign } from "./design";
import { forecast } from "./forecast";
import { computeResources } from "./resources";
import { scoreFlight, successProbability, type UnitOutcome } from "./score";
import { validateDesign } from "./validate";
import {
  MAX_SECONDARY,
  type Catalog,
  type Coalition,
  type DesignPatch,
  type DesignStep,
  type Mission,
  type MissionDesign,
  type MissionId,
  type Module,
  type ModuleCategory,
  type Objective,
  type Values,
} from "./types";

/** Mission Control steps in play order. */
export const DESIGN_STEPS: DesignStep[] = ["charter", "objectives", "launch", "build", "opentech", "rideshare"];

/** The fields of a design that each step decides. */
export const STEP_FIELDS: Record<DesignStep, (keyof DesignPatch)[]> = {
  charter: ["values"],
  objectives: ["secondaryObjectiveIds"],
  launch: ["destinationId", "launchVehicleId"],
  build: ["moduleIds"],
  opentech: ["blueprintIds"],
  rideshare: ["rideshareIds"],
};

/**
 * Margin the recommended design keeps on mass, power and budget. NASA practice at concept stage is
 * 20-30% (NASA Systems Engineering Handbook, https://www.nasa.gov/reference/systems-engineering-handbook/).
 */
export const RECOMMENDED_MARGIN = 0.25;
/** Share of risk-assessment flights the recommended design should win. */
export const RECOMMENDED_SUCCESS = 0.75;
/** Open designs the recommendation adopts at most. */
const MAX_BLUEPRINTS = 2;
/** Candidates the risk assessment flies per round (two rounds at most), and flights for each. */
const SHORTLIST = 3;
const SCREEN_RUNS = 48;

const SUPPORT: ModuleCategory[] = ["comms", "power", "battery", "thermal", "computer", "adcs"];
const SCIENCE: ModuleCategory[] = ["instrument", "experiment", "isru", "rover", "habitat"];
/** Issues a support part can clear, and the categories that clear them. */
const REPAIRS: Record<string, ModuleCategory[]> = {
  "power-over": ["power", "battery"],
  "power-tight": ["power", "battery"],
  "battery-small": ["battery", "power"],
  "data-over": ["comms", "computer"],
  "data-tight": ["comms", "computer"],
  "comms-under": ["comms"],
  "comms-tight": ["comms"],
  "lifetime-under": ["thermal", "battery"],
  "lifetime-tight": ["thermal", "battery"],
};

/** The charter vote the recommendation assumes: the player votes their own agency's priorities. */
export function recommendedVote(coalition: Coalition, catalog: Catalog): Values {
  return { ...getActor(catalog, coalition.leadId).priorities };
}

/* ------------------------------------------------------------------ */
/* Checks and the expected score                                       */
/* ------------------------------------------------------------------ */

interface Search {
  mission: Mission;
  catalog: Catalog;
  /** fields of the steps the player already decided */
  fixed: DesignPatch;
  objectivesFree: boolean;
  memo: Map<string, { clean: boolean; deficit: number; issues: string[]; blockers: number; merit?: number }>;
}

const keyOf = (d: MissionDesign) =>
  [d.destinationId, d.launchVehicleId, [...d.moduleIds].sort().join(","), d.secondaryObjectiveIds.join(","), d.blueprintIds.join(","), d.rideshareIds.join(",")].join("|");

function meets(req: Objective["requires"], ids: Set<string>, cats: Set<ModuleCategory>): boolean {
  return (req.categories ?? []).every((c) => cats.has(c)) && (!req.moduleIds?.length || req.moduleIds.some((id) => ids.has(id)));
}

function flown(d: MissionDesign, catalog: Catalog): { ids: Set<string>; cats: Set<ModuleCategory> } {
  return { ids: new Set(d.moduleIds), cats: new Set(d.moduleIds.map((id) => getModule(catalog, id).category)) };
}

/** The most valuable secondary objectives the flown modules can meet, in the mission's order. */
function bestSecondaries(d: MissionDesign, s: Search): string[] {
  const { ids, cats } = flown(d, s.catalog);
  const met = s.mission.secondaryObjectives.filter((o) => meets(o.requires, ids, cats));
  const top = new Set([...met].sort((a, b) => b.scienceValue - a.scienceValue || a.id.localeCompare(b.id)).slice(0, MAX_SECONDARY).map((o) => o.id));
  return met.filter((o) => top.has(o.id)).map((o) => o.id);
}

/** Re-picks the objectives when that step is still open. */
const prepare = (d: MissionDesign, s: Search): MissionDesign => (s.objectivesFree ? { ...d, secondaryObjectiveIds: bestSecondaries(d, s) } : d);

function check(d: MissionDesign, s: Search) {
  const key = keyOf(d);
  let hit = s.memo.get(key);
  if (!hit) {
    const found = validateDesign(d, s.catalog);
    const issues = found.map((i) => i.id);
    const blockers = found.filter((i) => i.severity === "blocker").length;
    const rep = computeResources(d, s.catalog);
    const deficit = (["mass", "power", "budget"] as const).reduce((sum, k) => {
      const g = rep[k];
      if (g.capacity <= 0) return sum + (g.used > 0 ? 1 : 0);
      return sum + Math.max(0, g.used / g.capacity - (1 - RECOMMENDED_MARGIN));
    }, 0);
    hit = { clean: issues.length === 0 && deficit === 0, deficit, issues, blockers };
    s.memo.set(key, hit);
  }
  return hit;
}

/** Chance that no mission-ending event strikes, with the design's mitigations. */
function survival(d: MissionDesign, s: Search): number {
  const { ids, cats } = flown(d, s.catalog);
  return s.mission.events.reduce((p, t) => {
    if (t.effect.kind !== "mission-loss") return p;
    const f = (t.mitigatedBy ?? []).reduce((x, m) => ((m.category !== undefined && cats.has(m.category)) || (m.moduleId !== undefined && ids.has(m.moduleId)) ? x * m.factor : x), 1);
    return p * (1 - Math.min(1, t.chance * f));
  }, 1);
}

/**
 * Chance the flight meets the main objective: launch and arrival (perks included), no mission-ending
 * event, a working part in each category the objective needs, and a working radio for at least half the
 * mission (a radio lost half way still returns half the data).
 */
function chance(d: MissionDesign, s: Search): number {
  const r = resolveDesign(d, s.catalog);
  const alive = (ms: Module[]) => 1 - ms.reduce((q, m) => q * (1 - m.reliability), 1);
  const req = s.mission.primaryObjective.requires;
  let p = successProbability({ ...d, moduleIds: r.carrier ? [r.carrier.id] : [] }, s.catalog) * survival(d, s);
  for (const c of req.categories ?? []) if (r.carrier?.category !== c) p *= alive(r.payload.filter((m) => m.category === c));
  if (req.moduleIds?.length) p *= alive(r.payload.filter((m) => req.moduleIds!.includes(m.id)));
  const radios = r.payload.filter((m) => (m.downlinkGbPerDay ?? 0) > 0);
  return radios.length ? p * (1 - 0.5 * (1 - alive(radios))) : 0;
}

/** Expected total score: the score if everything works, discounted by the chance it does. */
function merit(d: MissionDesign, s: Search): number {
  const hit = check(d, s);
  if (hit.merit !== undefined) return hit.merit;
  const r = resolveDesign(d, s.catalog);
  const { ids, cats } = flown(d, s.catalog);
  const met = [
    ...(meets(s.mission.primaryObjective.requires, ids, cats) ? [s.mission.primaryObjective.id] : []),
    ...d.secondaryObjectiveIds.filter((id) => {
      const o = s.mission.secondaryObjectives.find((x) => x.id === id);
      return !!o && meets(o.requires, ids, cats);
    }),
  ];
  const units: UnitOutcome[] = [
    ...r.modules.map((m) => ({ category: m.category, scienceValue: m.scienceValue ?? 0, planned: 1, returned: 1, failed: false, isModule: true })),
    ...r.rideshares.map((o) => ({ category: "rideshare", scienceValue: o.scienceValue, planned: 1, returned: 1, failed: false, isModule: false })),
  ];
  const score = scoreFlight(d, s.catalog, { success: true, reachedOperations: true, objectivesMet: met, units, bonusScience: 0 });
  const v = d.values;
  const p = chance(d, s);
  hit.merit = 10 * (v.science * score.science + v.safety * score.safety + v.cost * score.efficiency) * (0.25 + 0.75 * p) + 2 * score.collaboration;
  return hit.merit;
}

/** Lower is better: blockers and designs that cannot meet the main objective first, then warnings, then how far mass, power and budget sit inside the margin. */
const badness = (d: MissionDesign, s: Search) => {
  const c = check(d, s);
  return c.blockers * 100 + (chance(d, s) < 0.1 ? 100 : 0) + c.issues.length * 10 + c.deficit;
};

/* ------------------------------------------------------------------ */
/* Building one candidate on one rocket and carrier                    */
/* ------------------------------------------------------------------ */

interface Frame {
  destinationId: string;
  launchVehicleId: string;
  carrier?: Module;
}

/** Rocket and carrier pairs worth building on: they reach the orbit and lift the carrier, and no other pair beats them on chance, cost and room at once. */
function framesFor(base: MissionDesign, s: Search): Frame[] {
  const { mission, catalog, fixed } = s;
  const dests = fixed.destinationId ? [fixed.destinationId] : mission.destinations.map((d) => d.id);
  const vehicles = fixed.launchVehicleId ? [fixed.launchVehicleId] : mission.launchVehicleIds;
  const carriers = missionCarriers(mission, catalog);
  const all: (Frame & { chance: number; cost: number; room: number })[] = [];
  for (const destinationId of dests)
    for (const launchVehicleId of vehicles) {
      const dest = mission.destinations.find((x) => x.id === destinationId);
      if (!dest || !((getLaunchVehicle(catalog, launchVehicleId).capacityKg[dest.orbitClass] ?? 0) > 0)) continue;
      for (const carrier of carriers.length ? carriers : [undefined]) {
        const d: MissionDesign = { ...base, destinationId, launchVehicleId, moduleIds: carrier ? [carrier.id] : [] };
        const rep = computeResources(d, catalog);
        if (carrier && rep.mass.capacity <= 0) continue;
        all.push({ destinationId, launchVehicleId, carrier, chance: successProbability(d, catalog), cost: rep.budget.used, room: rep.mass.capacity });
      }
    }
  const beaten = (f: (typeof all)[number]) =>
    all.some(
      (g) =>
        g !== f && g.destinationId === f.destinationId && g.carrier === f.carrier && g.chance >= f.chance && g.cost <= f.cost && g.room >= f.room &&
        (g.chance > f.chance || g.cost < f.cost || g.room > f.room),
    );
  const kept = all.filter((f) => !beaten(f));
  // a pair that cannot reach the target even with every landing aid is skipped, unless nothing else is left
  const hopeful = kept.filter((f) => f.chance * 1.1 >= RECOMMENDED_SUCCESS);
  return (hopeful.length ? hopeful : kept).map(({ destinationId, launchVehicleId, carrier }) => ({ destinationId, launchVehicleId, carrier }));
}

/** The best clean design one support part away, if any: only parts of the categories that clear the issues. */
function repairOnce(d: MissionDesign, s: Search, issues: string[]): MissionDesign | undefined {
  const helps = new Set(issues.flatMap((id) => REPAIRS[id] ?? []));
  let best: MissionDesign | undefined;
  let bestMerit = -Infinity;
  for (const mv of designMoves(d, s.catalog)) {
    if (mv.kind !== "add" && mv.kind !== "swap") continue;
    const inn = getModule(s.catalog, mv.inId!);
    if (!helps.has(inn.category) || isCarrierModule(inn)) continue;
    const nd = prepare(mv.design, s);
    if (!check(nd, s).clean) continue;
    const m = merit(nd, s);
    if (m > bestMerit) [best, bestMerit] = [nd, m];
  }
  return best;
}

/** Single changes (add, drop or swap a part, never the carrier) until nothing lowers the issues any more. */
function repair(d: MissionDesign, s: Search, steps = 4): MissionDesign {
  let cur = d;
  for (let i = 0; i < steps && !check(cur, s).clean; i++) {
    let best: MissionDesign | undefined;
    let bestBad = badness(cur, s);
    for (const mv of designMoves(cur, s.catalog)) {
      if (mv.kind === "vehicle") continue;
      if (mv.kind === "swap" && isCarrierModule(getModule(s.catalog, mv.outId!))) continue;
      const nd = prepare(mv.design, s);
      const b = badness(nd, s);
      if (b < bestBad - 1e-9 || (best && Math.abs(b - bestBad) < 1e-9 && merit(nd, s) > merit(best, s))) [best, bestBad] = [nd, b];
    }
    if (!best) break;
    cur = best;
  }
  return cur;
}

/** Adds or swaps in the part that raises the expected score most, while the design stays clean. */
function improve(d: MissionDesign, s: Search): MissionDesign {
  let cur = d;
  let curMerit = merit(cur, s);
  for (let i = 0; i < 12; i++) {
    let best: MissionDesign | undefined;
    let bestMerit = curMerit + 0.5;
    for (const mv of designMoves(cur, s.catalog)) {
      // add any part, or swap a support part for another of its kind
      if (mv.kind !== "add" && mv.kind !== "swap") continue;
      const inn = getModule(s.catalog, mv.inId!);
      if (mv.kind === "swap" && (!SUPPORT.includes(inn.category) || isCarrierModule(inn))) continue;
      let nd: MissionDesign | undefined = prepare(mv.design, s);
      const c = check(nd, s);
      if (!c.clean) {
        // a new instrument may need a faster radio or a bigger array: try one support part with it
        if (mv.kind !== "add" || !SCIENCE.includes(inn.category) || c.deficit > 0 || !c.issues.every((id) => id in REPAIRS)) continue;
        nd = repairOnce(nd, s, c.issues);
        if (!nd) continue;
      }
      const m = merit(nd, s);
      if (m > bestMerit) [best, bestMerit] = [nd, m];
    }
    if (!best) break;
    [cur, curMerit] = [best, bestMerit];
  }
  return cur;
}

/** Adds the open designs and rideshares that keep the design clean and do not lower the expected score. */
function addGreedy(d: MissionDesign, s: Search, key: "blueprintIds" | "rideshareIds", options: string[], max: number): MissionDesign {
  let cur = d;
  let curMerit = merit(cur, s);
  for (let n = cur[key].length; n < max; n++) {
    let best: MissionDesign | undefined;
    let bestMerit = curMerit - 1e-9;
    for (const id of options) {
      if (cur[key].includes(id)) continue;
      const nd = { ...cur, [key]: [...cur[key], id] };
      if (!check(nd, s).clean) continue;
      const m = merit(nd, s);
      if (m > bestMerit) [best, bestMerit] = [nd, m];
    }
    if (!best) break;
    [cur, curMerit] = [best, bestMerit];
  }
  return cur;
}

/** One candidate on one frame, built in step order: parts, then open tech, then rideshares. */
function buildOn(frame: Frame, base: MissionDesign, s: Search): MissionDesign {
  const { fixed, catalog, mission } = s;
  const placed: MissionDesign = { ...base, destinationId: frame.destinationId, launchVehicleId: frame.launchVehicleId, blueprintIds: fixed.blueprintIds ?? [], rideshareIds: [] };
  let d: MissionDesign;
  if (fixed.moduleIds) d = { ...placed, moduleIds: fixed.moduleIds };
  else {
    // the cheapest core that flies clean, or the one closest to clean
    const objectives = s.objectivesFree ? [] : placed.secondaryObjectiveIds;
    let core: MissionDesign | undefined;
    let coreKey: [number, number] = [Infinity, Infinity];
    for (const mods of coreModuleSets(mission, catalog, frame.carrier)) {
      const cand: MissionDesign = { ...placed, secondaryObjectiveIds: [], moduleIds: [...new Set(mods.map((m) => m.id))] };
      const k: [number, number] = [badness(cand, s), computeResources(cand, catalog).budget.used];
      if (k[0] < coreKey[0] - 1e-9 || (Math.abs(k[0] - coreKey[0]) < 1e-9 && k[1] < coreKey[1])) [core, coreKey] = [cand, k];
    }
    d = core ?? { ...placed, moduleIds: frame.carrier ? [frame.carrier.id] : [] };
    // the player's own objectives: add the cheapest part each one needs
    for (const id of objectives) {
      const obj = mission.secondaryObjectives.find((o) => o.id === id);
      if (!obj) continue;
      const { ids, cats } = flown(d, catalog);
      if (meets(obj.requires, ids, cats)) continue;
      const add = [
        ...(obj.requires.categories ?? []).filter((c) => !cats.has(c)).map((c) => mission.moduleIds.map((m) => getModule(catalog, m)).filter((m) => m.category === c && !isCarrierModule(m)).sort((a, b) => a.costMUsd - b.costMUsd)[0]?.id),
      ].filter((x): x is string => !!x);
      const choices = obj.requires.moduleIds?.length ? obj.requires.moduleIds.filter((m) => mission.moduleIds.includes(m)) : [undefined];
      const tried = choices.map((m) => ({ ...d, moduleIds: [...new Set([...d.moduleIds, ...add, ...(m ? [m] : [])])] }));
      d = tried.sort((a, b) => badness(a, s) - badness(b, s) || computeResources(a, catalog).budget.used - computeResources(b, catalog).budget.used)[0] ?? d;
    }
    d = { ...d, secondaryObjectiveIds: objectives };
    d = repair(prepare(d, s), s);
    if (check(d, s).clean) d = improve(d, s);
  }
  d = prepare(d, s);
  if (!fixed.blueprintIds) {
    const cats = flown(d, catalog).cats;
    d = addGreedy(d, s, "blueprintIds", catalog.blueprints.filter((b) => cats.has(b.category)).map((b) => b.id), MAX_BLUEPRINTS);
  }
  return addGreedy(d, s, "rideshareIds", mission.rideshareOfferIds, mission.rideshareOfferIds.length);
}

/* ------------------------------------------------------------------ */
/* The search, cached                                                  */
/* ------------------------------------------------------------------ */

function search(missionId: MissionId, coalition: Coalition, catalog: Catalog, fixed: DesignPatch): MissionDesign {
  const mission = getMission(catalog, missionId);
  const s: Search = { mission, catalog, fixed, objectivesFree: fixed.secondaryObjectiveIds === undefined, memo: new Map() };
  const base: MissionDesign = {
    missionId,
    coalition,
    values: fixed.values ?? councilValues(coalition, recommendedVote(coalition, catalog), catalog).values,
    secondaryObjectiveIds: fixed.secondaryObjectiveIds ?? [],
    destinationId: fixed.destinationId ?? "",
    launchVehicleId: fixed.launchVehicleId ?? "",
    moduleIds: fixed.moduleIds ?? [],
    blueprintIds: fixed.blueprintIds ?? [],
    rideshareIds: [],
  };
  const frames: Frame[] = fixed.moduleIds ? [{ destinationId: base.destinationId, launchVehicleId: base.launchVehicleId }] : framesFor(base, s);
  const built = frames.map((f) => buildOn(f, base, s));
  if (built.length === 0) return base;
  const ranked = built
    .map((d) => ({ d, clean: check(d, s).clean, m: merit(d, s) }))
    .sort((a, b) => Number(b.clean) - Number(a.clean) || b.m - a.m || keyOf(a.d).localeCompare(keyOf(b.d)));
  // clean candidates first; fly the best few and keep the highest mean score among those that win often enough
  const pool = ranked.some((x) => x.clean) ? ranked.filter((x) => x.clean) : ranked;
  const flown: ((typeof pool)[number] & { f: ReturnType<typeof forecast> })[] = [];
  for (let round = 0; round < 2; round++) {
    flown.push(...pool.slice(round * SHORTLIST, (round + 1) * SHORTLIST).map((x) => ({ ...x, f: forecast(x.d, catalog, SCREEN_RUNS) })));
    const passing = flown.filter((x) => x.f.successProbability >= RECOMMENDED_SUCCESS);
    if (passing.length) return [...passing].sort((a, b) => b.f.expectedScore - a.f.expectedScore)[0]!.d;
  }
  return [...flown].sort((a, b) => b.f.successProbability - a.f.successProbability || b.f.expectedScore - a.f.expectedScore)[0]!.d;
}

interface CacheEntry {
  parts: unknown[];
  designs: Map<string, MissionDesign>;
}
const cache: CacheEntry[] = [];

/** Cached per catalog content, so a rebuilt catalog object with the same arrays still hits. */
function cached(missionId: MissionId, coalition: Coalition, catalog: Catalog, fixed: DesignPatch): MissionDesign {
  const parts = [catalog.missions, catalog.actors, catalog.launchVehicles, catalog.modules, catalog.blueprints, catalog.rideshareOffers];
  let entry = cache.find((e) => e.parts.every((p, i) => p === parts[i]));
  if (!entry) {
    entry = { parts, designs: new Map() };
    cache.unshift(entry);
    cache.length = Math.min(cache.length, 4);
  }
  const key = `${missionId}|${coalition.leadId}|${coalition.partnerIds.join(",")}|${JSON.stringify(fixed)}`;
  let design = entry.designs.get(key);
  if (!design) {
    design = search(missionId, coalition, catalog, fixed);
    if (entry.designs.size > 200) entry.designs.clear();
    entry.designs.set(key, design);
  }
  return copy(design, coalition);
}

function copy(d: MissionDesign, coalition: Coalition): MissionDesign {
  return {
    ...d,
    coalition: { leadId: coalition.leadId, partnerIds: [...coalition.partnerIds] as Coalition["partnerIds"] },
    values: { ...d.values },
    secondaryObjectiveIds: [...d.secondaryObjectiveIds],
    moduleIds: [...d.moduleIds],
    blueprintIds: [...d.blueprintIds],
    rideshareIds: [...d.rideshareIds],
  };
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/** A full recommended design for a mission and coalition: every step filled, clean, with margin. */
export function autoDesign(missionId: MissionId, coalition: Coalition, catalog: Catalog): MissionDesign {
  return cached(missionId, coalition, catalog, {});
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * The recommended choice for one step, as a patch on the current design. The steps before it keep the
 * player's choices; the search fills this step and the ones after it, and only this step is returned.
 * Walking every step in order from any design of the coalition ends at autoDesign.
 */
export function recommendStep(step: DesignStep, design: MissionDesign, catalog: Catalog): DesignPatch {
  const before = DESIGN_STEPS.slice(0, DESIGN_STEPS.indexOf(step)).flatMap((x) => STEP_FIELDS[x]);
  const auto = autoDesign(design.missionId, design.coalition, catalog);
  const fixed: DesignPatch = {};
  for (const f of before) Object.assign(fixed, { [f]: design[f] });
  const best = before.every((f) => same(design[f], auto[f])) ? auto : cached(design.missionId, design.coalition, catalog, fixed);
  const patch: DesignPatch = {};
  for (const f of STEP_FIELDS[step]) Object.assign(patch, { [f]: best[f] });
  return patch;
}
