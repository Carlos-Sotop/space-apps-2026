import type { OpsScenario, ScenarioEvent, StructureDef } from "../scenario";
import {
  CUBESAT_101,
  DONKI,
  DSN_NOW,
  LCROSS_WATER,
  LRO,
  LRO_MISSION,
  POLAR_ILLUMINATION,
  VEGGIE,
} from "../sources";
import type { OpsEnv, OpsGoal, Tile } from "../types";
import { addLog, bump, damage, defOf, flag, hasTrait, hexCoords, hexDist, isActive, maxTurnsFor, shuffle, tileIdOf } from "../util";
import { dsnSeries, lerp, periodicSignal, placeStorms, returnTarget, stormCardPowerDown } from "./common";

const GROUND = ["ridge", "rim", "slope", "plain"];
const NON_PSR = GROUND;

const MIX: Record<string, { ridge: number; rim: number; slope: number; psr: number }> = {
  // game values
  "mb-connecting-ridge": { ridge: 6, rim: 3, slope: 4, psr: 3 },
  "mb-de-gerlache-rim": { ridge: 3, rim: 3, slope: 4, psr: 6 },
  "mb-malapert": { ridge: 2, rim: 7, slope: 4, psr: 2 },
};

const TERRAIN_VALUES: Record<string, { sun: number; earthView: number; elev: [number, number] }> = {
  // game values, light shares after Mazarico et al. 2011
  ridge: { sun: 0.9, earthView: 0.1, elev: [40, 80] },
  rim: { sun: 0.75, earthView: 0.3, elev: [20, 40] },
  slope: { sun: 0.55, earthView: 0, elev: [-10, 10] },
  plain: { sun: 0.6, earthView: 0, elev: [0, 0] },
  psr: { sun: 0, earthView: -0.2, elev: [-120, -60] },
};

const def = (d: Omit<StructureDef, "sources"> & { sources?: StructureDef["sources"] }): StructureDef => ({ sources: [], ...d });

