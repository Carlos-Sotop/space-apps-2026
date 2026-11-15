// C4: Operations that explain themselves. Every turn reports what happened, the next turn can be
// previewed, every loss is announced ahead with a fix, and the recommended design wins when the player
// follows the main quest and the warnings.
import { describe, expect, it } from "vitest";
import { catalog } from "../data";
import { autoDesign, simulateFlight } from "../engine";
import type { Coalition, MissionDesign, MissionId } from "../engine/types";
import {
  apCost,
  applyAction,
  canRunOps,
  createOps,
  getScenario,
  projectTurn,
  validTiles,
  whyNot,
  type OpsAction,
  type OpsCtx,
  type OpsEffect,
  type OpsState,
} from "./index";
import { defOf, hexDist, hubTile, isActive, statsOf } from "./util";

const SPECIALISTS: Record<MissionId, Coalition> = {
  "orbital-lab": { leadId: "nasa", partnerIds: ["esa", "jaxa", "csa"] },
  "earth-guardian": { leadId: "nasa", partnerIds: ["esa", "aee", "csa"] },
  "moon-base-zero": { leadId: "nasa", partnerIds: ["jaxa", "isro", "blue-origin"] },
};
const MISSIONS = Object.keys(SPECIALISTS) as MissionId[];

/** Operations for a design, after the first flight seed that arrives. */
function opsFor(d: MissionDesign, seed: number): OpsState | null {
  for (let f = seed; f < seed + 40; f++) {
    const flight = simulateFlight(d, catalog, f);
    if (canRunOps(flight)) return createOps(d, catalog, { flight, seed: seed * 13 });
  }
  return null;
}

type Player = (s: OpsState, ctx: OpsCtx) => OpsState;

/** Plays a whole phase; `beforeAdvance` sees every state right before a turn is played. */
function playOut(s0: OpsState, ctx: OpsCtx, turn: Player, beforeAdvance?: (s: OpsState, next: OpsState) => void): OpsState {
  let s = s0;
  for (let n = 0; n < 40 && s.status === "running"; n++) {
    s = turn(s, ctx);
    if (s.status !== "running" || s.pendingEvent) continue;
    const next = applyAction(s, { type: "advance" }, ctx);
    beforeAdvance?.(s, next);
    s = next;
  }
  return s;
}

/** Follows the main quest and acts on every warning: deploys, repairs, cuts loads before the dark, shelters. */
const heedful: Player = (s0, ctx) => {
  let s = s0;
  const sc = getScenario(s.missionId);
  const act = (a: OpsAction) => {
    if (s.status === "running" && whyNot(s, a, ctx) === null) s = applyAction(s, a, ctx);
  };
  const card = s.pendingEvent;
  if (card) {
    const free = (id: string) => whyNot(s, { type: "choose", eventId: card.id, optionId: id }, ctx) === null;
    const careful = card.options.find((o) => free(o.id) && (sc.events.find((e) => e.id === card.id)?.options.find((x) => x.id === o.id)?.needsAp ?? 0) > 0);
    const pick = card.id.startsWith("storm-") ? (free("shelter") ? "shelter" : "work") : (careful?.id ?? card.options[1]!.id);
    act({ type: "choose", eventId: card.id, optionId: pick });
  }
  const home = hubTile(s);
  for (const item of [...s.inventory]) {
    const d = defOf(sc, item.kind)!;
    const tiles = validTiles(s, { moduleId: item.moduleId }, ctx);
    const tile = (id: string) => s.tiles.find((t) => t.id === id)!;
    const fit = (id: string) => {
      const t = tile(id);
      const near = hexDist(t, home);
      if (d.traits.includes("generator")) return t.sun * 10 - near;
      if (d.traits.includes("direct")) return t.earthView * 10 - near;
      if (d.traits.includes("drill")) return t.iceKgPerTurn * 10 - near;
      return t.value - near;
    };
    if (tiles.length) act({ type: "deploy", moduleId: item.moduleId, tileId: [...tiles].sort((a, b) => fit(b) - fit(a))[0]! });
  }
  for (const st of [...s.structures].sort((a, b) => a.health - b.health)) if (st.health < 50) act({ type: "repair", structureId: st.id });
  for (let k = 0; k < 4; k++) {
    const w = projectTurn(s, ctx).warnings;
    if (!w.some((x) => x.severity === "danger" && (x.id === "battery-empty" || x.id === "loss"))) break;
    const load = s.structures
      .filter((st) => isActive(st) && !defOf(sc, st.kind)?.traits.includes("hub") && statsOf(st, sc, catalog).powerW > 0)
      .sort((a, b) => statsOf(b, sc, catalog).powerW - statsOf(a, sc, catalog).powerW)[0];
    if (!load) break;
    act({ type: "toggle", structureId: load.id });
  }
  for (const st of s.structures.filter((x) => !x.on && x.health > 0)) {
    const trial = applyAction(s, { type: "toggle", structureId: st.id }, ctx);
    if (!projectTurn(trial, ctx).warnings.some((x) => x.severity === "danger")) s = trial;
  }
  // Earth's main quest: retask imagers onto regions not covered yet
  if (s.goals.some((g) => g.id === "main-cover" && !g.done))
    for (const st of s.structures.filter((x) => x.kind === "campaign")) {
      const open = validTiles(s, { move: st.id }, ctx).filter((id) => !Object.keys(s.flags).some((k) => k.startsWith("cov:") && k.endsWith(`:${id}`)));
      const best = open.sort((a, b) => (s.tiles.find((t) => t.id === b)?.value ?? 0) - (s.tiles.find((t) => t.id === a)?.value ?? 0))[0];
      if (best && s.flags[`cov:seen:${st.id}`] !== s.turn) act({ type: "move", structureId: st.id, tileId: best });
    }
  for (const r of [...s.research].sort((a, b) => a.cost - b.cost)) act({ type: "research", id: r.id });
  for (const t of s.tiles) if (s.ap > 0) act({ type: "scout", tileId: t.id });
  return s;
};

