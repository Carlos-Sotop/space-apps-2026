import type { Catalog, MissionDesign, MissionId, Source } from "../engine/types";
import type {
  OpsCtx,
  OpsEnv,
  OpsGoal,
  OpsLive,
  OpsState,
  Research,
  Storm,
  StructureKind,
  StructureSpec,
  Structure,
  Tile,
  TerrainKind,
  TerrainSpec,
} from "./types";

export type Rng = () => number;

/** What a structure does for the core loop. */
export type Trait =
  | "generator" // makes power from its module (or stats), scaled by Sun and tile light
  | "battery" // adds storage from its module
  | "instrument" // makes science data
  | "relay" // always sees Earth
  | "direct" // sees Earth when earthSignal + tile.earthView >= 0.5
  | "drill" // adds tile ice each turn
  | "rover" // can scout; counts as a rover
  | "heater" // keeps itself and neighbours alive when the power is out
  | "shield" // storms and wear cannot hurt neighbours as much
  | "mesh" // all instruments count as near the hub
  | "pq" // post-quantum link
  | "overlay" // can share a tile with another structure
  | "hub"; // the lander or satellite: never switched off by a power shortage

export interface StructureDef extends StructureSpec {
  traits: Trait[];
  /** higher is switched off later in a power shortage */
  priority: number;
  /** numbers for structures with no catalog module (built on site) */
  stats?: { powerW?: number; generatesW?: number; storageWh?: number; dataGbPerDay?: number; downlinkGbPerDay?: number };
  adjacentToHub?: boolean;
  needsIce?: boolean;
  /** can be moved: range in tiles, terrains it can enter (default allowedTerrain), propellant or water per move */
  move?: { range: number; terrain?: TerrainKind[]; waterKg?: number };
  /** needs this much of the consumable each turn to work */
  consumeKgPerTurn?: number;
  /** science added each turn while working (after the growth streak, when there is one) */
  sciencePerTurn?: number;
  /** needs this many consecutive working turns; the goal with this id is then done */
  growth?: { turns: number; goalId: string };
  /** extra data storage while on, Gb */
  dataStorageGb?: number;
  /** extra action points per turn while on */
  apBonus?: number;
  /** can only be built after a research with unlockBuild = this kind */
  lockedUntilResearch?: boolean;
  /** raises earthView on its tile when built */
  earthViewBonus?: number;
}

export interface ResearchEffect {
  ap?: number;
  downlinkMul?: number;
  generationMul?: number;
  healthLossMul?: number;
  dataMul?: number;
  unlockBuild?: StructureKind;
  /** power draw multiplier for one structure kind */
  powerMulKind?: { kind: StructureKind; mul: number };
  /** science per delivered alert (Earth) */
  sciencePerAlert?: number;
}

export type ResearchSpec = Omit<Research, "unlocked"> & { effect: ResearchEffect };

export interface EventContext {
  s: OpsState;
  ctx: OpsCtx;
  rng: Rng;
}

export interface ScenarioEventOption {
  id: string;
  label: string;
  hint: string;
  /** action points the player must have to pick this */
  needsAp?: number;
  apply(e: EventContext): void;
}

export interface ScenarioEvent {
  id: string;
  title: string;
  text: string;
  liveSource?: Source;
  eligible?(s: OpsState, ctx: OpsCtx): boolean;
  options: [ScenarioEventOption, ScenarioEventOption];
}

export interface StormCard {
  title: string;
  shelter: { label: string; hint: string };
  work: { label: string; hint: string };
}

/** Per-turn facts the core hands to the scenario hook. */
export interface TurnInfo {
  /** data produced by each structure this turn, Gb */
  produced: Record<string, number>;
  shelter: boolean;
  blackout: boolean;
}

export interface OpsScenario {
  missionId: MissionId;
  title: string;
  hubLabel: string;
  /** "Turn" or "Month" in the UI */
  turnLabel: string;
  terrains: TerrainSpec[];
  structures: StructureDef[];
  /** catalog module id -> structure kind; unlisted modules are not placed */
  moduleKinds: Record<string, StructureKind>;
  hubKind: StructureKind;
  /** kinds installed on the hub at start (no AP) */
  autoInstall: StructureKind[];
  consumable: { label: string; unit: string; startKg(design: MissionDesign, maxTurns: number): number };
  baseApPerTurn: number;
  baseStorageWh: number;
  baseDataStorageGb: number;
  /** Gb returned per science point */
  gbPerSciencePoint: number;
  /** instruments farther than this from the hub need a mesh (default 1) */
  nearHubRange?: number;
  /** how a storm hits */
  stormMode: "power-down" | "crew" | "downlink";
  stormCard(storm: Storm): StormCard;
  /** damage per severity point to unprotected structures when the player keeps working */
  stormDamage: number;
  scout: { label: string; range: number; needsTrait?: Trait; terrain?: TerrainKind[] };
  makeTiles(rng: Rng, design: MissionDesign, catalog: Catalog, live?: OpsLive): Tile[];
  makeSchedule(rng: Rng, design: MissionDesign, catalog: Catalog, live: OpsLive | undefined, maxTurns: number): OpsEnv[];
  makeGoals(design: MissionDesign, catalog: Catalog, tiles: Tile[]): OpsGoal[];
  placeSecrets(rng: Rng, tiles: Tile[], goals: OpsGoal[]): Record<string, string>;
  /** progress of one goal now */
  goalProgress(goal: OpsGoal, s: OpsState, ctx: OpsCtx): number;
  research: ResearchSpec[];
  events: ScenarioEvent[];
  instrumentMul?(st: Structure, tile: Tile, env: OpsEnv, s: OpsState): number;
  onDiscover?(goalId: string, tile: Tile, s: OpsState): void;
  onStormWork?(s: OpsState, storm: Storm): void;
  /** called at the end of data resolution each turn; may change the draft state */
  onTurn?(s: OpsState, ctx: OpsCtx, info: TurnInfo): void;
}
