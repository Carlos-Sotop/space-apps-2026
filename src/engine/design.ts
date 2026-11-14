import type {
  Actor,
  Blueprint,
  Capability,
  Catalog,
  Coalition,
  Destination,
  LaunchVehicle,
  Mission,
  MissionDesign,
  MissionId,
  Module,
  ModuleCategory,
  Objective,
  RideshareOffer,
} from "./types";
import { councilValues } from "./council";
import { computeResources } from "./resources";
import { validateDesign } from "./validate";

function find<T extends { id: string }>(list: T[], id: string, what: string): T {
  const item = list.find((x) => x.id === id);
  if (!item) throw new Error(`Unknown ${what} "${id}"`);
  return item;
}

export const getMission = (c: Catalog, id: string): Mission => find(c.missions, id, "mission");
export const getActor = (c: Catalog, id: string): Actor => find(c.actors, id, "actor");
export const getLaunchVehicle = (c: Catalog, id: string): LaunchVehicle =>
  find(c.launchVehicles, id, "launch vehicle");
export const getModule = (c: Catalog, id: string): Module => find(c.modules, id, "module");
export const getBlueprint = (c: Catalog, id: string): Blueprint => find(c.blueprints, id, "blueprint");
export const getRideshare = (c: Catalog, id: string): RideshareOffer =>
  find(c.rideshareOffers, id, "rideshare offer");
export const getDestination = (m: Mission, id: string): Destination =>
  find(m.destinations, id, `destination for mission "${m.id}"`);
export const getObjective = (m: Mission, id: string): Objective =>
  find(m.secondaryObjectives, id, `secondary objective for mission "${m.id}"`);

export interface ResolvedDesign {
  mission: Mission;
  vehicle?: LaunchVehicle;
  destination?: Destination;
  modules: Module[];
  /** the lander or bus that carries the rest, if one is selected */
  carrier?: Module;
  /** every selected module except the carrier */
  payload: Module[];
  rideshares: RideshareOffer[];
  members: Actor[];
}

/** Looks everything up once. Empty ids mean "not chosen yet"; unknown ids throw. */
export function resolveDesign(design: MissionDesign, catalog: Catalog): ResolvedDesign {
  const mission = getMission(catalog, design.missionId);
  const vehicle = design.launchVehicleId ? getLaunchVehicle(catalog, design.launchVehicleId) : undefined;
  const destination = design.destinationId ? getDestination(mission, design.destinationId) : undefined;
  const modules = design.moduleIds.map((id) => getModule(catalog, id));
  const carrierIndex = modules.findIndex(
    (m) => (m.category === "lander" || m.category === "bus") && m.payloadCapacityKg !== undefined,
  );
  const carrier = carrierIndex >= 0 ? modules[carrierIndex] : undefined;
  const payload = modules.filter((_, i) => i !== carrierIndex);
  const rideshares = design.rideshareIds.map((id) => getRideshare(catalog, id));
  const { leadId, partnerIds } = design.coalition;
  const members = [leadId, ...partnerIds].map((id) => getActor(catalog, id));
  return { mission, vehicle, destination, modules, carrier, payload, rideshares, members };
}

/** Capabilities where an actor is strongest: strength 2 or more, or its best one. */
export function strongCapabilities(actor: Actor): Capability[] {
  const entries = Object.entries(actor.capabilities) as [Capability, number][];
  const max = Math.max(0, ...entries.map(([, s]) => s));
  return entries.filter(([, s]) => s >= 2 || s === max).map(([c]) => c);
}

