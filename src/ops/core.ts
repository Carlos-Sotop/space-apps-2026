import type { Catalog, MissionDesign } from "../engine/types";
import { makeRng } from "../engine/rng";
import type { OpsScenario, StructureDef } from "./scenario";
import { getScenario } from "./scenarios";
import {
  DAYS_PER_TURN,
  HOURS_PER_TURN,
  type OpsAction,
  type OpsCtx,
  type OpsEffect,
  type OpsEventCard,
  type OpsGoal,
  type OpsInit,
  type OpsState,
  type Structure,
  type StructureKind,
  type Tile,
} from "./types";
import { warningsFor } from "./warnings";
import {
  addLog,
  bump,
  defOf,
  effectsOf,
  flag,
  hasTrait,
  heated,
  hexDist,
  hubStructure,
  hubTile,
  isActive,
  maxTurnsFor,
  shielded,
  statsOf,
  tileById,
  tileLabel,
} from "./util";

const EVENT_CHANCE = 0.35;
const HEALTH_WEAR = 2;
const REPAIR_HEALTH = 40;
const FREEZE_DAMAGE = 25;

const cut = (t: string) => (t.length <= 80 ? t : `${t.slice(0, 79)}…`);

/* ------------------------------------------------------------------ */
/* Derived numbers                                                     */
/* ------------------------------------------------------------------ */

function apPerTurn(s: OpsState, sc: OpsScenario): number {
  const hab = s.structures.filter(isActive).reduce((sum, st) => sum + (defOf(sc, st.kind)?.apBonus ?? 0), 0);
  return sc.baseApPerTurn + effectsOf(s, sc).ap + hab;
}

function recomputeStorage(s: OpsState, sc: OpsScenario, ctx: OpsCtx): void {
  let wh = sc.baseStorageWh;
  let gb = sc.baseDataStorageGb;
  for (const st of s.structures) {
    if (!isActive(st)) continue;
    const d = defOf(sc, st.kind);
    if (d?.traits.includes("battery")) wh += statsOf(st, sc, ctx.catalog).storageWh;
    gb += d?.dataStorageGb ?? 0;
  }
  s.storageWh = wh;
  s.dataStorageGb = gb;
}

function setEnv(s: OpsState): void {
  s.env = s.schedule[s.turn - 1];
  s.forecast = s.schedule.slice(s.turn, s.turn + 3);
}

/* ------------------------------------------------------------------ */
/* Creation                                                            */
/* ------------------------------------------------------------------ */

export function createOps(design: MissionDesign, catalog: Catalog, init: OpsInit): OpsState {
  const sc = getScenario(design.missionId);
  const maxTurns = maxTurnsFor(design, catalog);
  const tiles = sc.makeTiles(makeRng(init.seed ^ 0x1111), design, catalog, init.live);
  const schedule = sc.makeSchedule(makeRng(init.seed ^ 0x2222), design, catalog, init.live, maxTurns);
  const goals = sc.makeGoals(design, catalog, tiles);
  const secrets = sc.placeSecrets(makeRng(init.seed ^ 0x3333), tiles, goals);
  const hub = hubTile({ tiles });
  const structures: Structure[] = [];
  const inventory: OpsState["inventory"] = [];
  for (const moduleId of design.moduleIds) {
    const kind = sc.moduleKinds[moduleId];
    const def = kind ? defOf(sc, kind) : undefined;
    if (!kind || !def) continue;
    if (kind === sc.hubKind || sc.autoInstall.includes(kind) || def.allowedTerrain.length === 0) {
      structures.push({ id: moduleId, kind, moduleId, tileId: hub.id, on: true, health: 100 });
    } else {
      inventory.push({ moduleId, kind });
    }
  }
  const s: OpsState = {
    missionId: design.missionId,
    seed: init.seed,
    turn: 1,
    maxTurns,
    ap: 0,
    apPerTurn: 0,
    tiles,
    structures,
    inventory,
    energyWh: 0,
    storageWh: 0,
    waterKg: sc.consumable.startKg(design, maxTurns),
    dataStoredGb: 0,
    dataStorageGb: 0,
    dataReturnedGb: 0,
    dataLostGb: 0,
    science: 0,
    env: schedule[0],
    forecast: [],
    schedule,
    pendingEvent: null,
    goals,
    research: sc.research.map((r) => ({ id: r.id, title: r.title, blurb: r.blurb, cost: r.cost, requires: r.requires, unlocked: false })),
    sciencePoints: 0,
    log: [],
    history: [],
    status: "running",
    frozenTurns: 0,
    seenEvents: [],
    secrets,
    flags: {},
    actions: [],
  };
  recomputeStorage(s, sc, { design, catalog });
  s.energyWh = s.storageWh;
  s.apPerTurn = apPerTurn(s, sc);
  s.ap = s.apPerTurn;
  bump(s, "apTotal", s.apPerTurn);
  setEnv(s);
  addLog(s, "info", `${sc.title}: ${hub.label ?? sc.hubLabel} is ready. Deploy your modules.`);
  queueCard(s, sc, { design, catalog }, false);
  return s;
}