/** Ignores every warning: keeps working in storms, takes the hits, never repairs or cuts a load, burns propellant. */
const reckless: Player = (s0, ctx) => {
  let s = s0;
  const act = (a: OpsAction) => {
    if (s.status === "running" && whyNot(s, a, ctx) === null) s = applyAction(s, a, ctx);
  };
  const card = s.pendingEvent;
  if (card) act({ type: "choose", eventId: card.id, optionId: card.id.startsWith("storm-") ? "work" : card.options.find((o) => !(getScenario(s.missionId).events.find((e) => e.id === card.id)?.options.find((x) => x.id === o.id)?.needsAp))?.id ?? card.options[0]!.id });
  for (const item of [...s.inventory]) {
    const tiles = validTiles(s, { moduleId: item.moduleId }, ctx);
    if (tiles.length) act({ type: "deploy", moduleId: item.moduleId, tileId: tiles[tiles.length - 1]! });
  }
  for (const st of s.structures.filter((x) => x.kind === "campaign")) {
    const tiles = validTiles(s, { move: st.id }, ctx);
    if (tiles.length) act({ type: "move", structureId: st.id, tileId: tiles[(s.turn * 7) % tiles.length]! });
  }
  return s;
};

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const of = <K extends OpsEffect["kind"]>(effects: OpsEffect[], kind: K) => effects.filter((e): e is Extract<OpsEffect, { kind: K }> => e.kind === kind);