const structures: StructureDef[] = [
  def({ kind: "lander", label: "Lander", blurb: "Your base: power, a radio and a warm box.", allowedTerrain: [], traits: ["hub", "generator"], priority: 100 }),
  def({ kind: "solar", label: "Solar array", blurb: "Makes power when the Sun is up.", allowedTerrain: ["ridge", "rim", "plain", "slope"], traits: ["generator"], priority: 90, sources: [POLAR_ILLUMINATION] }),
  def({ kind: "battery", label: "Battery", blurb: "Stores power for the dark.", allowedTerrain: GROUND, adjacentToHub: true, traits: ["battery"], priority: 95 }),
  def({ kind: "heater", label: "Radioisotope heater", blurb: "Keeps the hub warm with no power.", allowedTerrain: [], traits: ["heater"], priority: 99 }),
  def({ kind: "drill", label: "Ice drill", blurb: "Digs water ice on tiles that have it.", allowedTerrain: [...GROUND, "psr"], needsIce: true, traits: ["drill", "instrument"], priority: 30, sources: [LCROSS_WATER] }),
  def({ kind: "rover", label: "Rover", blurb: "Drives, scouts and takes images.", allowedTerrain: NON_PSR, move: { range: 3, terrain: [...GROUND, "psr"] }, traits: ["rover", "instrument"], priority: 20, sources: [LRO] }),
  def({ kind: "lab", label: "Science station", blurb: "Measures dust, soil and plasma.", allowedTerrain: NON_PSR, traits: ["instrument"], priority: 10 }),
  def({ kind: "antenna-dte", label: "Direct antenna", blurb: "Talks to Earth when Earth is in view.", allowedTerrain: ["ridge", "rim", "plain"], traits: ["direct"], priority: 55 }),
  def({ kind: "relay-terminal", label: "Relay terminal", blurb: "Talks to Earth through a relay satellite.", allowedTerrain: NON_PSR, traits: ["relay"], priority: 60 }),
  def({ kind: "mesh", label: "Surface mesh", blurb: "Links far structures to the hub.", allowedTerrain: NON_PSR, traits: ["mesh"], priority: 40 }),
  def({ kind: "pq-link", label: "Post-quantum link", blurb: "Encrypts the link against future codebreakers.", allowedTerrain: [], traits: ["pq"], priority: 50 }),
  def({ kind: "dtn", label: "Data storage node", blurb: "Holds 200 Gb until the link opens.", allowedTerrain: [], traits: [], priority: 50, dataStorageGb: 200, sources: [CUBESAT_101] }), // game value
  def({ kind: "habitat", label: "Habitat", blurb: "A work space: +1 action point each turn.", allowedTerrain: ["plain", "slope"], adjacentToHub: true, traits: [], priority: 20, apBonus: 1 }),
  def({
    kind: "greenhouse",
    label: "Plant growth chamber",
    blurb: "Grows plants: 3 good turns, then science every turn.",
    allowedTerrain: ["plain", "slope", "rim"],
    buildCost: { ap: 2, waterKg: 30 }, // game value
    powerW: 150, // game value
    consumeKgPerTurn: 3, // game value
    growth: { turns: 3, goalId: "grow-plant" },
    sciencePerTurn: 10, // game value
    traits: [],
    priority: 5,
    sources: [VEGGIE],
  }),
  def({ kind: "berm", label: "Regolith berm", blurb: "Shields neighbours from storms and halves dust wear.", allowedTerrain: GROUND, buildCost: { ap: 1 }, traits: ["shield"], priority: 100 }),
  def({ kind: "mast", label: "Antenna mast", blurb: "Lifts an antenna: more Earth view on its tile.", allowedTerrain: GROUND, buildCost: { ap: 1 }, earthViewBonus: 0.25, traits: ["overlay"], priority: 100 }),
  def({ kind: "wadi", label: "Thermal wadi", blurb: "Stores heat and warms the tiles next to it.", allowedTerrain: ["plain", "slope"], buildCost: { ap: 2 }, lockedUntilResearch: true, traits: ["heater"], priority: 100 }),
  def({ kind: "isru", label: "Propellant test plant", blurb: "Turns 5 kg of water into science each turn.", allowedTerrain: ["plain", "slope"], buildCost: { ap: 2 }, powerW: 100, consumeKgPerTurn: 5, sciencePerTurn: 8, lockedUntilResearch: true, traits: [], priority: 8 }), // game values
];

const sideDefs: Record<string, (maxTurns: number) => OpsGoal> = {
  "mb-night": () => ({ id: "side-night", kind: "side", objectiveId: "mb-night", title: "No structure below 30 health through the dark", progress: 0, target: 1, unit: "night", done: false, points: 15 }),
  "mb-ice": () => ({ id: "side-ice", kind: "side", objectiveId: "mb-ice", title: "Collect 60 kg of water ice", progress: 0, target: 60, unit: "kg", done: false, points: 15 }),
  "mb-quantum-link": (n) => ({ id: "side-quantum", kind: "side", objectiveId: "mb-quantum-link", title: "Keep the post-quantum link on all mission", progress: 0, target: n, unit: "turns", done: false, points: 15 }),
  "mb-surface-net": () => ({ id: "side-net", kind: "side", objectiveId: "mb-surface-net", title: "Mesh links 3+ structures", progress: 0, target: 3, unit: "structures", done: false, points: 15 }),
  "mb-scout": () => ({ id: "side-scout", kind: "side", objectiveId: "mb-scout", title: "Scout 5 tiles", progress: 0, target: 5, unit: "tiles", done: false, points: 15 }),
};

const darkTurns = (schedule: OpsEnv[]) => schedule.filter((e) => e.sunFactor <= 0.1).map((e) => e.turn);

const passedDark = (s: Parameters<NonNullable<OpsScenario["goalProgress"]>>[1]) => {
  const dark = darkTurns(s.schedule);
  const last = dark.length ? Math.max(...dark) : 0;
  const hub = s.structures.find((st) => st.kind === "lander");
  return s.turn >= last && s.frozenTurns === 0 && (hub?.health ?? 100) > 30;
};

