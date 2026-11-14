import { describe, expect, it } from "vitest";
import { catalog } from "../data";
import { coalition } from "../engine/fixtures";
import type { FlightResult, MissionDesign, MissionId } from "../engine/types";
import {
  applyAction,
  canRunOps,
  createOps,
  finalScore,
  getScenario,
  opsScore,
  replay,
  validTiles,
  whyNot,
  type OpsAction,
  type OpsCtx,
  type OpsInit,
  type OpsLive,
  type OpsState,
} from "./index";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const design = (missionId: MissionId, destinationId: string, moduleIds: string[], secondaryObjectiveIds: string[] = []): MissionDesign => ({
  missionId,
  coalition,
  values: { science: 0.4, safety: 0.3, cost: 0.3 },
  secondaryObjectiveIds,
  destinationId,
  launchVehicleId: "falcon-9",
  moduleIds,
  blueprintIds: [],
  rideshareIds: [],
});

const flight = (total = 600, over: Partial<FlightResult> = {}): FlightResult => ({
  seed: 1,
  success: true,
  events: [],
  telemetry: [],
  objectivesMet: [],
  dataReturnedGb: 0,
  score: { science: 50, safety: 50, efficiency: 50, collaboration: 50, total, grade: "B" },
  lessons: [],
  ...over,
});

const init = (seed = 7, live?: OpsLive): OpsInit => ({ flight: flight(), seed, ...(live ? { live } : {}) });

const MOON_MODULES = [
  "mb-blue-ghost", "mb-vsat", "mb-rfc", "mb-li-ion", "mb-rhu", "mb-ice-drill", "mb-rover", "mb-regolith-science",
  "mb-dust-plasma", "mb-dte-xband", "mb-relay", "mb-mesh", "mb-pq-link", "mb-dtn-node", "mb-habitat",
];
const moonDesign = (modules = MOON_MODULES) => design("moon-base-zero", "mb-connecting-ridge", modules, ["mb-ice", "mb-scout", "mb-quantum-link"]);
const ctxOf = (d: MissionDesign): OpsCtx => ({ design: d, catalog });

/** Resolve any waiting card with a safe option. */
function settle(s: OpsState, ctx: OpsCtx): OpsState {
  const card = s.pendingEvent;
  if (!card) return s;
  const opt = card.options.find((o) => o.id === "shelter") ?? card.options.find((o) => !whyNot(s, { type: "choose", eventId: card.id, optionId: o.id }, ctx)) ?? card.options[0];
  return applyAction(s, { type: "choose", eventId: card.id, optionId: opt.id }, ctx);
}

const idleTurn = (s: OpsState, ctx: OpsCtx) => applyAction(settle(s, ctx), { type: "advance" }, ctx);

function idle(s: OpsState, ctx: OpsCtx): OpsState {
  let cur = s;
  for (let i = 0; i < 40 && cur.status === "running"; i++) cur = idleTurn(cur, ctx);
  return cur;
}

interface Plan {
  /** module ids in the order to deploy */
  deploy: string[];
  /** pick a tile for a module from the valid ones */
  pick(s: OpsState, moduleId: string, tiles: string[]): string;
  build: { kind: string; moduleHint?: string }[];
  /** scout with this many tiles at most per turn */
  scout?: boolean;
}

const dist = (s: OpsState, id: string) => {
  const t = s.tiles.find((x) => x.id === id) as OpsState["tiles"][number];
  return (Math.abs(t.q) + Math.abs(t.r) + Math.abs(t.q + t.r)) / 2;
};