/* ------------------------------------------------------------------ */
/* Placement rules                                                     */
/* ------------------------------------------------------------------ */

function placeWhy(s: OpsState, sc: OpsScenario, def: StructureDef, tile: Tile, terrain?: string[]): string | null {
  if (tile.q === 0 && tile.r === 0) return `The ${sc.hubLabel.toLowerCase()} tile is taken.`;
  const allowed = terrain ?? def.allowedTerrain;
  if (!allowed.includes(tile.terrain)) {
    const names = allowed.map((t) => sc.terrains.find((x) => x.id === t)?.label ?? t).join(", ");
    return cut(`${def.label} can go on: ${names}`);
  }
  if (def.needsIce && tile.iceKgPerTurn <= 0) return "Drills need a tile with ice.";
  if (def.adjacentToHub && hexDist(tile, hubTile(s)) !== 1) return `${def.label} must be right next to the hub.`;
  const here = s.structures.filter((st) => st.tileId === tile.id);
  const overlay = def.traits.includes("overlay");
  const taken = here.some((st) => (overlay ? hasTrait(sc, st, "overlay") : !hasTrait(sc, st, "overlay")));
  if (taken) return "That tile is already in use.";
  return null;
}

export function validTiles(
  s: OpsState,
  what: { moduleId: string } | { build: StructureKind } | { move: string },
  _ctx: OpsCtx,
): string[] {
  const sc = getScenario(s.missionId);
  let def: StructureDef | undefined;
  let terrain: string[] | undefined;
  let from: Tile | undefined;
  let range = Infinity;
  if ("moduleId" in what) {
    const item = s.inventory.find((i) => i.moduleId === what.moduleId);
    def = item ? defOf(sc, item.kind) : undefined;
  } else if ("build" in what) {
    def = defOf(sc, what.build);
  } else {
    const st = s.structures.find((x) => x.id === what.move);
    def = st ? defOf(sc, st.kind) : undefined;
    if (!st || !def?.move) return [];
    terrain = def.move.terrain ?? def.allowedTerrain;
    from = tileById(s, st.tileId);
    range = def.move.range;
  }
  if (!def) return [];
  const d = def;
  return s.tiles
    .filter((t) => t.id !== from?.id && (!from || hexDist(from, t) <= range) && placeWhy(s, sc, d, t, terrain) === null)
    .map((t) => t.id);
}

/* ------------------------------------------------------------------ */
/* Rules for actions                                                   */
/* ------------------------------------------------------------------ */

function eventDef(sc: OpsScenario, card: OpsEventCard) {
  return sc.events.find((e) => e.id === card.id);
}

