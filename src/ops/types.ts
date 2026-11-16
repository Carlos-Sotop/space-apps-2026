/**
 * Operations ("Ops"): the playable phase after a successful arrival, for every mission.
 * The player deploys the delivered modules on a hex map, manages power, a consumable
 * (water, crew supplies...) and data turn by turn, follows a main quest and side quests,
 * unlocks research, and reacts to live NASA data (space weather, DSN load, Earth events).
 * Each mission supplies a scenario (src/ops/scenarios/*): the Moon is a polar hex map,
 * Orbital Lab is the station's racks, Earth Guardian is regions of Earth.
 *
 * Pure and deterministic like src/engine: same design, flight, seed, live input and
 * action list give the same state. The Worker replays the action list to verify scores.
 */
import type { Catalog, FlightResult, MissionDesign, MissionId, Source } from "../engine/types";

/** 3 Earth days per turn: a 45-day mission is 15 turns. */
export const DAYS_PER_TURN = 3;
export const HOURS_PER_TURN = DAYS_PER_TURN * 24;

/** Scenario-defined, e.g. moon: ridge | rim | slope | psr | plain; station: rack | external | node; earth: forest | coast | farmland | city | ocean */
export type TerrainKind = string;

export interface TerrainSpec {
  id: TerrainKind;
  label: string;
  /** CSS color token or hex, for the map */
  color: string;
  blurb: string;
}

export interface Tile {
  id: string;
  /** optional place name, e.g. "Shackleton rim", "Kibo rack 2", "Amazon basin" */
  label?: string;
  /** axial hex coordinates; the lander sits at q=0, r=0 */
  q: number;
  r: number;
  terrain: TerrainKind;
  /** metres relative to the lander, for the 3D view only */
  elevationM: number;
  /** 0..1 share of sunlight this tile gets when the Sun is up (psr = 0) */
  sun: number;
  /** 0..1 bonus to Earth visibility for an antenna placed here (rim and ridge see farther) */
  earthView: number;
  /** water ice an ice drill extracts per turn on this tile, kg (0 if no ice) */
  iceKgPerTurn: number;
  /** science bonus for working here (earth: active event value; moon: scouted features) */
  value: number;
  /** a live NASA record tied to this tile (EONET event, FIRMS fire cluster) */
  liveEvent?: { title: string; category: string; source: Source };
  scouted: boolean;
}

/** Scenario-defined, e.g. lander, solar, battery, drill, antenna-dte, greenhouse, experiment, imager-task... */
export type StructureKind = string;

export interface StructureSpec {
  kind: StructureKind;
  label: string;
  /** one plain line for the card */
  blurb: string;
  /** terrains where it can stand; empty = installed inside the lander, no tile needed */
  allowedTerrain: TerrainKind[];
  /** built on site from resources (not a landed module) */
  buildCost?: { ap: number; waterKg?: number };
  /** power draw while on, W (used when not taken from the module) */
  powerW?: number;
  /** where the numbers come from */
  sources: Source[];
}

/** Something to unlock with science points (the tech tree). */
export interface Research {
  id: string;
  title: string;
  blurb: string;
  cost: number;
  /** id of research required first */
  requires?: string;
  unlocked: boolean;
}

export interface Structure {
  id: string;
  kind: StructureKind;
  /** catalog module this came from; undefined for structures built on site */
  moduleId?: string;
  tileId: string;
  on: boolean;
  /** 0..100; at 0 it stops working */
  health: number;
  /** greenhouse: consecutive powered and watered turns */
  streak?: number;
}

/** A landed module waiting to be placed. */
export interface InventoryItem {
  moduleId: string;
  kind: StructureKind;
}

export interface Storm {
  kind: "CME" | "FLR" | "GST";
  /** 1 minor, 2 strong, 3 severe */
  severity: 1 | 2 | 3;
  /** the NASA DONKI record it comes from, when live */
  liveSource?: Source;
  /** one line, e.g. "M2.3 flare observed 2026-11-12" */
  note: string;
}

export interface OpsEnv {
  turn: number;
  /** mission day at the start of this turn */
  day: number;
  /** 0..1 how high the Sun is over the polar horizon this turn (dark stretch near 0) */
  sunFactor: number;
  /** Earth above the horizon at the lander this turn (before antenna bonuses) */
  earthUp: boolean;
  /** 0..1 raw Earth visibility signal; an antenna sees Earth when earthSignal + tile.earthView >= 0.5 */
  earthSignal: number;
  /** 0..1 share of Deep Space Network capacity free for us */
  dsnFactor: number;
  storm: Storm | null;
}

export type OpsAction =
  | { type: "deploy"; moduleId: string; tileId: string }
  | { type: "build"; kind: StructureKind; tileId: string }
  | { type: "research"; id: string }
  | { type: "toggle"; structureId: string }
  | { type: "move"; structureId: string; tileId: string }
  | { type: "scout"; tileId: string }
  | { type: "repair"; structureId: string }
  | { type: "choose"; eventId: string; optionId: string }
  | { type: "advance" };

export interface OpsEventOption {
  id: string;
  label: string;
  /** consequence in one line, shown before choosing */
  hint: string;
}