function turnOf(s: OpsState, ctx: OpsCtx, plan: Plan): OpsState {
  let cur = settle(s, ctx);
  const act = (a: OpsAction) => {
    if (cur.status === "running" && whyNot(cur, a, ctx) === null) {
      cur = applyAction(cur, a, ctx);
      return true;
    }
    return false;
  };
  // restart anything the power logic switched off when the energy is back
  if (cur.energyWh >= 0.5 * cur.storageWh && cur.env.sunFactor > 0.4) {
    for (const st of cur.structures) if (!st.on) act({ type: "toggle", structureId: st.id });
  }
  for (const st of [...cur.structures].sort((a, b) => a.health - b.health)) if (st.health < 55) act({ type: "repair", structureId: st.id });
  for (const moduleId of plan.deploy) {
    if (!cur.inventory.some((i) => i.moduleId === moduleId)) continue;
    const tiles = validTiles(cur, { moduleId }, ctx);
    if (tiles.length) act({ type: "deploy", moduleId, tileId: plan.pick(cur, moduleId, tiles) });
  }
  for (const b of plan.build) {
    const tiles = validTiles(cur, { build: b.kind }, ctx);
    if (tiles.length && !cur.structures.some((st) => st.kind === b.kind)) act({ type: "build", kind: b.kind, tileId: tiles[0] });
  }
  for (const r of [...cur.research].sort((a, b) => a.cost - b.cost)) act({ type: "research", id: r.id });
  if (plan.scout) {
    for (const t of cur.tiles) if (cur.ap > 0) act({ type: "scout", tileId: t.id });
  }
  return applyAction(cur, { type: "advance" }, ctx);
}

function play(d: MissionDesign, plan: Plan, i = init()): OpsState {
  const ctx = ctxOf(d);
  let s = createOps(d, catalog, i);
  for (let n = 0; n < 40 && s.status === "running"; n++) s = turnOf(s, ctx, plan);
  return s;
}

const nearest = (s: OpsState, tiles: string[], by: (id: string) => number) =>
  [...tiles].sort((a, b) => dist(s, a) - dist(s, b) || by(b) - by(a))[0];
const dist2 = (s: OpsState, id: string, to: { q: number; r: number }) => {
  const t = s.tiles.find((x) => x.id === id) as OpsState["tiles"][number];
  const dq = t.q - to.q;
  const dr = t.r - to.r;
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
};
const prop = (s: OpsState, id: string, key: "sun" | "earthView" | "iceKgPerTurn") => (s.tiles.find((t) => t.id === id) as OpsState["tiles"][number])[key];

const moonPlan: Plan = {
  deploy: ["mb-vsat", "mb-rfc", "mb-li-ion", "mb-relay", "mb-dte-xband", "mb-regolith-science", "mb-dust-plasma", "mb-mesh", "mb-habitat", "mb-rover", "mb-ice-drill"],
  pick(s, moduleId, tiles) {
    if (moduleId === "mb-vsat") return [...tiles].sort((a, b) => prop(s, b, "sun") - prop(s, a, "sun") || dist(s, a) - dist(s, b))[0];
    if (moduleId === "mb-ice-drill") return [...tiles].sort((a, b) => prop(s, b, "iceKgPerTurn") - prop(s, a, "iceKgPerTurn") || dist(s, a) - dist(s, b))[0];
    if (moduleId === "mb-dte-xband") return nearest(s, tiles, (id) => prop(s, id, "earthView"));
    return nearest(s, tiles, () => 0);
  },
  build: [{ kind: "berm" }, { kind: "greenhouse" }],
  scout: true,
};

/* ------------------------------------------------------------------ */
/* Core rules, on the Moon scenario                                    */
/* ------------------------------------------------------------------ */