export function whyNot(s: OpsState, a: OpsAction, _ctx: OpsCtx): string | null {
  const sc = getScenario(s.missionId);
  if (s.status !== "running") return "Operations are over.";
  const needAp = (n: number) => (s.ap < n ? "No action points left this turn." : null);
  switch (a.type) {
    case "advance":
      return s.pendingEvent ? "Choose on the event card first." : null;
    case "choose": {
      const card = s.pendingEvent;
      if (!card || card.id !== a.eventId) return "That event is not waiting for you.";
      if (!card.options.some((o) => o.id === a.optionId)) return "That option does not exist.";
      const opt = eventDef(sc, card)?.options.find((o) => o.id === a.optionId);
      if (opt?.needsAp && s.ap < opt.needsAp) return "You need an action point for that.";
      return null;
    }
    case "toggle": {
      const st = s.structures.find((x) => x.id === a.structureId);
      if (!st) return "No such structure.";
      if (st.on && hasTrait(sc, st, "hub")) return cut(`The ${defOf(sc, st.kind)?.label ?? st.kind} must stay on.`);
      if (!st.on && st.health <= 0) return "It is broken: repair it first.";
      return null;
    }
    case "deploy": {
      const item = s.inventory.find((i) => i.moduleId === a.moduleId);
      if (!item) return "That module is not in the cargo bay.";
      const def = defOf(sc, item.kind);
      const tile = tileById(s, a.tileId);
      if (!def || !tile) return "Pick a tile on the map.";
      return needAp(1) ?? placeWhy(s, sc, def, tile);
    }
    case "build": {
      const def = defOf(sc, a.kind);
      const tile = tileById(s, a.tileId);
      if (!def?.buildCost) return "That cannot be built on site.";
      if (def.lockedUntilResearch && !effectsOf(s, sc).unlocked.has(def.kind)) return "Research it first.";
      if (!tile) return "Pick a tile on the map.";
      if (s.ap < def.buildCost.ap) return "Not enough action points to build.";
      if ((def.buildCost.waterKg ?? 0) > s.waterKg) return cut(`Needs ${def.buildCost.waterKg} ${sc.consumable.unit} of ${sc.consumable.label.toLowerCase()}.`);
      return placeWhy(s, sc, def, tile);
    }
    case "move": {
      const st = s.structures.find((x) => x.id === a.structureId);
      const def = st ? defOf(sc, st.kind) : undefined;
      const tile = tileById(s, a.tileId);
      if (!st || !def?.move) return "That cannot move.";
      if (!tile) return "Pick a tile on the map.";
      const from = tileById(s, st.tileId);
      if (from && hexDist(from, tile) > def.move.range) return `Too far: ${def.move.range} tiles at most.`;
      if (tile.id === st.tileId) return "It is already there.";
      if (flag(s, "stuck") === s.turn && hasTrait(sc, st, "rover")) return "The rover is stuck this turn.";
      if ((def.move.waterKg ?? 0) > s.waterKg) return cut(`Not enough ${sc.consumable.label.toLowerCase()} to move.`);
      return needAp(1) ?? placeWhy(s, sc, def, tile, def.move.terrain ?? def.allowedTerrain);
    }
    case "research": {
      const r = s.research.find((x) => x.id === a.id);
      if (!r) return "No such research.";
      if (r.unlocked) return "Already researched.";
      if (r.requires && !s.research.find((x) => x.id === r.requires)?.unlocked) return "Research the step before it first.";
      if (s.sciencePoints < r.cost) return `Needs ${r.cost} science points.`;
      return needAp(1);
    }
    case "scout": {
      const tile = tileById(s, a.tileId);
      if (!tile) return "Pick a tile on the map.";
      if (tile.scouted) return "Already scouted.";
      if (sc.scout.terrain && !sc.scout.terrain.includes(tile.terrain)) return cut(`${sc.scout.label} works on ${sc.scout.terrain.join(", ")} tiles.`);
      const need = sc.scout.needsTrait;
      if (need) {
        if (need === "rover" && flag(s, "stuck") === s.turn) return "The rover is stuck this turn.";
        // a working rover can scout any tile; other scouts (an imager over its region) need to be in range
        const range = need === "rover" ? Infinity : sc.scout.range;
        const near = s.structures.some((st) => {
          const t = tileById(s, st.tileId);
          return isActive(st) && hasTrait(sc, st, need) && !!t && hexDist(t, tile) <= range;
        });
        if (!near) return cut(need === "rover" ? "Deploy a rover first." : `Needs a working ${need} within ${sc.scout.range} tiles.`);
      }
      return needAp(1);
    }
    case "repair": {
      const st = s.structures.find((x) => x.id === a.structureId);
      if (!st) return "No such structure.";
      if (st.health >= 100) return "Already in good shape.";
      return needAp(1);
    }
  }
  return null;
}

/** Action points each action costs: the UI shows this on every action card. Toggling and advancing are free. */
export function apCost(s: OpsState, a: OpsAction): number {
  const sc = getScenario(s.missionId);
  switch (a.type) {
    case "deploy":
    case "move":
    case "research":
    case "scout":
    case "repair":
      return 1;
    case "build":
      return defOf(sc, a.kind)?.buildCost?.ap ?? 1;
    case "choose": {
      const card = s.pendingEvent;
      if (!card) return 0;
      if (card.id.startsWith("storm-")) return a.optionId === "shelter" && sc.stormMode === "crew" ? 1 : 0;
      return eventDef(sc, card)?.options.find((o) => o.id === a.optionId)?.needsAp ?? 0;
    }
    default:
      return 0;
  }
}

/* ------------------------------------------------------------------ */
/* Applying actions                                                    */
/* ------------------------------------------------------------------ */

function newId(s: OpsState, kind: string): string {
  return `${kind}-${s.structures.filter((x) => x.kind === kind).length + 1}`;
}

function spend(s: OpsState, ap: number): void {
  s.ap -= ap;
  bump(s, "apSpent", ap);
}

