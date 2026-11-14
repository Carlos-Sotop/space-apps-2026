import type { OpsScenario, ScenarioEvent, StructureDef } from "../scenario";
import { ISS_RESEARCH, TDRS, VEGGIE } from "../sources";
import type { OpsEnv, OpsGoal, Tile } from "../types";
import { addLog, bump, damage, flag, hexCoords, isActive, maxTurnsFor, shuffle, tileIdOf } from "../util";
import { dsnSeries, placeStorms, returnTarget } from "./common";

const RACK = ["rack"];

const def = (d: Omit<StructureDef, "sources"> & { sources?: StructureDef["sources"] }): StructureDef => ({ sources: [ISS_RESEARCH], ...d });

const structures: StructureDef[] = [
  def({ kind: "cargo", label: "Cargo vehicle", blurb: "Brought your experiments. Docked at the hub.", allowedTerrain: [], traits: ["hub"], priority: 100 }),
  def({ kind: "power", label: "Station power share", blurb: "Your share of the station's solar power.", allowedTerrain: [], traits: ["generator"], priority: 99 }),
  def({ kind: "comms", label: "Station link", blurb: "Sends data to Earth through relay satellites.", allowedTerrain: [], traits: ["relay"], priority: 98, sources: [TDRS] }),
  def({ kind: "experiment", label: "Experiment", blurb: "Runs in a rack and makes science data.", allowedTerrain: RACK, consumeKgPerTurn: 0.4, traits: ["instrument"], priority: 10 }), // game value
  def({ kind: "dosimeter", label: "Radiation monitor", blurb: "Best on the outside: 50% more data there.", allowedTerrain: [...RACK, "external"], consumeKgPerTurn: 0.4, traits: ["instrument"], priority: 15 }),
  def({
    kind: "plant",
    label: "Plant chamber",
    blurb: "Grows lettuce: 3 good turns and the goal is done.",
    allowedTerrain: RACK,
    consumeKgPerTurn: 0.4,
    growth: { turns: 3, goalId: "grow-lettuce" },
    traits: ["instrument"],
    priority: 12,
    sources: [VEGGIE],
  }),
];