export function defaultDesign(missionId: MissionId, coalition: Coalition, catalog: Catalog): MissionDesign {
  const mission = getMission(catalog, missionId);
  const lead = getActor(catalog, coalition.leadId);
  const values = councilValues(coalition, lead.priorities, catalog).values;
  const offered = mission.moduleIds.map((id) => getModule(catalog, id));
  const isCarrier = (m: Module) => (m.category === "lander" || m.category === "bus") && m.payloadCapacityKg !== undefined;
  const carriers = offered.filter(isCarrier);
  const cats = [...new Set([...mission.requiredCategories, ...(mission.primaryObjective.requires.categories ?? [])])];
  const anyOf = offered.filter((m) => (mission.primaryObjective.requires.moduleIds ?? []).includes(m.id)).sort((a, b) => a.costMUsd - b.costMUsd);

  // Categories where the cheapest option often starves the mission (a slow radio, a small array, no
  // night heating): the starting design also tries each alternative there, and pairs of comms modules
  // (a fast radio plus ground stations or a relay). Optional categories are tried with and without.
  const VARIED: ModuleCategory[] = ["comms", "power", "battery"];
  const OPTIONAL: ModuleCategory[] = ["thermal"];
  const inCat = (cat: ModuleCategory) =>
    offered.filter((m) => m.category === cat && !isCarrier(m)).sort((a, b) => a.costMUsd - b.costMUsd);
  const options = (cat: ModuleCategory): Module[][] => {
    const all = inCat(cat);
    if (!VARIED.includes(cat)) return all.slice(0, 1).map((m) => [m]);
    const singles = all.map((m) => [m]);
    const pairs = cat === "comms" ? all.flatMap((m, i) => all.slice(i + 1).map((n) => [m, n])) : [];
    return [...singles, ...pairs];
  };
  const combos = (list: ModuleCategory[]): Module[][] =>
    list.reduce<Module[][]>((acc, cat) => {
      const opts = options(cat);
      return opts.length ? acc.flatMap((c) => opts.map((o) => [...c, ...o])) : acc;
    }, [[]]);
  const extras: Module[][] = OPTIONAL.reduce<Module[][]>(
    (acc, cat) => acc.flatMap((c) => [c, ...inCat(cat).slice(0, 1).map((m) => [...c, m])]),
    [[]],
  );
  const instrumentChoices: (Module | undefined)[] = anyOf.length ? anyOf : [undefined];

  const make = (destinationId: string, launchVehicleId: string, mods: Module[]): MissionDesign => ({
    missionId, coalition, values, secondaryObjectiveIds: [], destinationId, launchVehicleId,
    moduleIds: [...new Set(mods.map((m) => m.id))], blueprintIds: [], rideshareIds: [],
  });

  // Ranking key: cost in $M, plus heavy penalties so the starting point flies and returns data.
  const STARVED = new Set(["power-over", "data-over", "comms-under", "lifetime-under"]);
  let best: { design: MissionDesign; cost: number } | undefined;
  for (const dest of mission.destinations)
    for (const vid of mission.launchVehicleIds)
      for (const carrier of carriers.length ? carriers : [undefined])
        for (const combo of combos(cats.filter((c) => c !== carrier?.category)))
          for (const instrument of instrumentChoices)
          for (const extra of extras) {
            const mods = [...(carrier ? [carrier] : []), ...combo, ...extra, ...(instrument ? [instrument] : [])];
            const design = make(dest.id, vid, mods);
            const issues = validateDesign(design, catalog);
            if (issues.some((i) => i.severity === "blocker")) continue;
            // Prefer proven hardware: a cheap but unreliable rocket or carrier makes the first flight a coin toss.
            const vehicle = catalog.launchVehicles.find((v) => v.id === vid);
            const proven = (vehicle?.reliability ?? 0) >= 0.95 && (carrier?.reliability ?? 1) >= 0.9;
            const starved = issues.filter((i) => STARVED.has(i.id)).length;
            const cost = computeResources(design, catalog).budget.used + (proven ? 0 : 10_000) + starved * 1_000;
            if (!best || cost < best.cost) best = { design, cost };
          }
  if (best) return best.design;

  const destination = mission.destinations[0];
  const vehicle =
    mission.launchVehicleIds
      .map((id) => getLaunchVehicle(catalog, id))
      .find((v) => destination && (v.capacityKg[destination.orbitClass] ?? 0) > 0) ??
    (mission.launchVehicleIds[0] ? getLaunchVehicle(catalog, mission.launchVehicleIds[0]) : undefined);
  const picked: Module[] = [];
  for (const cat of mission.requiredCategories) {
    const m = offered.find((o) => o.category === cat);
    if (m && !picked.includes(m)) picked.push(m);
  }
  return {
    missionId,
    coalition,
    values,
    secondaryObjectiveIds: [],
    destinationId: destination?.id ?? "",
    launchVehicleId: vehicle?.id ?? "",
    moduleIds: picked.map((m) => m.id),
    blueprintIds: [],
    rideshareIds: [],
  };
}

export function categoryDomain(cat: ModuleCategory): "comms" | "science" | "spacecraft" {
  if (cat === "comms") return "comms";
  if (cat === "instrument" || cat === "experiment") return "science";
  return "spacecraft";
}

/** 1234.5 -> "1,235"; 12.34 -> "12.3" */
export function fmt(x: number): string {
  const r = Math.abs(x) >= 100 ? Math.round(x) : Math.round(x * 10) / 10;
  return String(r).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