export function applyAction(state: OpsState, action: OpsAction, ctx: OpsCtx): OpsState {
  if (whyNot(state, action, ctx) !== null) return state;
  const sc = getScenario(state.missionId);
  const s = structuredClone(state);
  switch (action.type) {
    case "deploy": {
      const idx = s.inventory.findIndex((i) => i.moduleId === action.moduleId);
      const item = s.inventory.splice(idx, 1)[0];
      spend(s, 1);
      s.structures.push({ id: item.moduleId, kind: item.kind, moduleId: item.moduleId, tileId: action.tileId, on: true, health: 100 });
      addLog(s, "info", `Deployed ${defOf(sc, item.kind)?.label ?? item.kind} at ${tileLabel(s, action.tileId)}.`);
      break;
    }
    case "build": {
      const def = defOf(sc, action.kind) as StructureDef;
      spend(s, def.buildCost?.ap ?? 1);
      s.waterKg -= def.buildCost?.waterKg ?? 0;
      s.structures.push({ id: newId(s, def.kind), kind: def.kind, tileId: action.tileId, on: true, health: 100, streak: 0 });
      const tile = tileById(s, action.tileId) as Tile;
      if (def.earthViewBonus) tile.earthView = Math.min(1, tile.earthView + def.earthViewBonus);
      addLog(s, "info", `Built ${def.label} at ${tileLabel(s, action.tileId)}.`);
      break;
    }
    case "move": {
      const st = s.structures.find((x) => x.id === action.structureId) as Structure;
      const def = defOf(sc, st.kind) as StructureDef;
      spend(s, 1);
      s.waterKg -= def.move?.waterKg ?? 0;
      st.tileId = action.tileId;
      addLog(s, "info", `Moved ${def.label} to ${tileLabel(s, action.tileId)}.`);
      break;
    }
    case "research": {
      const r = s.research.find((x) => x.id === action.id);
      if (r) {
        spend(s, 1);
        s.sciencePoints -= r.cost;
        r.unlocked = true;
        addLog(s, "success", `Research done: ${r.title}.`);
      }
      break;
    }
    case "toggle": {
      const st = s.structures.find((x) => x.id === action.structureId) as Structure;
      st.on = !st.on;
      addLog(s, "info", `${defOf(sc, st.kind)?.label ?? st.kind} switched ${st.on ? "on" : "off"}.`);
      break;
    }
    case "scout": {
      const tile = tileById(s, action.tileId) as Tile;
      spend(s, 1);
      tile.scouted = true;
      addLog(s, "info", `${sc.scout.label}: ${tile.label ?? tile.id} (${sc.terrains.find((t) => t.id === tile.terrain)?.label ?? tile.terrain}).`);
      for (const [goalId, tid] of Object.entries(s.secrets)) {
        if (tid === tile.id) reveal(s, sc, goalId, tile);
      }
      break;
    }
    case "repair": {
      const st = s.structures.find((x) => x.id === action.structureId) as Structure;
      spend(s, 1);
      st.health = Math.min(100, st.health + REPAIR_HEALTH);
      addLog(s, "info", `Repaired ${defOf(sc, st.kind)?.label ?? st.kind}.`);
      break;
    }
    case "choose":
      choose(s, sc, ctx, action.optionId);
      break;
    case "advance":
      advance(s, sc, ctx);
      break;
  }
  s.actions.push(action);
  return s;
}

function award(s: OpsState, g: OpsGoal): void {
  g.done = true;
  g.progress = g.target;
  s.science += g.points;
  s.sciencePoints += Math.floor(g.points / 2);
  addLog(s, "success", `${g.kind === "discovery" ? "Discovery" : "Goal done"}: ${g.title}.`);
}

function reveal(s: OpsState, sc: OpsScenario, goalId: string, tile: Tile): void {
  const g = s.goals.find((x) => x.id === goalId);
  if (!g || g.done) return;
  g.hidden = false;
  award(s, g);
  const before = s.science;
  sc.onDiscover?.(goalId, tile, s);
  credit(s, s.science - before);
  (s.turnEffects ??= []).push({ kind: "discovery", tileId: tile.id, goalId }, { kind: "goal-done", goalId });
}

/** Science the player earns also lands in the science points they see and spend. */
function credit(s: OpsState, gained: number): void {
  if (gained !== 0) s.sciencePoints = Math.max(0, s.sciencePoints + gained);
}

