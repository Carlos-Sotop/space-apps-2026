import type { OpsScenario, ScenarioEvent, StructureDef } from "../scenario";
import { EONET, FIRMS } from "../sources";
import type { OpsEnv, OpsGoal, Tile } from "../types";
import { addLog, bump, damage, effectsOf, flag, flagCount, hexCoords, isActive, maxTurnsFor, shuffle, tileIdOf } from "../util";
import { dsnSeries, placeStorms, returnTarget } from "./common";

interface Region {
  label: string;
  terrain: string;
  lat: number;
  lon: number;
}

/** Centroids are approximate; they only decide which region a live event belongs to. */
export const REGIONS: Region[] = [
  { label: "Amazon basin", terrain: "forest", lat: -3, lon: -60 },
  { label: "Brazilian Cerrado", terrain: "farmland", lat: -15, lon: -48 },
  { label: "Andes", terrain: "dryland", lat: -15, lon: -70 },
  { label: "Sahel", terrain: "dryland", lat: 14, lon: 0 },
  { label: "Congo basin", terrain: "forest", lat: 0, lon: 23 },
  { label: "East Africa", terrain: "farmland", lat: 2, lon: 38 },
  { label: "Nile delta", terrain: "coast", lat: 31, lon: 31 },
  { label: "Ganges–Brahmaputra delta", terrain: "coast", lat: 23, lon: 90 },
  { label: "Mekong delta", terrain: "coast", lat: 10, lon: 106 },
  { label: "Indonesian peatlands", terrain: "forest", lat: -2, lon: 114 },
  { label: "Philippines coast", terrain: "coast", lat: 13, lon: 122 },
  { label: "Pacific islands", terrain: "ocean", lat: -10, lon: 170 },
  { label: "Central America", terrain: "forest", lat: 12, lon: -86 },
  { label: "Madagascar", terrain: "forest", lat: -19, lon: 47 },
  { label: "Southern Africa", terrain: "farmland", lat: -28, lon: 24 },
  { label: "Indian Ocean shipping lanes", terrain: "ocean", lat: -5, lon: 70 },
  { label: "Gulf of Guinea", terrain: "ocean", lat: 2, lon: 3 },
  { label: "Atlantic shipping lanes", terrain: "ocean", lat: 0, lon: -25 },
];

const rad = (d: number) => (d * Math.PI) / 180;

export function greatCircleKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function nearestRegion(lat: number, lon: number): number {
  let best = 0;
  REGIONS.forEach((r, i) => {
    if (greatCircleKm({ lat, lon }, r) < greatCircleKm({ lat, lon }, REGIONS[best])) best = i;
  });
  return best;
}

const ALL_TERRAIN = ["forest", "dryland", "farmland", "coast", "ocean"];
const GOOD: Record<string, string[]> = {
  "eg-lsar": ["forest", "coast", "farmland"],
  "eg-ssar": ["forest", "coast", "farmland"],
  "eg-xsar": ["forest", "coast", "farmland"],
  "eg-thermal-ir": ["forest", "dryland"],
  "eg-msi": ["farmland", "coast"],
  "eg-ais": ["ocean", "coast"],
};

const def = (d: Omit<StructureDef, "sources"> & { sources?: StructureDef["sources"] }): StructureDef => ({ sources: [], ...d });

const structures: StructureDef[] = [
  def({ kind: "satellite", label: "Satellite bus", blurb: "Holds orbit: 1 kg of propellant each turn.", allowedTerrain: [], consumeKgPerTurn: 1, traits: ["hub"], priority: 100 }), // game value
  def({ kind: "array", label: "Solar array", blurb: "Power for everything on board.", allowedTerrain: [], traits: ["generator"], priority: 99 }),
  def({ kind: "battery", label: "Battery", blurb: "Keeps the satellite alive in eclipse.", allowedTerrain: [], traits: ["battery"], priority: 98 }),
  def({ kind: "comms", label: "Downlink radio", blurb: "Sends images and alerts to the ground.", allowedTerrain: [], traits: ["relay"], priority: 90 }),
  def({
    kind: "campaign",
    label: "Imaging campaign",
    blurb: "Watches one region. Retask it for 2 kg of propellant.",
    allowedTerrain: ALL_TERRAIN,
    move: { range: 99, waterKg: 2 }, // game value
    traits: ["instrument"],
    priority: 10,
    sources: [EONET, FIRMS],
  }),
];

const goal = (x: Omit<OpsGoal, "progress" | "done">): OpsGoal => ({ progress: 0, done: false, ...x });

const campaignCount = (s: { structures: { kind: string }[] }) => s.structures.filter((st) => st.kind === "campaign").length;