describe("ops core (Moon)", () => {
  const d = moonDesign();
  const ctx = ctxOf(d);

  it("is deterministic: replay equals stepping, same seed same schedule", () => {
    const a = createOps(d, catalog, init(11));
    const b = createOps(d, catalog, init(11));
    const c = createOps(d, catalog, init(12));
    expect(a.schedule).toEqual(b.schedule);
    expect(a.schedule).not.toEqual(c.schedule);
    expect(a.tiles).toEqual(b.tiles);
    const end = play(d, moonPlan, init(11));
    expect(replay(d, catalog, init(11), end.actions)).toEqual(end);
  });

  it("does not mutate its input and returns the same object for invalid actions", () => {
    const s = createOps(d, catalog, init());
    const copy = structuredClone(s);
    const bad: OpsAction = { type: "deploy", moduleId: "mb-vsat", tileId: "nowhere" };
    expect(applyAction(s, bad, ctx)).toBe(s);
    const good: OpsAction = { type: "deploy", moduleId: "mb-vsat", tileId: validTiles(s, { moduleId: "mb-vsat" }, ctx)[0] };
    const next = applyAction(s, good, ctx);
    expect(next).not.toBe(s);
    expect(s).toEqual(copy);
    expect(next.actions).toEqual([good]);
  });

  it("rejects an invalid deploy with a short reason", () => {
    const s = createOps(d, catalog, init());
    const psr = s.tiles.find((t) => t.terrain === "psr") as OpsState["tiles"][number];
    const why = whyNot(s, { type: "deploy", moduleId: "mb-vsat", tileId: psr.id }, ctx);
    expect(why).toMatch(/Solar array/);
    expect(why && why.length).toBeLessThanOrEqual(80);
    expect(whyNot(s, { type: "deploy", moduleId: "mb-rover", tileId: psr.id }, ctx)).not.toBeNull();
    expect(whyNot(s, { type: "deploy", moduleId: "mb-vsat", tileId: s.tiles[0].id }, ctx)).not.toBeNull();
    expect(whyNot(s, { type: "deploy", moduleId: "mb-li-ion", tileId: s.tiles.find((t) => t.q === 2 && t.r === 0)?.id ?? "x" }, ctx)).toMatch(/next to the hub/);
  });

  it("builds a 19 tile map with the destination terrain mix", () => {
    const s = createOps(d, catalog, init());
    expect(s.tiles).toHaveLength(19);
    const count = (t: string) => s.tiles.filter((x) => x.terrain === t).length;
    expect([count("ridge"), count("rim"), count("slope"), count("psr")]).toEqual([6, 3, 4, 3]);
    expect(s.maxTurns).toBe(15);
  });

  it("switches off science before comms in a power shortage", () => {
    let s = createOps(d, catalog, init());
    for (const m of ["mb-regolith-science", "mb-rover", "mb-dte-xband", "mb-relay"]) {
      const tiles = validTiles(s, { moduleId: m }, ctx);
      s = applyAction(s, { type: "deploy", moduleId: m, tileId: tiles[0] }, ctx);
    }
    s = { ...s, energyWh: 0, ap: 0 };
    s = applyAction(s, { type: "advance" }, ctx);
    const on = (id: string) => s.structures.find((st) => st.id === id)?.on;
    expect(on("mb-regolith-science")).toBe(false);
    expect(on("mb-rover")).toBe(false);
    expect(on("mb-dte-xband")).toBe(true);
    expect(on("mb-relay")).toBe(true);
    expect(s.log.some((l) => l.text.startsWith("Power short"))).toBe(true);
  });

  it("freezes and loses in the dark with no heater and no battery", () => {
    const bare = design("moon-base-zero", "mb-connecting-ridge", ["mb-blue-ghost"]);
    const end = idle(createOps(bare, catalog, init()), ctxOf(bare));
    expect(end.status).toBe("lost");
    expect(end.lostReason).toBeTruthy();
    expect(end.frozenTurns).toBeGreaterThanOrEqual(2);
  });

  it("blocks advance on a storm card until the player chooses", () => {
    const ctx2 = ctx;
    let s = createOps(d, catalog, init());
    for (let i = 0; i < 20 && !s.pendingEvent?.id.startsWith("storm-"); i++) s = idleTurn(s, ctx2);
    const card = s.pendingEvent;
    expect(card?.id.startsWith("storm-")).toBe(true);
    expect(whyNot(s, { type: "advance" }, ctx2)).toMatch(/event card/);
    expect(applyAction(s, { type: "advance" }, ctx2)).toBe(s);
    expect(card?.text).toMatch(/simulated/);
  });

  it("sheltering avoids storm damage", () => {
    let s = createOps(d, catalog, init());
    for (let i = 0; i < 20 && !s.pendingEvent?.id.startsWith("storm-"); i++) s = idleTurn(s, ctx);
    const card = s.pendingEvent;
    if (!card) throw new Error("no storm");
    const run = (optionId: string) => {
      const t = applyAction(s, { type: "choose", eventId: card.id, optionId }, ctx);
      return applyAction({ ...t, ap: 0 }, { type: "advance" }, ctx).structures.find((st) => st.kind === "lander")?.health ?? 0;
    };
    expect(run("shelter")).toBeGreaterThan(run("work"));
  });

  it("uses live storms, DSN load and cites the NASA record", () => {
    const live: OpsLive = {
      storms: [{ kind: "FLR", severity: 3, note: "X1.2 flare observed 2026-11-12", liveSource: { title: "DONKI", url: "https://kauai.ccmc.gsfc.nasa.gov/DONKI/" } }],
      dsnFreeFraction: 0.5,
    };
    const s = createOps(d, catalog, init(3, live));
    const stormTurns = s.schedule.filter((e) => e.storm);
    expect(stormTurns).toHaveLength(1);
    expect(stormTurns[0].storm?.severity).toBe(3);
    expect(stormTurns[0].turn).toBeGreaterThanOrEqual(2);
    expect(s.schedule.every((e) => e.dsnFactor >= 0.4 && e.dsnFactor <= 0.6)).toBe(true);
  });

  it("completes the main quest in order", () => {
    const end = play(d, moonPlan);
    const done = end.log.filter((l) => l.text.startsWith("Goal done: ")).map((l) => l.text);
    const mains = end.goals.filter((g) => g.kind === "main").sort((a, b) => (a.step ?? 0) - (b.step ?? 0));
    const idx = mains.map((g) => done.findIndex((t) => t.includes(g.title)));
    const found = idx.filter((i) => i >= 0);
    expect(found).toEqual([...found].sort((a, b) => a - b));
    expect(found.length).toBeGreaterThanOrEqual(3);
    expect(mains[0].done).toBe(true);
    expect(mains[1].done).toBe(true);
  });

  it("applies a research effect", () => {
    let s = createOps(d, catalog, init());
    expect(whyNot(s, { type: "research", id: "driving" }, ctx)).toMatch(/science points/);
    s = { ...s, sciencePoints: 100 };
    s = applyAction(s, { type: "research", id: "driving" }, ctx);
    expect(s.research.find((r) => r.id === "driving")?.unlocked).toBe(true);
    expect(whyNot(s, { type: "build", kind: "wadi", tileId: "x" }, ctx)).toMatch(/Research/);
    s = applyAction({ ...s, ap: 0 }, { type: "advance" }, ctx);
    expect(s.apPerTurn).toBe(5);
    expect(s.ap).toBe(5);
  });

  it("ends at maxTurns and then accepts nothing", () => {
    const end = idle(createOps(moonDesign(), catalog, init()), ctx);
    expect(["ended", "lost"]).toContain(end.status);
    const good = play(d, moonPlan);
    expect(good.status).toBe("ended");
    expect(good.turn).toBe(good.maxTurns);
    expect(whyNot(good, { type: "advance" }, ctx)).toMatch(/over/);
  });

  it("weighs flight 40 percent and operations 60 percent in finalScore", () => {
    const end = play(d, moonPlan);
    const o = opsScore(end).total * 10;
    const f = flight(700);
    expect(finalScore(f, end).total).toBe(Math.round(0.4 * 700 + 0.6 * o));
    expect(finalScore(f, null)).toMatchObject({ total: 700, grade: "B", ops: 0 });
    expect(canRunOps(flight(600, { success: false, lostAt: "arrival" }))).toBe(false);
    expect(canRunOps(flight(600, { success: false, lostAt: "operations" }))).toBe(true);
    expect(canRunOps(flight())).toBe(true);
  });

  it("scores a scripted good play above 60 and above idle play", () => {
    const good = play(d, moonPlan);
    const bad = idle(createOps(d, catalog, init()), ctx);
    expect(opsScore(good).total).toBeGreaterThanOrEqual(60);
    expect(opsScore(bad).total).toBeLessThan(opsScore(good).total);
  });

  it("moves a rover and reveals a discovery by scouting its tile", () => {
    let s = createOps(d, catalog, init());
    const [goalId, tileId] = Object.entries(s.secrets)[0];
    const spot = s.tiles.find((t) => t.id === tileId) as OpsState["tiles"][number];
    const near = validTiles(s, { moduleId: "mb-rover" }, ctx).sort((a, b) => dist2(s, a, spot) - dist2(s, b, spot))[0];
    s = applyAction(s, { type: "deploy", moduleId: "mb-rover", tileId: near }, ctx);
    const to = validTiles(s, { move: "mb-rover" }, ctx)[0];
    s = applyAction(s, { type: "move", structureId: "mb-rover", tileId: to }, ctx);
    expect(s.structures.find((x) => x.id === "mb-rover")?.tileId).toBe(to);
    s = { ...s, ap: 4 };
    const reach = s.tiles.map((t) => t.id).filter((id) => whyNot(s, { type: "scout", tileId: id }, ctx) === null);
    expect(reach.length).toBeGreaterThan(0);
    s = applyAction({ ...s, structures: s.structures.map((st) => (st.id === "mb-rover" ? { ...st, tileId: near } : st)) }, { type: "scout", tileId }, ctx);
    expect(s.goals.find((g) => g.id === goalId)?.done).toBe(true);
    expect(s.goals.find((g) => g.id === goalId)?.hidden).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* Orbital Lab                                                         */
/* ------------------------------------------------------------------ */

const STATION_MODULES = [
  "ol-cargo-dragon", "ol-iss-link", "ol-iss-power", "ol-combustion", "ol-biomonitor", "ol-dosimetry",
  "ol-plant-chamber", "ol-protein-crystal", "ol-bioprinter", "ol-cold-atom",
];
const stationDesign = () => design("orbital-lab", "ol-iss", STATION_MODULES, ["ol-plants", "ol-health", "ol-fire-safety"]);

const stationPlan: Plan = {
  deploy: ["ol-dosimetry", "ol-biomonitor", "ol-plant-chamber", "ol-combustion", "ol-bioprinter", "ol-protein-crystal", "ol-cold-atom"],
  pick(s, moduleId, tiles) {
    if (moduleId === "ol-dosimetry") {
      const ext = tiles.find((id) => s.tiles.find((t) => t.id === id)?.terrain === "external");
      if (ext) return ext;
    }
    return tiles[0];
  },
  build: [],
  scout: true,
};

describe("Orbital Lab scenario", () => {
  const d = stationDesign();
  const ctx = ctxOf(d);

  it("sets up the station: 19 locations, 10 turns, crew hours", () => {
    const s = createOps(d, catalog, init());
    expect(s.tiles).toHaveLength(19);
    expect(s.tiles[0].label).toBe("Harmony docking port");
    expect(s.maxTurns).toBe(10);
    expect(s.apPerTurn).toBe(3);
    expect(getScenario("orbital-lab").consumable.label).toBe("Crew time supplies");
    expect(s.structures.map((x) => x.id).sort()).toEqual(["ol-cargo-dragon", "ol-iss-link", "ol-iss-power"]);
  });

  it("keeps experiments in racks and is deterministic", () => {
    const s = createOps(d, catalog, init());
    const node = s.tiles.find((t) => t.terrain === "node" && t.id !== s.tiles[0].id) as OpsState["tiles"][number];
    expect(whyNot(s, { type: "deploy", moduleId: "ol-combustion", tileId: node.id }, ctx)).toMatch(/Experiment/);
    const end = play(d, stationPlan, init(5));
    expect(replay(d, catalog, init(5), end.actions)).toEqual(end);
  });

  it("makes dosimeters work better outside", () => {
    let s = createOps(d, catalog, init());
    const ext = s.tiles.find((t) => t.terrain === "external") as OpsState["tiles"][number];
    const rack = s.tiles.find((t) => t.terrain === "rack") as OpsState["tiles"][number];
    const once = (tileId: string) => {
      const t = applyAction(s, { type: "deploy", moduleId: "ol-dosimetry", tileId }, ctx);
      const n = applyAction({ ...t, ap: 0 }, { type: "advance" }, ctx);
      return n.dataStoredGb + n.dataReturnedGb;
    };
    s = { ...s, ap: 3 };
    expect(once(ext.id)).toBeGreaterThan(once(rack.id));
  });

  it("lets the crew shelter in a node for one crew hour", () => {
    let s = createOps(d, catalog, init());
    for (let i = 0; i < 20 && !s.pendingEvent?.id.startsWith("storm-"); i++) s = idleTurn(s, ctx);
    const card = s.pendingEvent;
    if (!card) throw new Error("no storm");
    const before = s.ap;
    const t = applyAction(s, { type: "choose", eventId: card.id, optionId: "shelter" }, ctx);
    expect(t.ap).toBe(Math.max(0, before - 1));
  });

  it("scores a scripted good play above 60 and above idle play", () => {
    const good = play(d, stationPlan);
    const bad = idle(createOps(d, catalog, init()), ctx);
    expect(good.status).toBe("ended");
    expect(opsScore(good).total).toBeGreaterThanOrEqual(60);
    expect(opsScore(bad).total).toBeLessThan(opsScore(good).total);
  });
});