/** Health a structure lost, kept per cause for the hub so a loss can say why. */
function hurt(s: OpsState, sc: OpsScenario, st: Structure, amount: number, cause: string): void {
  const before = st.health;
  st.health = Math.max(0, st.health - amount);
  if (st.kind === sc.hubKind && before > st.health) bump(s, `hubHurt:${cause}`, before - st.health);
}

function eventRng(s: OpsState): () => number {
  return makeRng((s.seed + s.turn * 7919 + s.actions.length * 104729) >>> 0);
}

function choose(s: OpsState, sc: OpsScenario, ctx: OpsCtx, optionId: string): void {
  const card = s.pendingEvent as OpsEventCard;
  const opt = card.options.find((o) => o.id === optionId);
  s.pendingEvent = null;
  if (card.id.startsWith("storm-")) {
    s.flags.stormChoice = optionId === "shelter" ? 1 : 2;
    if (optionId === "shelter" && sc.stormMode === "crew") s.ap = Math.max(0, s.ap - 1);
    addLog(s, "info", opt?.label ?? optionId);
    return;
  }
  const def = eventDef(sc, card)?.options.find((o) => o.id === optionId);
  if (def?.needsAp) spend(s, def.needsAp);
  const health = new Map(s.structures.map((st) => [st.id, st.health]));
  const science = s.science;
  def?.apply({ s, ctx, rng: eventRng(s) });
  credit(s, s.science - science);
  const hit = s.structures.filter((st) => st.health < (health.get(st.id) ?? st.health));
  if (hit.length) {
    const dmg = Math.max(...hit.map((st) => (health.get(st.id) ?? 0) - st.health));
    for (const st of hit) if (st.kind === sc.hubKind) bump(s, `hubHurt:${card.title.toLowerCase()}`, (health.get(st.id) ?? 0) - st.health);
    (s.turnEffects ??= []).push({ kind: "impact", tileId: hit[0]!.tileId, hitIds: hit.map((st) => st.id), damage: Math.round(dmg) });
  }
  addLog(s, "info", `${card.title}: ${opt?.label ?? optionId}`);
}

/* ------------------------------------------------------------------ */
/* Event cards                                                         */
/* ------------------------------------------------------------------ */

function queueCard(s: OpsState, sc: OpsScenario, ctx: OpsCtx, allowRandom: boolean): void {
  const storm = s.env.storm;
  if (storm) {
    const c = sc.stormCard(storm);
    s.pendingEvent = {
      id: `storm-${s.turn}`,
      turn: s.turn,
      title: c.title,
      text: storm.note,
      options: [
        { id: "shelter", ...c.shelter },
        { id: "work", ...c.work },
      ],
      ...(storm.liveSource ? { liveSource: storm.liveSource } : {}),
    };
    addLog(s, "warning", `${c.title}: ${storm.note}`, storm.liveSource);
    return;
  }
  if (!allowRandom) return;
  const rng = makeRng((s.seed * 31 + s.turn * 1013 + 7) >>> 0);
  if (rng() >= EVENT_CHANCE) return;
  const pool = sc.events.filter((e) => !s.seenEvents.includes(e.id) && (e.eligible?.(s, ctx) ?? true));
  if (!pool.length) return;
  const ev = pool[Math.floor(rng() * pool.length)];
  s.seenEvents.push(ev.id);
  s.pendingEvent = {
    id: ev.id,
    turn: s.turn,
    title: ev.title,
    text: ev.text,
    options: ev.options.map((o) => ({ id: o.id, label: o.label, hint: o.hint })),
    ...(ev.liveSource ? { liveSource: ev.liveSource } : {}),
  };
}

/* ------------------------------------------------------------------ */
/* Goals                                                               */
/* ------------------------------------------------------------------ */