const events: ScenarioEvent[] = [
  {
    id: "dust-panels",
    title: "Dust on the panels",
    text: "Fine regolith is sticking to the solar arrays.",
    eligible: (s) => s.structures.some((st) => st.kind === "solar"),
    options: [
      { id: "clean", label: "Brush them clean", hint: "Costs 1 action point, no damage", needsAp: 1, apply: () => undefined },
      { id: "ignore", label: "Leave the dust", hint: "Solar arrays lose 15 health", apply: ({ s, rng }) => void damage(s, (st) => st.kind === "solar", 15, rng, "all") },
    ],
  },
  {
    id: "rover-stuck",
    title: "Rover wheel stuck",
    text: "A wheel dug into soft regolith.",
    eligible: (s) => s.structures.some((st) => st.kind === "rover"),
    options: [
      { id: "free", label: "Drive it free", hint: "Costs 1 action point", needsAp: 1, apply: () => undefined },
      { id: "wait", label: "Wait a turn", hint: "The rover is out for this turn", apply: ({ s }) => void (s.flags.stuck = s.turn) },
    ],
  },
  {
    id: "dsn-busy",
    title: "Deep Space Network is busy",
    text: "A crewed mission is using the big dishes.",
    liveSource: DSN_NOW,
    eligible: (s) => s.structures.some((st) => st.kind === "antenna-dte"),
    options: [
      { id: "book", label: "Book a slot", hint: "Costs 1 action point, link stays open", needsAp: 1, apply: () => undefined },
      { id: "wait", label: "Wait it out", hint: "No direct downlink this turn (relays still work)", apply: ({ s }) => void (s.flags.noDte = s.turn) },
    ],
  },
  {
    id: "micrometeorite",
    title: "Micrometeorite hit",
    text: "A tiny rock hit something at high speed.",
    options: [
      { id: "take", label: "Take the hit", hint: "One random structure loses 30 health", apply: ({ s, rng }) => void damage(s, () => true, 30, rng, "one") },
      { id: "shield", label: "Turn the shield", hint: "Costs 1 action point, loses only 10 health", needsAp: 1, apply: ({ s, rng }) => void damage(s, () => true, 10, rng, "one") },
    ],
  },
  {
    id: "regolith-surprise",
    title: "Regolith sample surprise",
    text: "The soil sample looks different from the model.",
    options: [
      { id: "study", label: "Study it", hint: "Costs 1 action point, +15 science", needsAp: 1, apply: ({ s }) => void (s.science += 15) },
      { id: "log", label: "Log it and move on", hint: "+5 science", apply: ({ s }) => void (s.science += 5) },
    ],
  },
  {
    id: "harvest-now",
    title: "Harvest now, decrypt later",
    text: "Someone is recording your radio traffic.",
    eligible: (s) => !s.structures.some((st) => st.kind === "pq-link"),
    options: [
      {
        id: "accept",
        label: "Accept the risk",
        hint: "Lose 20 science",
        apply: ({ s }) => {
          s.science = Math.max(0, s.science - 20);
          addLog(s, "warning", "Without a post-quantum link, recorded traffic can be decrypted later.");
        },
      },
      {
        id: "flush",
        label: "Send only what matters",
        hint: "Costs 1 action point, lose 5 science",
        needsAp: 1,
        apply: ({ s }) => {
          s.science = Math.max(0, s.science - 5);
          addLog(s, "warning", "Without a post-quantum link, recorded traffic can be decrypted later.");
        },
      },
    ],
  },
  {
    id: "heater-fault",
    title: "Heater fault in the dark",
    text: "The heater is running cold.",
    eligible: (s) => s.structures.some((st) => st.kind === "heater") && s.env.sunFactor <= 0.45,
    options: [
      { id: "reboot", label: "Reboot it", hint: "Costs 1 action point", needsAp: 1, apply: () => undefined },
      { id: "ignore", label: "Hope it recovers", hint: "The heater loses 40 health", apply: ({ s, rng }) => void damage(s, (st) => st.kind === "heater", 40, rng, "all") },
    ],
  },
  {
    id: "earthrise",
    title: "Earthrise",
    text: "Earth climbs over the horizon. The team cheers.",
    options: [
      { id: "photo", label: "Take the photo", hint: "+1 action point this turn", apply: ({ s }) => void (s.ap += 1) },
      { id: "work", label: "Keep working", hint: "+5 science", apply: ({ s }) => void (s.science += 5) },
    ],
  },
];