const regionsOf = (s: { flags: Record<string, number> }, terrain: string) => flagCount(s as never, `cov:${terrain}:`);

const events: ScenarioEvent[] = [
  {
    id: "new-wildfire",
    title: "New wildfire detected",
    text: "A fire just started. Fire data comes from NASA FIRMS.",
    liveSource: FIRMS,
    options: [
      {
        id: "retask",
        label: "Retask a campaign",
        hint: "Costs 1 action point and 2 kg propellant, +10 science",
        needsAp: 1,
        apply: ({ s, rng }) => {
          const spot = shuffle(s.tiles.filter((t) => !t.liveEvent && !(t.q === 0 && t.r === 0)), rng)[0];
          if (!spot) return;
          spot.liveEvent = { title: "New wildfire detected", category: "wildfires", source: FIRMS };
          spot.value = Math.min(60, spot.value + 30);
          const cam = s.structures.find((st) => st.kind === "campaign" && isActive(st));
          const busy = s.structures.some((st) => st.tileId === spot.id);
          if (cam && !busy && s.waterKg >= 2) {
            cam.tileId = spot.id;
            s.waterKg -= 2;
          }
          s.science += 10;
        },
      },
      {
        id: "watch",
        label: "Watch from orbit",
        hint: "No cost, the fire stays on the map",
        apply: ({ s, rng }) => {
          const spot = shuffle(s.tiles.filter((t) => !t.liveEvent && !(t.q === 0 && t.r === 0)), rng)[0];
          if (!spot) return;
          spot.liveEvent = { title: "New wildfire detected", category: "wildfires", source: FIRMS };
          spot.value = Math.min(60, spot.value + 30);
        },
      },
    ],
  },
  {
    id: "cyclone",
    title: "Cyclone forming",
    text: "A tropical storm is spinning up over the sea.",
    options: [
      { id: "task", label: "Task an imager", hint: "Costs 1 action point, +8 science", needsAp: 1, apply: ({ s }) => void (s.science += 8) },
      { id: "keep", label: "Keep the schedule", hint: "Nothing changes", apply: () => undefined },
    ],
  },
  {
    id: "debris",
    title: "Space debris warning",
    text: "A piece of junk will pass close by.",
    options: [
      { id: "burn", label: "Dodge with a burn", hint: "Costs 3 kg of propellant", apply: ({ s }) => void (s.waterKg = Math.max(0, s.waterKg - 3)) },
      { id: "risk", label: "Accept the risk", hint: "One structure loses 30 health", apply: ({ s, rng }) => void damage(s, () => true, 30, rng, "one") },
    ],
  },
  {
    id: "cloud-season",
    title: "Cloud cover season",
    text: "Thick clouds hide the ground from optical cameras.",
    options: [
      { id: "radar", label: "Lean on radar", hint: "Costs 1 action point, no loss", needsAp: 1, apply: () => undefined },
      { id: "wait", label: "Wait it out", hint: "Lose 10% of the stored data", apply: ({ s }) => void (s.dataStoredGb *= 0.9) },
    ],
  },
  {
    id: "partner-request",
    title: "A partner agency asks for images",
    text: "A national agency needs help after a disaster.",
    options: [
      { id: "share", label: "Share the images", hint: "Costs 1 action point, +12 science", needsAp: 1, apply: ({ s }) => void (s.science += 12) },
      { id: "decline", label: "Decline", hint: "Nothing changes", apply: () => undefined },
    ],
  },
  {
    id: "array-wear",
    title: "Solar array degradation",
    text: "Years of radiation are dimming the panels.",
    options: [
      { id: "repoint", label: "Re-point the array", hint: "Costs 1 action point", needsAp: 1, apply: () => undefined },
      { id: "accept", label: "Accept it", hint: "Solar arrays lose 15 health", apply: ({ s, rng }) => void damage(s, (st) => st.kind === "array", 15, rng, "all") },
    ],
  },
];