const events: ScenarioEvent[] = [
  {
    id: "co2-scrubber",
    title: "CO2 scrubber fault",
    text: "Cabin air is getting stuffy.",
    options: [
      { id: "fix", label: "Fix the scrubber", hint: "Costs 1 crew hour (action point)", needsAp: 1, apply: () => undefined },
      { id: "backup", label: "Use the backup", hint: "Experiments lose 10 health", apply: ({ s, rng }) => void damage(s, (st) => st.kind !== "cargo" && st.kind !== "power" && st.kind !== "comms", 10, rng, "all") },
    ],
  },
  {
    id: "resupply",
    title: "Resupply ship arrives",
    text: "A cargo ship brings fresh supplies.",
    options: [
      { id: "now", label: "Unload now", hint: "Costs 1 crew hour, +10 supplies", needsAp: 1, apply: ({ s }) => void (s.waterKg += 10) },
      { id: "later", label: "Unload a little", hint: "+4 supplies, no crew time", apply: ({ s }) => void (s.waterKg += 4) },
    ],
  },
  {
    id: "cargo-slip",
    title: "Cargo slip",
    text: "A bag of supplies came loose.",
    options: [
      { id: "stow", label: "Stow it again", hint: "Costs 1 crew hour", needsAp: 1, apply: () => undefined },
      { id: "leave", label: "Leave it", hint: "Lose 2 supplies", apply: ({ s }) => void (s.waterKg = Math.max(0, s.waterKg - 2)) },
    ],
  },
  {
    id: "crew-sick",
    title: "Crew sick day",
    text: "One astronaut feels unwell.",
    options: [
      { id: "rest", label: "Let them rest", hint: "Lose 1 crew hour", apply: ({ s }) => void (s.ap = Math.max(0, s.ap - 1)) },
      { id: "push", label: "Push on", hint: "One experiment loses 20 health", apply: ({ s, rng }) => void damage(s, (st) => st.kind !== "cargo" && st.kind !== "power" && st.kind !== "comms", 20, rng, "one") },
    ],
  },
  {
    id: "ammonia-drill",
    title: "Ammonia leak drill",
    text: "The crew practises the emergency plan.",
    options: [
      { id: "full", label: "Run the full drill", hint: "Costs 1 crew hour, +5 science", needsAp: 1, apply: ({ s }) => void (s.science += 5) },
      { id: "skip", label: "Skip it", hint: "-5 science for the missed training", apply: ({ s }) => void (s.science = Math.max(0, s.science - 5)) },
    ],
  },
  {
    id: "spacewalk",
    title: "Spacewalk opportunity",
    text: "A spacewalker can reach your outside rack.",
    options: [
      { id: "use", label: "Use the chance", hint: "Costs 1 crew hour, +10 science", needsAp: 1, apply: ({ s }) => void (s.science += 10) },
      { id: "pass", label: "Pass", hint: "Nothing changes", apply: () => undefined },
    ],
  },
  {
    id: "student-radio",
    title: "Student radio contact",
    text: "A school class calls the station.",
    options: [
      { id: "call", label: "Take the call", hint: "Costs 1 crew hour, +8 science", needsAp: 1, apply: ({ s }) => void (s.science += 8) },
      { id: "record", label: "Send a recording", hint: "+3 science", apply: ({ s }) => void (s.science += 3) },
    ],
  },
  {
    id: "rack-trip",
    title: "Rack breaker trip",
    text: "A rack lost power for a moment.",
    options: [
      { id: "reset", label: "Reset the breaker", hint: "Costs 1 crew hour", needsAp: 1, apply: () => undefined },
      { id: "leave", label: "Leave it", hint: "One experiment loses 25 health", apply: ({ s, rng }) => void damage(s, (st) => st.kind !== "cargo" && st.kind !== "power" && st.kind !== "comms", 25, rng, "one") },
    ],
  },
];

const goal = (x: Omit<OpsGoal, "progress" | "done">): OpsGoal => ({ progress: 0, done: false, ...x });

const sideDefs: Record<string, OpsGoal> = {
  "ol-fire-safety": goal({ id: "side-fire", kind: "side", objectiveId: "ol-fire-safety", title: "Run the combustion rig for 3 turns", target: 3, unit: "turns", points: 15 }),
  "ol-health": goal({ id: "side-health", kind: "side", objectiveId: "ol-health", title: "Run the biomonitor for 4 turns", target: 4, unit: "turns", points: 15 }),
  "ol-plants": goal({ id: "side-plants", kind: "side", objectiveId: "ol-plants", title: "Run the plant chamber for 4 turns", target: 4, unit: "turns", points: 15 }),
  "ol-manufacturing": goal({ id: "side-make", kind: "side", objectiveId: "ol-manufacturing", title: "Run a bioprinter or fiber rig for 4 turns", target: 4, unit: "turns", points: 15 }),
};

const sideProgress: Record<string, (s: Parameters<OpsScenario["goalProgress"]>[1]) => number> = {
  "side-fire": (s) => flag(s, "run:ol-combustion"),
  "side-health": (s) => flag(s, "run:ol-biomonitor"),
  "side-plants": (s) => flag(s, "run:ol-plant-chamber"),
  "side-make": (s) => Math.max(flag(s, "run:ol-bioprinter"), flag(s, "run:ol-fiber")),
};

const isExperiment = (kind: string) => kind === "experiment" || kind === "dosimeter" || kind === "plant";