export interface OpsEventCard {
  id: string;
  turn: number;
  title: string;
  text: string;
  options: OpsEventOption[];
  liveSource?: Source;
}

export interface OpsLogEntry {
  turn: number;
  kind: "info" | "success" | "warning" | "failure";
  text: string;
  liveSource?: Source;
}

export interface OpsGoal {
  id: string;
  /** main = the mission's quest line (steps done in order); side = optional; discovery = found by exploring */
  kind: "main" | "side" | "discovery";
  /** order inside the main quest line */
  step?: number;
  /** hidden until revealed (discoveries) */
  hidden?: boolean;
  /** the mission objective this goal proves, when it maps to one */
  objectiveId?: string;
  title: string;
  progress: number;
  target: number;
  unit: string;
  done: boolean;
  /** goal points added to the ops score when done */
  points: number;
}

export interface OpsTurnSample {
  turn: number;
  energyWh: number;
  generatedWh: number;
  usedWh: number;
  waterKg: number;
  dataReturnedGb: number;
  linked: boolean;
}

export type OpsStatus = "running" | "ended" | "lost";

export interface OpsState {
  missionId: MissionId;
  seed: number;
  turn: number;
  maxTurns: number;
  /** action points left this turn */
  ap: number;
  apPerTurn: number;
  tiles: Tile[];
  structures: Structure[];
  inventory: InventoryItem[];
  energyWh: number;
  storageWh: number;
  /** the scenario's consumable: water ice on the Moon, crew supplies on the station, propellant for Earth Guardian */
  waterKg: number;
  dataStoredGb: number;
  dataStorageGb: number;
  dataReturnedGb: number;
  dataLostGb: number;
  science: number;
  env: OpsEnv;
  /** the next 3 turns, so the player can plan for the dark and for storms */
  forecast: OpsEnv[];
  /** the whole environment, precomputed at creation (index = turn - 1) */
  schedule: OpsEnv[];
  pendingEvent: OpsEventCard | null;
  goals: OpsGoal[];
  research: Research[];
  /** science points available to spend on research */
  sciencePoints: number;
  log: OpsLogEntry[];
  history: OpsTurnSample[];
  status: OpsStatus;
  lostReason?: string;
  /** consecutive turns with zero energy */
  frozenTurns: number;
  /** event ids already drawn, so none repeats */
  seenEvents: string[];
  /** hidden discovery goal id -> tile id where scouting reveals it */
  secrets: Record<string, string>;
  /** scenario counters and per-turn switches (storm choice, AP spent, streaks...) */
  flags: Record<string, number>;
  /** every accepted action, in order; the Worker replays this */
  actions: OpsAction[];
  /** what the last turn did, for the 3D scene and the UI to animate (set by every advance from C4 on) */
  lastReport?: OpsTurnReport;
  /** effects of choices and scouting made during this turn; the next advance puts them in its report */
  turnEffects?: OpsEffect[];
}

/* ---------------- Turn report (Sunday sprint contract, C0) ---------------- */

/** What one turn did. Eric's 3D scene and Dayon's UI animate `effects` in order. */
export interface OpsTurnReport {
  turn: number; fromDay: number; toDay: number;
  delta: { energyWh: number; waterKg: number; dataStoredGb: number; dataReturnedGb: number; sciencePoints: number };
  effects: OpsEffect[];      // in order; Eric's 3D scene and Dayon's UI animate these
  warnings: OpsWarning[];    // forward-looking
}
export type OpsEffect =
  | { kind: "daylight"; sunFactor: number; earthUp: boolean }
  | { kind: "storm"; severity: 1 | 2 | 3; shieldedIds: string[]; hitIds: string[]; liveSource?: Source }
  | { kind: "impact"; tileId: string; hitIds: string[]; damage: number }
  | { kind: "power-out"; structureIds: string[] }
  | { kind: "downlink"; gb: number; fromId: string }
  | { kind: "science"; points: number; fromIds: string[] }
  | { kind: "goal-done"; goalId: string }
  | { kind: "discovery"; tileId: string; goalId: string };
export interface OpsWarning { id: string; severity: "info" | "warn" | "danger"; text: string; fix?: string; turnsLeft?: number }

/** Live NASA inputs, already normalized. Missing fields fall back to seeded values. */
export interface OpsLive {
  storms: Storm[];
  /** NASA EONET / FIRMS events for the Earth scenario */
  earthEvents?: { id: string; title: string; category: string; lat: number; lon: number; source: Source }[];
  /** 0..1 share of DSN dishes not busy right now (DSN Now) */
  dsnFreeFraction?: number;
  dsnSource?: Source;
  moonDistanceKm?: number;
}

export interface OpsScore {
  /** 0..100 data returned and goals */
  science: number;
  /** 0..100 structure health, no blackouts, outpost alive */
  resilience: number;
  /** 0..100 energy and AP use */
  efficiency: number;
  total: number;
  grade: string;
}

export interface OpsInit {
  flight: FlightResult;
  seed: number;
  live?: OpsLive;
}

export interface OpsCtx {
  design: MissionDesign;
  catalog: Catalog;
}