export const moon: OpsScenario = {
  missionId: "moon-base-zero",
  title: "Run the outpost",
  hubLabel: "Lander",
  turnLabel: "Turn",
  terrains: [
    { id: "ridge", label: "Ridge", color: "#d9d6cc", blurb: "Almost always sunlit." },
    { id: "rim", label: "Crater rim", color: "#b9b4a6", blurb: "Good sun and a wide sky." },
    { id: "slope", label: "Slope", color: "#8f8b80", blurb: "Medium light, uneven ground." },
    { id: "plain", label: "Plain", color: "#a49f93", blurb: "Flat and easy to build on." },
    { id: "psr", label: "Permanent shadow", color: "#2a3140", blurb: "Never sunlit. Ice hides here." },
  ],
  structures,
  moduleKinds: {
    "mb-blue-ghost": "lander",
    "mb-nova-c": "lander",
    "mb-griffin": "lander",
    "mb-blue-moon": "lander",
    "mb-vsat": "solar",
    "mb-rfc": "battery",
    "mb-li-ion": "battery",
    "mb-rhu": "heater",
    "mb-ice-drill": "drill",
    "mb-rover": "rover",
    "mb-regolith-science": "lab",
    "mb-dust-plasma": "lab",
    "mb-dte-xband": "antenna-dte",
    "mb-relay": "relay-terminal",
    "mb-mesh": "mesh",
    "mb-pq-link": "pq-link",
    "mb-dtn-node": "dtn",
    "mb-habitat": "habitat",
  },
  hubKind: "lander",
  autoInstall: ["heater", "pq-link", "dtn"],
  consumable: { label: "Water", unit: "kg", startKg: () => 40 }, // game value
  baseApPerTurn: 4, // game value
  baseStorageWh: 2000, // game value
  baseDataStorageGb: 100, // game value
  gbPerSciencePoint: 1,
  stormMode: "power-down",
  stormCard: () => stormCardPowerDown(),
  stormDamage: 15, // game value per severity point
  scout: { label: "Scouted", range: 2, needsTrait: "rover" },

  makeTiles(rng, design) {
    const mix = MIX[design.destinationId] ?? MIX["mb-connecting-ridge"];
    const coords = hexCoords();
    const others = coords.slice(1);
    const corner = coords[7 + 2 * Math.floor(rng() * 6)];
    const byCorner = [...others].sort((a, b) => hexDist(a, corner) - hexDist(b, corner));
    const psr = new Set(byCorner.slice(0, mix.psr).map((c) => tileIdOf(c.q, c.r)));
    const rest = shuffle(others.filter((c) => !psr.has(tileIdOf(c.q, c.r))), rng);
    const terrainOf = new Map<string, string>();
    let i = 0;
    for (const [terrain, n] of [["ridge", mix.ridge], ["rim", mix.rim], ["slope", mix.slope]] as const) {
      for (let k = 0; k < n; k++) {
        terrainOf.set(tileIdOf(rest[i].q, rest[i].r), terrain);
        i++;
      }
    }
    const tiles: Tile[] = coords.map((c, idx) => {
      const id = tileIdOf(c.q, c.r);
      const terrain = idx === 0 ? "plain" : psr.has(id) ? "psr" : (terrainOf.get(id) ?? "plain");
      const v = TERRAIN_VALUES[terrain];
      return {
        id,
        label: idx === 0 ? "Lander" : undefined,
        q: c.q,
        r: c.r,
        terrain,
        elevationM: lerp(rng, v.elev[0], v.elev[1]),
        sun: v.sun,
        earthView: v.earthView,
        iceKgPerTurn: terrain === "psr" ? 6 : 0, // game value
        value: 0,
        scouted: idx === 0,
      };
    });
    const counts: Record<string, number> = {};
    for (const t of tiles) {
      if (!t.label) {
        counts[t.terrain] = (counts[t.terrain] ?? 0) + 1;
        t.label = `${structuresTerrainLabel(t.terrain)} ${counts[t.terrain]}`;
      }
      if (t.id !== tileIdOf(0, 0) && (t.terrain === "slope" || t.terrain === "plain") && tiles.some((o) => o.terrain === "psr" && hexDist(o, t) === 1)) t.iceKgPerTurn = 2; // game value
    }
    return tiles;
  },

  makeSchedule(rng, design, catalog, live, maxTurns) {
    const dest = catalog.missions.find((m) => m.id === design.missionId)?.destinations.find((d) => d.id === design.destinationId);
    const link = dest?.earthLinkFraction ?? 0.5;
    const first = 4 + Math.floor(rng() * 5);
    const lunationTurns = 29.5 / 3;
    const dark = new Set<number>();
    const partial = new Set<number>();
    for (let k = 0; k < 3; k++) {
      const start = first + Math.round(k * lunationTurns);
      dark.add(start);
      dark.add(start + 1);
      partial.add(start - 1);
      partial.add(start + 2);
    }
    const psi = rng() * 2 * Math.PI;
    const storms = placeStorms(rng, live, maxTurns);
    const dsnBase = live?.dsnFreeFraction ?? 0.7;
    const out: OpsEnv[] = [];
    for (let t = 1; t <= maxTurns; t++) {
      const day = (t - 1) * 3;
      const signal = periodicSignal(day, 27.3, psi, link);
      out.push({
        turn: t,
        day,
        sunFactor: dark.has(t) ? 0.05 : partial.has(t) ? 0.45 : 1,
        earthUp: signal >= 0.5,
        earthSignal: signal,
        dsnFactor: dsnSeries(rng, dsnBase, 0.1),
        storm: storms.get(t) ?? null,
      });
    }
    return out;
  },

  makeGoals(design, catalog) {
    const maxTurns = maxTurnsFor(design, catalog);
    const target = returnTarget(design, catalog, moon, maxTurns);
    const g = (x: Omit<OpsGoal, "progress" | "done">): OpsGoal => ({ progress: 0, done: false, ...x });
    const main: OpsGoal[] = [
      g({ id: "main-power", kind: "main", step: 1, title: "Power up: deploy a power source", target: 1, unit: "source", points: 10 }),
      g({ id: "main-phone", kind: "main", step: 2, title: "Phone home: first data reaches Earth", target: 1, unit: "link", points: 15 }),
      g({ id: "main-dark", kind: "main", step: 3, title: "Survive the dark", target: 1, unit: "night", points: 25 }),
      g({ id: "main-data", kind: "main", step: 4, title: `Return ${target} Gb of science`, target, unit: "Gb", points: 30 }),
    ];
    const side = design.secondaryObjectiveIds.map((id) => sideDefs[id]?.(maxTurns)).filter((x): x is OpsGoal => !!x);
    const extra = g({ id: "grow-plant", kind: "side", title: "Grow the first plant on the Moon", target: 3, unit: "turns", points: 20 });
    const disc: OpsGoal[] = [
      g({ id: "disc-cold-trap", kind: "discovery", hidden: true, title: "Cold trap: ice richer than expected", target: 1, unit: "find", points: 10 }),
      g({ id: "disc-lava-tube", kind: "discovery", hidden: true, title: "Lava tube skylight", target: 1, unit: "find", points: 10 }),
      g({ id: "disc-regolith", kind: "discovery", hidden: true, title: "Ancient regolith layer", target: 1, unit: "find", points: 10 }),
    ];
    return [...main, ...side, extra, ...disc];
  },

  placeSecrets(rng, tiles, goals) {
    const spots = shuffle(tiles.filter((t) => t.iceKgPerTurn > 0 && !(t.q === 0 && t.r === 0)), rng);
    const out: Record<string, string> = {};
    goals.filter((x) => x.kind === "discovery").forEach((x, i) => {
      if (spots.length) out[x.id] = spots[i % spots.length].id;
    });
    return out;
  },

  goalProgress(goal, s) {
    switch (goal.id) {
      case "main-power":
        return flag(s, "generating") > 0 ? 1 : 0;
      case "main-phone":
        return s.dataReturnedGb > 0 ? 1 : 0;
      case "main-dark":
        return passedDark(s) ? 1 : 0;
      case "main-data":
        return s.dataReturnedGb;
      case "side-night":
        return passedDark(s) && flag(s, "nightBad") === 0 ? 1 : 0;
      case "side-ice":
        return flag(s, "iceCollected");
      case "side-quantum":
        return flag(s, "pqRun");
      case "side-net": {
        if (!s.structures.some((st) => isActive(st) && st.kind === "mesh")) return 0;
        return s.structures.filter((st) => isActive(st) && st.tileId !== s.tiles.find((t) => t.q === 0 && t.r === 0)?.id && ["lab", "rover", "drill", "antenna-dte", "relay-terminal"].includes(st.kind)).length;
      }
      case "side-scout":
        return s.tiles.filter((t) => t.scouted && !(t.q === 0 && t.r === 0)).length;
      case "grow-plant":
        return Math.max(0, ...s.structures.filter((st) => st.kind === "greenhouse").map((st) => st.streak ?? 0));
      default:
        return 0;
    }
  },

  research: [
    { id: "coatings", title: "Dust-tolerant coatings", blurb: "Wear is cut in half.", cost: 20, effect: { healthLossMul: 0.5 } },
    { id: "driving", title: "Autonomous driving", blurb: "+1 action point each turn.", cost: 30, effect: { ap: 1 } },
    { id: "optical", title: "Optical comms terminal", blurb: "Downlink is twice as fast.", cost: 60, effect: { downlinkMul: 2 } },
    { id: "wadi", title: "Thermal wadi", blurb: "Unlocks a heat store you can build.", cost: 35, effect: { unlockBuild: "wadi" } },
    { id: "electrolysis", title: "Water electrolysis", blurb: "Unlocks a plant that turns water into science.", cost: 40, effect: { unlockBuild: "isru" } },
    { id: "edge-ai", title: "Edge AI triage", blurb: "Instruments return 30% more data.", cost: 45, effect: { dataMul: 1.3 } },
  ],
  events,

  onDiscover(goalId, tile, s) {
    if (goalId === "disc-cold-trap") tile.iceKgPerTurn = Math.max(4, tile.iceKgPerTurn * 2);
    if (goalId === "disc-lava-tube") {
      s.science += 30; // game value, LRO skylight imagery
      addLog(s, "info", "Skylight seen in LRO imagery.", LRO_MISSION);
    }
    if (goalId === "disc-regolith") s.science += 20; // game value
  },

  onTurn(s, _ctx, info) {
    for (const st of s.structures) {
      if (!info.blackout && isActive(st) && st.kind === "drill") {
        const t = s.tiles.find((x) => x.id === st.tileId);
        bump(s, "iceCollected", (t?.iceKgPerTurn ?? 0) * (st.health / 100));
      }
    }
    const pq = s.structures.some((st) => isActive(st) && st.kind === "pq-link");
    s.flags.pqRun = pq ? flag(s, "pqRun") + 1 : 0;
    if (s.env.sunFactor <= 0.1 && s.structures.some((st) => st.health < 30 && defOf(moon, st.kind) && !hasTrait(moon, st, "overlay"))) {
      s.flags.nightBad = 1;
    }
  },
};

function structuresTerrainLabel(t: string): string {
  return moon.terrains.find((x) => x.id === t)?.label ?? t;
}

export const moonSources = [DONKI, DSN_NOW, LRO, LCROSS_WATER, POLAR_ILLUMINATION, VEGGIE, CUBESAT_101];