describe("turn report", () => {
  const d = autoDesign("moon-base-zero", SPECIALISTS["moon-base-zero"], catalog);
  const ctx: OpsCtx = { design: d, catalog };

  it("every advance reports the turn played, its days, the change in each counter, and daylight first", () => {
    playOut(opsFor(d, 1)!, ctx, heedful, (before, after) => {
      const r = after.lastReport!;
      expect(r.turn).toBe(before.turn);
      expect([r.fromDay, r.toDay]).toEqual([(before.turn - 1) * 3, before.turn * 3]);
      expect(r.delta.energyWh).toBeCloseTo(after.energyWh - before.energyWh, 6);
      expect(r.delta.dataReturnedGb).toBeCloseTo(after.dataReturnedGb - before.dataReturnedGb, 6);
      expect(r.delta.sciencePoints).toBeCloseTo(after.sciencePoints - before.sciencePoints, 6);
      expect(r.effects[0]).toEqual({ kind: "daylight", sunFactor: before.env.sunFactor, earthUp: before.env.earthUp });
    });
  });

  it.each(MISSIONS)("%s: downlink effects add up to the data sent and science effects to the science points earned", (m) => {
    const dm = autoDesign(m, SPECIALISTS[m], catalog);
    const c: OpsCtx = { design: dm, catalog };
    let turns = 0;
    playOut(opsFor(dm, 2)!, c, heedful, (_before, after) => {
      const r = after.lastReport!;
      expect(sum(of(r.effects, "downlink").map((e) => e.gb))).toBeCloseTo(r.delta.dataReturnedGb, 6);
      expect(sum(of(r.effects, "science").map((e) => e.points))).toBeCloseTo(r.delta.sciencePoints, 6);
      for (const e of of(r.effects, "science")) for (const id of e.fromIds) expect(after.structures.some((st) => st.id === id)).toBe(true);
      turns++;
    });
    expect(turns).toBeGreaterThan(5);
  });

  it("a storm names the structures it hit and the ones a berm protected", () => {
    let s = opsFor(d, 3)!;
    s = heedful(s, ctx);
    // a free tile next to at least one structure, so the berm has someone to protect
    s = { ...s, ap: 5 };
    const tileOf = (id: string) => s.tiles.find((t) => t.id === id)!;
    const spot = s.tiles.find(
      (t) => whyNot(s, { type: "build", kind: "berm", tileId: t.id }, ctx) === null && s.structures.some((st) => hexDist(tileOf(st.tileId), t) === 1),
    )!;
    s = applyAction(s, { type: "build", kind: "berm", tileId: spot.id }, ctx);
    s = { ...structuredClone(s), pendingEvent: null, env: { ...s.env, storm: { kind: "FLR", severity: 2, note: "test flare" } }, flags: { ...s.flags, stormChoice: 2 } };
    const before = new Map(s.structures.map((st) => [st.id, st.health]));
    const after = applyAction(s, { type: "advance" }, ctx);
    const storm = of(after.lastReport!.effects, "storm")[0]!;
    expect(storm.severity).toBe(2);
    expect(storm.shieldedIds.length).toBeGreaterThan(0);
    expect(storm.hitIds.length).toBeGreaterThan(0);
    for (const id of storm.hitIds) expect(storm.shieldedIds).not.toContain(id);
    const loss = (id: string) => (before.get(id) ?? 0) - (after.structures.find((st) => st.id === id)?.health ?? 0);
    for (const id of storm.hitIds) expect(loss(id)).toBeGreaterThanOrEqual(30);
    for (const id of storm.shieldedIds) expect(loss(id)).toBeLessThan(5);
  });

  it("an event that hurts a structure shows up as an impact in the next report", () => {
    let s = opsFor(d, 4)!;
    s = heedful(s, ctx);
    s = { ...structuredClone(s), pendingEvent: { id: "micrometeorite", turn: s.turn, title: "Micrometeorite hit", text: "", options: [{ id: "take", label: "", hint: "" }, { id: "shield", label: "", hint: "" }] } };
    s = applyAction(s, { type: "choose", eventId: "micrometeorite", optionId: "take" }, ctx);
    const after = applyAction(s, { type: "advance" }, ctx);
    const impact = of(after.lastReport!.effects, "impact")[0]!;
    expect(impact.hitIds).toHaveLength(1);
    expect(impact.damage).toBe(30);
    expect(after.structures.find((st) => st.id === impact.hitIds[0])?.tileId).toBe(impact.tileId);
  });
});

describe("projectTurn", () => {
  it.each(MISSIONS)("%s: previews the same deltas and effects the turn then has, without changing the state", (m) => {
    const d = autoDesign(m, SPECIALISTS[m], catalog);
    const ctx: OpsCtx = { design: d, catalog };
    let checked = 0;
    playOut(opsFor(d, 5)!, ctx, heedful, (before, after) => {
      const copy = structuredClone(before);
      const p = projectTurn(before, ctx);
      expect(before).toEqual(copy);
      expect(p.delta).toEqual(after.lastReport!.delta);
      expect(p.effects).toEqual(after.lastReport!.effects);
      checked++;
    });
    expect(checked).toBeGreaterThan(5);
  });

  it("returns an empty report once operations are over", () => {
    const d = autoDesign("orbital-lab", SPECIALISTS["orbital-lab"], catalog);
    const ctx: OpsCtx = { design: d, catalog };
    const end = playOut(opsFor(d, 6)!, ctx, heedful);
    expect(end.status).toBe("ended");
    expect(projectTurn(end, ctx).effects).toEqual([]);
  });
});