export const station: OpsScenario = {
  missionId: "orbital-lab",
  title: "Run the lab",
  hubLabel: "Harmony docking port",
  turnLabel: "Turn",
  terrains: [
    { id: "rack", label: "Lab rack", color: "#9fb4c8", blurb: "Indoors, powered by the station." },
    { id: "external", label: "Outside", color: "#c9b27c", blurb: "Exposed to space and radiation." },
    { id: "node", label: "Node", color: "#7e8793", blurb: "A corridor: storage and shelter." },
  ],
  structures,
  moduleKinds: {
    "ol-cargo-dragon": "cargo",
    "ol-cygnus": "cargo",
    "ol-htv-x": "cargo",
    "ol-dream-chaser": "cargo",
    "ol-combustion": "experiment",
    "ol-biomonitor": "experiment",
    "ol-protein-crystal": "experiment",
    "ol-bioprinter": "experiment",
    "ol-fiber": "experiment",
    "ol-cold-atom": "experiment",
    "ol-dosimetry": "dosimeter",
    "ol-plant-chamber": "plant",
    "ol-iss-link": "comms",
    "ol-iss-power": "power",
  },
  hubKind: "cargo",
  autoInstall: ["power", "comms"],
  consumable: {
    label: "Crew time supplies",
    unit: "kg",
    startKg: (design, maxTurns) => 3 + design.moduleIds.length * 0.4 * maxTurns * 0.7, // game value
  },
  baseApPerTurn: 3, // game value: crew hours
  baseStorageWh: 4000, // game value
  baseDataStorageGb: 2000, // game value
  gbPerSciencePoint: 100,
  nearHubRange: Infinity,
  stormMode: "crew",
  stormCard: () => ({
    title: "Solar storm: radiation alert",
    shelter: { label: "Shelter in a node", hint: "No damage, but you lose 1 crew hour" },
    work: { label: "Keep working", hint: "Experiments lose health; radiation monitors gain science" },
  }),
  stormDamage: 10, // game value per severity point
  scout: { label: "Inspected", range: Infinity, terrain: ["external"] },

  makeTiles() {
    const names: [string, string][] = [
      ["Harmony docking port", "node"],
      ["Unity", "node"],
      ["Tranquility", "node"],
      ["Node storage", "node"],
      ["Destiny rack 1", "rack"],
      ["Destiny rack 2", "rack"],
      ["Destiny rack 3", "rack"],
      ["Destiny rack 4", "rack"],
      ["Kibo rack 1", "rack"],
      ["Kibo rack 2", "rack"],
      ["Kibo rack 3", "rack"],
      ["Columbus rack 1", "rack"],
      ["Columbus rack 2", "rack"],
      ["Columbus rack 3", "rack"],
      ["Columbus rack 4", "rack"],
      ["Kibo exposed facility", "external"],
      ["Columbus Bartolomeo", "external"],
      ["ESP-3", "external"],
      ["ESP-2", "external"],
    ];
    return hexCoords().map((c, i): Tile => ({
      id: tileIdOf(c.q, c.r),
      label: names[i][0],
      q: c.q,
      r: c.r,
      terrain: names[i][1],
      elevationM: 0,
      sun: 1,
      earthView: 0.5,
      iceKgPerTurn: 0,
      value: 0,
      scouted: i === 0,
    }));
  },

  makeSchedule(rng, _design, _catalog, live, maxTurns) {
    const beta = new Set<number>();
    const start = 2 + Math.floor(rng() * Math.max(1, maxTurns - 4));
    for (let t = start; t < start + 3; t++) beta.add(t);
    const storms = placeStorms(rng, live, maxTurns);
    const dsnBase = live?.dsnFreeFraction ?? 0.9;
    const out: OpsEnv[] = [];
    for (let t = 1; t <= maxTurns; t++) {
      out.push({
        turn: t,
        day: (t - 1) * 3,
        sunFactor: beta.has(t) ? 0.85 : 1, // game value: high beta angle
        earthUp: true,
        earthSignal: 1,
        dsnFactor: dsnSeries(rng, dsnBase, 0.05), // relay satellite share
        storm: storms.get(t) ?? null,
      });
    }
    return out;
  },

  makeGoals(design, catalog) {
    const maxTurns = maxTurnsFor(design, catalog);
    const target = returnTarget(design, catalog, station, maxTurns, 0.9);
    const side = design.secondaryObjectiveIds.map((id) => sideDefs[id]).filter((x): x is OpsGoal => !!x);
    return [
      goal({ id: "main-dock", kind: "main", step: 1, title: "Dock and unload: deploy 2 experiments", target: 2, unit: "experiments", points: 10 }),
      goal({ id: "main-first", kind: "main", step: 2, title: "First results reach Earth", target: 1, unit: "link", points: 15 }),
      goal({ id: "main-run", kind: "main", step: 3, title: "Run the lab 6 turns with 3+ experiments on", target: 6, unit: "turns", points: 25 }),
      goal({ id: "main-data", kind: "main", step: 4, title: `Return ${target} Gb of results`, target, unit: "Gb", points: 30 }),
      ...side,
      goal({ id: "grow-lettuce", kind: "side", title: "Grow lettuce in the plant chamber", target: 3, unit: "turns", points: 20 }),
      goal({ id: "disc-pit", kind: "discovery", hidden: true, title: "Micrometeoroid pit on a handrail", target: 1, unit: "find", points: 10 }),
      goal({ id: "disc-hotspot", kind: "discovery", hidden: true, title: "Radiation hot spot near an airlock", target: 1, unit: "find", points: 10 }),
      goal({ id: "disc-residue", kind: "discovery", hidden: true, title: "Odd residue on a hatch cover", target: 1, unit: "find", points: 10 }),
    ];
  },

  placeSecrets(rng, tiles, goals) {
    const spots = shuffle(tiles.filter((t) => t.terrain === "external"), rng);
    const out: Record<string, string> = {};
    goals.filter((g) => g.kind === "discovery").forEach((g, i) => {
      if (spots.length) out[g.id] = spots[i % spots.length].id;
    });
    return out;
  },

  goalProgress(goal, s) {
    switch (goal.id) {
      case "main-dock":
        return s.structures.filter((st) => isExperiment(st.kind)).length;
      case "main-first":
        return s.dataReturnedGb > 0 ? 1 : 0;
      case "main-run":
        return flag(s, "labTurns");
      case "main-data":
        return s.dataReturnedGb;
      case "grow-lettuce":
        return Math.max(0, ...s.structures.filter((st) => st.kind === "plant").map((st) => st.streak ?? 0));
      default:
        return sideProgress[goal.id]?.(s) ?? 0;
    }
  },

  research: [
    { id: "arm", title: "Robotic arm automation", blurb: "+1 crew hour each turn.", cost: 25, effect: { ap: 1 } },
    { id: "laser", title: "Laser comm terminal", blurb: "Downlink is twice as fast.", cost: 55, effect: { downlinkMul: 2 } },
    { id: "leds", title: "Efficient LEDs", blurb: "Plant chamber uses 30% less power.", cost: 20, effect: { powerMulKind: { kind: "plant", mul: 0.7 } } },
    { id: "edge-ai", title: "Edge AI", blurb: "Experiments return 30% more data.", cost: 40, effect: { dataMul: 1.3 } },
  ],
  events,

  instrumentMul(st, tile) {
    return st.kind === "dosimeter" && tile.terrain === "external" ? 1.5 : 1;
  },

  onDiscover(_goalId, _tile, s) {
    s.science += 10; // game value
    addLog(s, "info", "Photos sent to the ground team.");
  },

  onStormWork(s, storm) {
    for (const st of s.structures) if (st.kind === "dosimeter" && isActive(st)) s.science += 4 * storm.severity; // game value
  },

  onTurn(s, _ctx, info) {
    for (const id of Object.keys(info.produced)) bump(s, `run:${id}`);
    if (s.structures.filter((st) => isExperiment(st.kind) && info.produced[st.id] > 0).length >= 3) bump(s, "labTurns");
  },
};