function updateGoals(s: OpsState, sc: OpsScenario, ctx: OpsCtx): void {
  let changed = true;
  while (changed) {
    changed = false;
    const current = s.goals.filter((g) => g.kind === "main" && !g.done).sort((a, b) => (a.step ?? 0) - (b.step ?? 0))[0];
    for (const g of s.goals) {
      if (g.done || g.hidden) continue;
      if (g.kind === "main" && g !== current) continue;
      g.progress = Math.min(g.target, Math.max(g.progress, sc.goalProgress(g, s, ctx)));
      if (g.progress >= g.target) {
        award(s, g);
        if (g.kind === "main") changed = true;
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/* One turn                                                            */
/* ------------------------------------------------------------------ */

const CAUSE_WORDS: Record<string, string> = { cold: "the cold", supplies: "running out of supplies", storm: "the storm", wear: "wear" };

/** Why the outpost was lost, as a short chain of causes the player can act on next time. */
function lossReason(s: OpsState, sc: OpsScenario, hub: Structure | undefined, frozen: boolean): string {
  const name = sc.hubLabel.toLowerCase();
  if (frozen) {
    const sun = s.env.sunFactor;
    const why = sun <= 0.1 ? `Night fell and solar power dropped to ${Math.round(sun * 100)}%` : sun < 1 ? "The Sun was low" : "Power use stayed above what you generate";
    const heater = s.structures.some((st) => isActive(st) && hasTrait(sc, st, "heater"));
    return `${why}, the batteries ran empty, and the ${name} froze for two turns${heater ? "" : " with no heater"}.`;
  }
  const causes = Object.entries(s.flags)
    .filter(([k, v]) => k.startsWith("hubHurt:") && v > 0)
    .map(([k, v]) => ({ cause: k.slice("hubHurt:".length), v }))
    .sort((a, b) => b.v - a.v)
    .map(({ cause, v }) => `${CAUSE_WORDS[cause] ?? cause} took ${Math.round(v)}`);
  const label = hub ? (defOf(sc, hub.kind)?.label ?? sc.hubLabel).toLowerCase() : name;
  return causes.length ? `The ${label} broke down: ${causes.join(", ")} health, and it was not repaired in time.` : `The ${label} broke down.`;
}

function advance(s: OpsState, sc: OpsScenario, ctx: OpsCtx, preview = false): void {
  const { catalog } = ctx;
  const env = s.env;
  const fx = effectsOf(s, sc);
  const H = HOURS_PER_TURN;
  const hubT = hubTile(s);
  const choice = flag(s, "stormChoice");
  const shelter = !!env.storm && choice === 1 && sc.stormMode !== "crew";
  const produced: Record<string, number> = {};
  const tileOf = (st: Structure) => tileById(s, st.tileId) as Tile;
  const label = (st: Structure) => defOf(sc, st.kind)?.label ?? st.kind;
  const trait = (st: Structure, t: string) => hasTrait(sc, st, t);

  // the report: what changes this turn, in the order it happens
  const played = s.turn;
  const before = { energyWh: s.energyWh, waterKg: s.waterKg, dataStoredGb: s.dataStoredGb, dataReturnedGb: s.dataReturnedGb, sciencePoints: s.sciencePoints };
  const doneBefore = new Set(s.goals.filter((g) => g.done).map((g) => g.id));
  const effects: OpsEffect[] = [{ kind: "daylight", sunFactor: env.sunFactor, earthUp: env.earthUp }, ...(s.turnEffects ?? [])];
  s.turnEffects = [];

  recomputeStorage(s, sc, ctx);

  // 2. power
  const gen = (st: Structure) =>
    isActive(st) && trait(st, "generator")
      ? statsOf(st, sc, catalog).generatesW * env.sunFactor * tileOf(st).sun * (st.health / 100) * fx.generationMul
      : 0;
  const drawW = (st: Structure) => (isActive(st) ? statsOf(st, sc, catalog).powerW * (fx.powerMulKind[st.kind] ?? 1) : 0);
  const generatedW = s.structures.reduce((a, st) => a + gen(st), 0);
  let usedW = s.structures.reduce((a, st) => a + drawW(st), 0);
  const switchedOff: string[] = [];
  while (s.energyWh + (generatedW - usedW) * H < 0) {
    const cand = s.structures
      .filter((st) => drawW(st) > 0 && !trait(st, "hub"))
      .sort((a, b) => (defOf(sc, a.kind)?.priority ?? 0) - (defOf(sc, b.kind)?.priority ?? 0))[0];
    if (!cand) break;
    usedW -= drawW(cand);
    cand.on = false;
    switchedOff.push(cand.id);
    addLog(s, "warning", `Power short: ${label(cand)} switched off.`);
  }
  const netWh = (generatedW - usedW) * H;
  let blackout = false;
  if (s.energyWh + netWh < 0) {
    blackout = true;
    s.energyWh = 0;
    s.frozenTurns += 1;
    for (const st of s.structures) if (st.health > 0 && !heated(s, sc, st)) hurt(s, sc, st, FREEZE_DAMAGE, "cold");
    addLog(s, "failure", "No power: systems without a heater are freezing.");
  } else {
    s.energyWh = Math.min(s.storageWh, s.energyWh + netWh);
    s.frozenTurns = 0;
  }
  if (switchedOff.length || blackout)
    effects.push({ kind: "power-out", structureIds: blackout ? s.structures.filter((st) => isActive(st) && !trait(st, "overlay")).map((st) => st.id) : switchedOff });
  if (generatedW > 0) s.flags.generating = 1;
  bump(s, "generatedWh", generatedW * H);
  bump(s, "usedWh", usedW * H);

  // 3. consumable
  const supplied = new Set<string>();
  if (!blackout) {
    for (const st of s.structures) {
      if (isActive(st) && trait(st, "drill")) s.waterKg += tileOf(st).iceKgPerTurn * (st.health / 100);
    }
    for (const st of s.structures) {
      const need = defOf(sc, st.kind)?.consumeKgPerTurn ?? 0;
      if (!isActive(st) || need <= 0) continue;
      if (s.waterKg >= need) {
        s.waterKg -= need;
        supplied.add(st.id);
      } else if (trait(st, "hub")) {
        hurt(s, sc, st, 20, "supplies");
        addLog(s, "failure", `Out of ${sc.consumable.label.toLowerCase()}: the ${label(st).toLowerCase()} is losing health.`);
      }
    }
  }
  const stuck = flag(s, "stuck") === s.turn;
  const working = (st: Structure) => {
    const d = defOf(sc, st.kind);
    return !blackout && !shelter && isActive(st) && (!d?.consumeKgPerTurn || supplied.has(st.id)) && !(stuck && trait(st, "rover"));
  };

  // growth and science per turn: each producer adds to the science points the player sees
  for (const st of s.structures) {
    const d = defOf(sc, st.kind);
    if (!d) continue;
    if (d.growth) {
      st.streak = working(st) ? (st.streak ?? 0) + 1 : 0;
    }
    const grown = !d.growth || (st.streak ?? 0) >= d.growth.turns;
    if (d.sciencePerTurn && working(st) && grown) {
      s.science += d.sciencePerTurn;
      credit(s, d.sciencePerTurn);
      effects.push({ kind: "science", points: d.sciencePerTurn, fromIds: [st.id] });
    }
  }

  // 4. data
  const near = sc.nearHubRange ?? 1;
  const mesh = s.structures.some((st) => isActive(st) && trait(st, "mesh"));
  let producedGb = 0;
  for (const st of s.structures) {
    if (!trait(st, "instrument") || !working(st)) continue;
    const t = tileOf(st);
    if (hexDist(t, hubT) > near && !mesh) {
      if (!flag(s, `far:${st.id}`)) {
        s.flags[`far:${st.id}`] = 1;
        addLog(s, "warning", `${label(st)} is too far from the hub: data not collected. Build a mesh.`);
      }
      continue;
    }
    const g =
      statsOf(st, sc, catalog).dataGbPerDay * DAYS_PER_TURN * (st.health / 100) * fx.dataMul * (sc.instrumentMul?.(st, t, env, s) ?? 1);
    produced[st.id] = g;
    producedGb += g;
  }
  bump(s, "dataProduced", producedGb);
  s.dataStoredGb += producedGb;
  if (s.dataStoredGb > s.dataStorageGb) {
    s.dataLostGb += s.dataStoredGb - s.dataStorageGb;
    s.dataStoredGb = s.dataStorageGb;
  }
  let capacity = 0;
  let linked = false;
  const links: { id: string; gb: number }[] = [];
  const noDirect = flag(s, "noDte") === s.turn;
  const halved = !!env.storm && choice === 2 && sc.stormMode === "downlink" ? 0.5 : 1;
  if (!blackout) {
    for (const st of s.structures) {
      if (!isActive(st)) continue;
      const relay = trait(st, "relay");
      const direct = trait(st, "direct") && !noDirect && env.earthSignal + tileOf(st).earthView >= 0.5;
      if (!relay && !direct) continue;
      linked = true;
      const gb = statsOf(st, sc, catalog).downlinkGbPerDay * DAYS_PER_TURN * env.dsnFactor * fx.downlinkMul * (st.health / 100) * halved;
      capacity += gb;
      links.push({ id: st.id, gb });
    }
  }
  const sent = Math.min(s.dataStoredGb, capacity);
  s.dataStoredGb -= sent;
  s.dataReturnedGb += sent;
  if (sent > 0) for (const l of links) if (l.gb > 0) effects.push({ kind: "downlink", gb: (sent * l.gb) / capacity, fromId: l.id });
  const pts = (s.flags.gbCarry ?? 0) + sent / sc.gbPerSciencePoint;
  const whole = Math.floor(pts);
  s.sciencePoints += whole;
  s.flags.gbCarry = pts - whole;
  const sources = Object.keys(produced).filter((id) => (produced[id] ?? 0) > 0);
  if (whole > 0) effects.push({ kind: "science", points: whole, fromIds: sources.length ? sources : links.map((l) => l.id) });
  if (sent > 0) addLog(s, "info", `${Math.round(sent)} Gb reached Earth.`);

  const scienceBefore = s.science;
  sc.onTurn?.(s, ctx, { produced, shelter, blackout });

  // 5. storm: the report names who was hit and who a shield protected
  if (env.storm) {
    let hitIds: string[] = [];
    let shieldedIds: string[] = [];
    if (choice === 2 && sc.stormMode !== "downlink") {
      const exposed = s.structures.filter((st) => st.health > 0 && (sc.stormMode !== "crew" || trait(st, "instrument")));
      const hit = exposed.filter((st) => !shielded(s, sc, st));
      shieldedIds = exposed.filter((st) => shielded(s, sc, st)).map((st) => st.id);
      for (const st of hit) hurt(s, sc, st, sc.stormDamage * env.storm.severity, "storm");
      hitIds = hit.map((st) => st.id);
      sc.onStormWork?.(s, env.storm);
      addLog(s, "warning", `The storm hurt ${hit.length} structure${hit.length === 1 ? "" : "s"}.`);
    } else if (choice === 1) {
      addLog(s, "info", "You sheltered: no damage from the storm.");
    }
    effects.push({ kind: "storm", severity: env.storm.severity, shieldedIds, hitIds, ...(env.storm.liveSource ? { liveSource: env.storm.liveSource } : {}) });
  }
  const gained = s.science - scienceBefore;
  if (gained !== 0) {
    credit(s, gained);
    if (gained > 0) effects.push({ kind: "science", points: gained, fromIds: sources });
  }

  // wear
  for (const st of s.structures) {
    if (st.health <= 0) continue;
    hurt(s, sc, st, HEALTH_WEAR * fx.healthLossMul * (shielded(s, sc, st) ? 0.5 : 1), "wear");
  }

  // 7. goals
  updateGoals(s, sc, ctx);
  for (const g of s.goals) {
    if (!g.done || doneBefore.has(g.id)) continue;
    effects.push({ kind: "goal-done", goalId: g.id });
    if (Math.floor(g.points / 2) > 0) effects.push({ kind: "science", points: Math.floor(g.points / 2), fromIds: [] });
  }

  // 8. history, end
  s.history.push({
    turn: s.turn,
    energyWh: s.energyWh,
    generatedWh: generatedW * H,
    usedWh: usedW * H,
    waterKg: s.waterKg,
    dataReturnedGb: s.dataReturnedGb,
    linked,
  });
  s.flags.stormChoice = 0;
  const hub = hubStructure(s, sc);
  if (hub && hub.health <= 0) {
    s.status = "lost";
    s.lostReason = lossReason(s, sc, hub, false);
  } else if (s.frozenTurns >= 2) {
    s.status = "lost";
    s.lostReason = lossReason(s, sc, hub, true);
  }
  if (s.status === "lost") addLog(s, "failure", s.lostReason as string);
  else if (s.turn >= s.maxTurns) {
    s.status = "ended";
    addLog(s, "success", "The operations phase is over.");
  } else {
    s.turn += 1;
    setEnv(s);
    s.apPerTurn = apPerTurn(s, sc);
    s.ap = s.apPerTurn;
    bump(s, "apTotal", s.apPerTurn);
    if (!preview) queueCard(s, sc, ctx, true);
  }

  s.lastReport = {
    turn: played,
    fromDay: (played - 1) * DAYS_PER_TURN,
    toDay: played * DAYS_PER_TURN,
    delta: {
      energyWh: s.energyWh - before.energyWh,
      waterKg: s.waterKg - before.waterKg,
      dataStoredGb: s.dataStoredGb - before.dataStoredGb,
      dataReturnedGb: s.dataReturnedGb - before.dataReturnedGb,
      sciencePoints: s.sciencePoints - before.sciencePoints,
    },
    effects,
    warnings: preview ? [] : warningsFor(s, sc, ctx, (x) => previewState(x, ctx)),
  };
}

/**
 * The state after the current turn is played with no random events: a waiting card is set aside and a
 * storm nobody has answered yet is sheltered. Pure: the input is not changed.
 */
export function previewState(state: OpsState, ctx: OpsCtx): OpsState {
  const s = structuredClone(state);
  if (s.status !== "running") return s;
  s.pendingEvent = null;
  if (s.env.storm && !flag(s, "stormChoice")) s.flags.stormChoice = 1;
  advance(s, getScenario(s.missionId), ctx, true);
  return s;
}