describe("warnings come before every loss", () => {
  // designs and players that lose: no battery or heater on the Moon, a long dark at Malapert, a reckless crew
  const moonBare: MissionDesign = { ...autoDesign("moon-base-zero", SPECIALISTS["moon-base-zero"], catalog), destinationId: "mb-malapert", moduleIds: ["mb-blue-ghost", "mb-dte-xband", "mb-dust-plasma"], blueprintIds: [], rideshareIds: [], secondaryObjectiveIds: [] };
  const moonGhost: MissionDesign = { ...moonBare, moduleIds: ["mb-blue-ghost", "mb-li-ion", "mb-rhu", "mb-dte-xband", "mb-regolith-science"] };
  const runs: { name: string; d: MissionDesign; player: Player }[] = [
    { name: "Moon, no battery", d: moonBare, player: reckless },
    { name: "Moon, Blue Ghost at Malapert", d: moonGhost, player: reckless },
    { name: "Moon, recommended design, reckless crew", d: autoDesign("moon-base-zero", SPECIALISTS["moon-base-zero"], catalog), player: reckless },
    { name: "Earth, recommended design, reckless crew", d: autoDesign("earth-guardian", SPECIALISTS["earth-guardian"], catalog), player: reckless },
    { name: "Orbital Lab, recommended design, reckless crew", d: autoDesign("orbital-lab", SPECIALISTS["orbital-lab"], catalog), player: reckless },
  ];
  const losses: { reason: string; warned: boolean; earlier: boolean }[] = [];
  for (const r of runs)
    for (let seed = 1; seed <= 6; seed++) {
      const ctx: OpsCtx = { design: r.d, catalog };
      const s0 = opsFor(r.d, seed);
      if (!s0) continue;
      let last: OpsState | undefined;
      playOut(s0, ctx, r.player, (before, after) => {
        if (after.status === "lost") {
          const now = projectTurn(before, ctx).warnings;
          const earlier = [...(last?.lastReport?.warnings ?? []), ...now].some((w) => w.severity === "danger" || w.severity === "warn");
          losses.push({ reason: after.lostReason ?? "", warned: now.some((w) => w.severity === "danger"), earlier });
        }
        last = after;
      });
    }

  it("the runs above do lose, so the check is not empty", () => {
    expect(losses.length).toBeGreaterThanOrEqual(5);
  });

  it("the turn before every loss shows a danger warning with a fix", () => {
    for (const l of losses) expect(l.warned, l.reason).toBe(true);
  });

  it("explains each loss as a chain of causes", () => {
    for (const l of losses) expect(l.reason).toMatch(/batteries ran empty, and the .+ froze|broke down: .+ took \d+/);
  });
});

describe("the recommended design wins when the player follows the main quest and the warnings", () => {
  it.each(MISSIONS)("%s: never lost, every main goal done, over 8 seeds", (m) => {
    const d = autoDesign(m, SPECIALISTS[m], catalog);
    const ctx: OpsCtx = { design: d, catalog };
    for (let seed = 1; seed <= 8; seed++) {
      const end = playOut(opsFor(d, seed)!, ctx, heedful);
      expect(end.status, `seed ${seed}: ${end.lostReason ?? ""}`).toBe("ended");
      expect(end.goals.filter((g) => g.kind === "main" && !g.done).map((g) => g.id), `seed ${seed}`).toEqual([]);
    }
  });
});

describe("actions", () => {
  it("apCost matches the action points every accepted action takes", () => {
    const d = autoDesign("moon-base-zero", SPECIALISTS["moon-base-zero"], catalog);
    const ctx: OpsCtx = { design: d, catalog };
    let checked = 0;
    let s = opsFor(d, 7)!;
    const spy: Player = (cur, c) => {
      const out = heedful(cur, c);
      // replay the same actions one by one and compare the cost with the points spent
      let step = cur;
      for (const a of out.actions.slice(cur.actions.length)) {
        const next = applyAction(step, a, c);
        if (a.type !== "choose" && a.type !== "advance") {
          expect(step.ap - next.ap, a.type).toBe(apCost(step, a));
          checked++;
        }
        step = next;
      }
      return out;
    };
    s = playOut(s, ctx, spy);
    expect(checked).toBeGreaterThanOrEqual(8);
    expect(apCost(s, { type: "toggle", structureId: "x" })).toBe(0);
    expect(apCost(s, { type: "build", kind: "greenhouse", tileId: "x" })).toBe(2);
  });

  it("any working rover can scout any tile", () => {
    const d: MissionDesign = { ...autoDesign("moon-base-zero", SPECIALISTS["moon-base-zero"], catalog), moduleIds: ["mb-blue-moon", "mb-rfc", "mb-li-ion", "mb-rhu", "mb-dte-xband", "mb-regolith-science", "mb-rover"] };
    const ctx: OpsCtx = { design: d, catalog };
    let s = opsFor(d, 8)!;
    if (s.pendingEvent) s = { ...s, pendingEvent: null };
    const home = hubTile(s);
    const roverTile = validTiles(s, { moduleId: "mb-rover" }, ctx).find((id) => hexDist(s.tiles.find((t) => t.id === id)!, home) === 1)!;
    expect(whyNot(s, { type: "scout", tileId: s.tiles.find((t) => !t.scouted)!.id }, ctx)).toBe("Deploy a rover first.");
    s = applyAction(s, { type: "deploy", moduleId: "mb-rover", tileId: roverTile }, ctx);
    const rover = s.tiles.find((t) => t.id === roverTile)!;
    const far = s.tiles.find((t) => !t.scouted && hexDist(t, rover) >= 3)!;
    expect(whyNot(s, { type: "scout", tileId: far.id }, ctx)).toBeNull();
  });
});