export const earth: OpsScenario = {
  missionId: "earth-guardian",
  title: "Watch the planet",
  hubLabel: "Ground station network",
  turnLabel: "Month",
  terrains: [
    { id: "forest", label: "Forest", color: "#3f7d4e", blurb: "Radar sees through clouds here." },
    { id: "dryland", label: "Dryland", color: "#c9a25f", blurb: "Heat cameras spot fires." },
    { id: "farmland", label: "Farmland", color: "#a7c056", blurb: "Crops and floods." },
    { id: "coast", label: "Coast", color: "#4e9ab5", blurb: "Deltas, ports and storms." },
    { id: "ocean", label: "Ocean", color: "#27507a", blurb: "Ships and shipping lanes." },
    { id: "hub", label: "Ground stations", color: "#8a8f98", blurb: "Where the data lands." },
  ],
  structures,
  moduleKinds: {
    "eg-bus-small": "satellite",
    "eg-bus-medium": "satellite",
    "eg-array-small": "array",
    "eg-array-large": "array",
    "eg-batt-small": "battery",
    "eg-batt-large": "battery",
    "eg-sband": "comms",
    "eg-xband": "comms",
    "eg-kaband": "comms",
    "eg-optical": "comms",
    "eg-lsar": "campaign",
    "eg-ssar": "campaign",
    "eg-xsar": "campaign",
    "eg-thermal-ir": "campaign",
    "eg-msi": "campaign",
    "eg-ais": "campaign",
  },
  hubKind: "satellite",
  autoInstall: ["array", "battery", "comms"],
  consumable: { label: "Propellant", unit: "kg", startKg: () => 40 }, // game value
  baseApPerTurn: 3, // game value
  baseStorageWh: 1500, // game value
  baseDataStorageGb: 20000, // game value
  gbPerSciencePoint: 200,
  nearHubRange: Infinity,
  stormMode: "downlink",
  stormCard: () => ({
    title: "Geomagnetic storm",
    shelter: { label: "Safe mode: pause imaging", hint: "No images this turn, full downlink" },
    work: { label: "Keep imaging", hint: "Downlink is cut in half this turn" },
  }),
  stormDamage: 0,
  scout: { label: "Deep-dive done", range: 0, needsTrait: "instrument" },

  makeTiles(rng, _design, _catalog, live) {
    const tiles: Tile[] = hexCoords().map((c, i): Tile => ({
      id: tileIdOf(c.q, c.r),
      label: i === 0 ? "Ground station network" : REGIONS[i - 1].label,
      q: c.q,
      r: c.r,
      terrain: i === 0 ? "hub" : REGIONS[i - 1].terrain,
      elevationM: 0,
      sun: 1,
      earthView: 0.5,
      iceKgPerTurn: 0,
      value: 0,
      scouted: i === 0,
    }));
    for (const e of live?.earthEvents ?? []) {
      const tile = tiles[1 + nearestRegion(e.lat, e.lon)];
      if (!tile.liveEvent) tile.liveEvent = { title: e.title, category: e.category, source: e.source };
      tile.value = Math.min(60, tile.value + (e.category === "wildfires" ? 30 : 20)); // game value
    }
    const fires = tiles.filter((t) => t.liveEvent?.category === "wildfires").length;
    const free = shuffle(tiles.filter((t) => t.id !== tiles[0].id && !t.liveEvent), rng);
    for (let i = 0; i < Math.max(0, 3 - fires) && i < free.length; i++) {
      free[i].liveEvent = { title: "Wildfire (simulated)", category: "wildfires", source: FIRMS };
      free[i].value = 30; // game value
    }
    return tiles;
  },

  makeSchedule(rng, design, _catalog, live, maxTurns) {
    const eclipse = new Set<number>();
    const start = 2 + Math.floor(rng() * Math.max(1, maxTurns - 6));
    for (let t = start; t < start + 3; t++) eclipse.add(t);
    for (let t = start + 6; t < start + 8; t++) eclipse.add(t);
    const storms = placeStorms(rng, live, maxTurns);
    const passes = (live?.dsnFreeFraction ?? 0.75) + (design.moduleIds.includes("eg-ground-network") ? 0.2 : 0);
    const out: OpsEnv[] = [];
    for (let t = 1; t <= maxTurns; t++) {
      out.push({
        turn: t,
        day: (t - 1) * 3,
        sunFactor: eclipse.has(t) ? 0.8 : 1, // game value: eclipse season
        earthUp: true,
        earthSignal: 1,
        dsnFactor: Math.min(1, dsnSeries(rng, passes, 0.15)),
        storm: storms.get(t) ?? null,
      });
    }
    return out;
  },

  makeGoals(design, catalog, tiles) {
    const maxTurns = maxTurnsFor(design, catalog);
    const target = returnTarget(design, catalog, earth, maxTurns);
    const count = design.moduleIds.filter((id) => earth.moduleKinds[id] === "campaign").length;
    const fires = tiles.filter((t) => t.liveEvent?.category === "wildfires").length;
    const sides: Record<string, OpsGoal> = {
      "eg-wildfire": goal({ id: "side-fire", kind: "side", objectiveId: "eg-wildfire", title: `Image ${Math.min(3, Math.max(1, fires))} fire regions`, target: Math.min(3, Math.max(1, fires)), unit: "regions", points: 15 }),
      "eg-flood": goal({ id: "side-flood", kind: "side", objectiveId: "eg-flood", title: "Cover 2 coastal regions", target: 2, unit: "regions", points: 15 }),
      "eg-crops": goal({ id: "side-crops", kind: "side", objectiveId: "eg-crops", title: "Cover 3 farmland regions", target: 3, unit: "regions", points: 15 }),
      "eg-ships": goal({ id: "side-ships", kind: "side", objectiveId: "eg-ships", title: "Cover 2 ocean regions", target: 2, unit: "regions", points: 15 }),
    };
    return [
      goal({ id: "main-commission", kind: "main", step: 1, title: "Commission the satellite: deploy all instruments", target: Math.max(1, count), unit: "instruments", points: 10 }),
      goal({ id: "main-alert", kind: "main", step: 2, title: "First alert delivered", target: 1, unit: "alert", points: 15 }),
      goal({ id: "main-cover", kind: "main", step: 3, title: "Cover 6 regions", target: 6, unit: "regions", points: 25 }),
      goal({ id: "main-data", kind: "main", step: 4, title: `Return ${target} Gb of images`, target, unit: "Gb", points: 30 }),
      ...design.secondaryObjectiveIds.map((id) => sides[id]).filter((x): x is OpsGoal => !!x),
      goal({ id: "disc-deforest", kind: "discovery", hidden: true, title: "Illegal deforestation front", target: 1, unit: "find", points: 10 }),
      goal({ id: "disc-locust", kind: "discovery", hidden: true, title: "Locust swarm early sign", target: 1, unit: "find", points: 10 }),
      goal({ id: "disc-vessel", kind: "discovery", hidden: true, title: "Dark vessel", target: 1, unit: "find", points: 10 }),
    ];
  },

  placeSecrets(rng, tiles) {
    const pick = (terrains: string[]) => shuffle(tiles.filter((t) => terrains.includes(t.terrain)), rng)[0]?.id;
    const out: Record<string, string> = {};
    const entries: [string, string[]][] = [
      ["disc-deforest", ["forest"]],
      ["disc-locust", ["dryland", "farmland"]],
      ["disc-vessel", ["ocean", "coast"]],
    ];
    for (const [id, terrains] of entries) {
      const t = pick(terrains);
      if (t) out[id] = t;
    }
    return out;
  },

  goalProgress(g, s) {
    switch (g.id) {
      case "main-commission":
        return campaignCount(s);
      case "main-alert":
        return flag(s, "alerts") > 0 ? 1 : 0;
      case "main-cover":
        return flagCount(s, "cov:");
      case "main-data":
        return s.dataReturnedGb;
      case "side-fire":
        return flagCount(s, "fire:");
      case "side-flood":
        return regionsOf(s, "coast");
      case "side-crops":
        return regionsOf(s, "farmland");
      case "side-ships":
        return regionsOf(s, "ocean");
      default:
        return 0;
    }
  },

  research: [
    { id: "ai-tasking", title: "Onboard AI tasking", blurb: "+1 action point each month.", cost: 25, effect: { ap: 1 } },
    { id: "ka-upgrade", title: "Ka-band upgrade", blurb: "Downlink is 1.5 times faster.", cost: 45, effect: { downlinkMul: 1.5 } },
    { id: "fusion", title: "Data fusion: radar plus optical", blurb: "Images return 30% more data.", cost: 40, effect: { dataMul: 1.3 } },
    { id: "open-portal", title: "Open data portal", blurb: "Each alert gives +3 science.", cost: 30, effect: { sciencePerAlert: 3 } },
  ],
  events,

  instrumentMul(st, tile, env) {
    const good = (GOOD[st.moduleId ?? ""] ?? []).includes(tile.terrain);
    const match = good ? 1.5 : 0.6; // game values
    const light = st.moduleId === "eg-msi" ? env.sunFactor : 1;
    return match * light * (1 + tile.value / 100);
  },

  onDiscover(_goalId, _tile, s) {
    s.science += 10; // game value
    addLog(s, "info", "Analysts confirm the find and alert partners.");
  },

  onTurn(s, _ctx, info) {
    const fx = effectsOf(s, earth);
    for (const st of s.structures) {
      if (st.kind !== "campaign" || !(info.produced[st.id] > 0)) continue;
      const tile = s.tiles.find((t) => t.id === st.tileId);
      if (!tile) continue;
      s.flags[`cov:${tile.terrain}:${tile.id}`] = 1;
      if (tile.liveEvent) {
        bump(s, "alerts");
        s.science += fx.sciencePerAlert;
        if (tile.liveEvent.category === "wildfires") s.flags[`fire:${tile.id}`] = 1;
      }
    }
  },
};
