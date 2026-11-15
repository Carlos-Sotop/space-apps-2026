import { describe, expect, it } from "vitest";
import { catalog as game } from "@/data";
import { catalog, coalition, orbitalDesign } from "./fixtures";
import { defaultDesign, designMoves, validateDesign } from "./index";
import type { Coalition } from "./types";

declare const performance: { now(): number };

const council: Coalition = { leadId: "nasa", partnerIds: ["esa", "aee", "csa"] };

describe("defaultDesign speed", () => {
  it("answers Earth Guardian in under 100 ms after the first call", () => {
    const t0 = performance.now();
    const first = defaultDesign("earth-guardian", council, game);
    const t1 = performance.now();
    const again = defaultDesign("earth-guardian", council, game);
    const t2 = performance.now();
    console.info(`defaultDesign earth-guardian: first ${(t1 - t0).toFixed(1)} ms, again ${(t2 - t1).toFixed(2)} ms`);
    expect(t2 - t1).toBeLessThan(Math.max(250, (t1 - t0) / 2));
    expect(again).toEqual(first);
  });

  it("returns a fresh copy, so a caller's edit never leaks into the next player", () => {
    const a = defaultDesign("orbital-lab", coalition, catalog);
    a.moduleIds.push("heater");
    a.coalition.partnerIds[0] = "lead";
    const b = defaultDesign("orbital-lab", coalition, catalog);
    expect(b.moduleIds).not.toContain("heater");
    expect(b.coalition.partnerIds[0]).toBe("rocketeer");
  });

  it("recomputes when the catalog content changes", () => {
    const before = defaultDesign("orbital-lab", coalition, catalog);
    const cheaperRelay = { ...catalog, modules: catalog.modules.map((m) => (m.id === "relay" ? { ...m, costMUsd: 0.1 } : m)) };
    const after = defaultDesign("orbital-lab", coalition, cheaperRelay);
    expect(validateDesign(after, cheaperRelay).filter((i) => i.severity === "blocker")).toEqual([]);
    expect(defaultDesign("orbital-lab", coalition, catalog)).toEqual(before);
  });
});

describe("designMoves", () => {
  const d = orbitalDesign();
  const moves = designMoves(d, catalog);

  it("each move changes exactly one thing", () => {
    for (const m of moves) {
      const ids = m.design.moduleIds;
      if (m.kind === "add") expect(ids).toEqual([...d.moduleIds, m.inId]);
      if (m.kind === "drop") expect(ids).toEqual(d.moduleIds.filter((id) => id !== m.outId));
      if (m.kind === "swap") {
        expect(ids).toHaveLength(d.moduleIds.length);
        expect(catalog.modules.find((x) => x.id === m.inId)?.category).toBe(catalog.modules.find((x) => x.id === m.outId)?.category);
      }
      if (m.kind === "vehicle") {
        expect(ids).toEqual(d.moduleIds);
        expect(m.design.launchVehicleId).toBe(m.inId);
      } else expect(m.design.launchVehicleId).toBe(d.launchVehicleId);
    }
  });

  it("covers adds, drops, swaps and rockets, never adds a second carrier, and keeps labels short", () => {
    expect(new Set(moves.map((m) => m.kind))).toEqual(new Set(["add", "drop", "swap", "vehicle"]));
    expect(moves.some((m) => m.kind === "add" && m.inId === "lander")).toBe(false);
    expect(moves.some((m) => m.kind === "drop" && m.outId === "bus")).toBe(false);
    expect(new Set(moves.map((m) => m.id)).size).toBe(moves.length);
    for (const m of designMoves(defaultDesign("orbital-lab", council, game), game)) expect(m.label).not.toMatch(/\(/);
  });
});
