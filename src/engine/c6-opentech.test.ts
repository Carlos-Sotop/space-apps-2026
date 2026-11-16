// C6: an open design costs integration, works only on a module it attaches to, and owes a design back.
import { describe, expect, it } from "vitest";
import { catalog as real } from "@/data";
import { blueprintFit, computeResources, defaultDesign, effectiveModifiers, reciprocityDue, validateDesign } from "@/engine";
import type { Blueprint, Catalog } from "./types";
import { catalog as base, orbitalDesign } from "./fixtures";

const radioStack: Blueprint = {
  id: "radio-stack",
  name: "Radio stack",
  authorId: "linker",
  parentId: null,
  category: "computer",
  hostIds: ["radio"],
  modifiers: [{ stat: "downlinkRate", op: "mul", value: 1.5 }],
  integration: { massKg: 3, powerW: 4, costMUsd: 2 },
  summary: "",
  contentHash: "",
  adoptions: 0,
};
const catalog: Catalog = { ...base, blueprints: [...base.blueprints, radioStack] };
const noRadio = orbitalDesign({ moduleIds: ["bus", "solar", "battery", "relay", "camera"] });

describe("open tech fit", () => {
  it("fits when the spacecraft flies a module it attaches to", () => {
    expect(blueprintFit(radioStack, orbitalDesign(), catalog)).toMatchObject({ ok: true, hostIds: ["radio"] });
  });

  it("without hostIds it attaches to any module of its category", () => {
    const light = catalog.blueprints.find((b) => b.id === "light-solar")!;
    expect(blueprintFit(light, orbitalDesign(), catalog).hostIds).toEqual(["solar"]);
  });

  it("with nothing to attach to it changes nothing, costs nothing and warns", () => {
    const adopted = { ...noRadio, blueprintIds: ["radio-stack"] };
    expect(blueprintFit(radioStack, adopted, catalog)).toMatchObject({ ok: false, hostIds: [] });
    expect(effectiveModifiers(adopted, catalog)).toEqual(effectiveModifiers(noRadio, catalog));
    expect(computeResources(adopted, catalog)).toEqual(computeResources(noRadio, catalog));
    const issue = validateDesign(adopted, catalog).find((i) => i.id === "opentech-unfit-radio-stack");
    expect(issue?.severity).toBe("warning");
    expect(issue?.fix).toContain("Add radio in Build");
  });
});

describe("open tech integration", () => {
  it("adds its mass, power and cost to the gauges, next to the gain", () => {
    const before = computeResources(orbitalDesign(), catalog);
    const after = computeResources(orbitalDesign({ blueprintIds: ["radio-stack"] }), catalog);
    expect(after.mass.used - before.mass.used).toBeCloseTo(3);
    expect(after.power.used - before.power.used).toBeCloseTo(4);
    expect(after.budget.used - before.budget.used).toBeCloseTo(2);
    expect(after.data.capacity).toBeCloseTo(before.data.capacity * 1.5);
    expect(after.mass.usedBy.map((l) => l.label)).toContain("Integrating Radio stack (open tech)");
  });
});

describe("open tech reciprocity", () => {
  it("is due once any open design is adopted", () => {
    expect(reciprocityDue(orbitalDesign())).toBe(false);
    expect(reciprocityDue(orbitalDesign({ blueprintIds: ["light-solar"] }))).toBe(true);
  });
});

describe("open tech in the shipped catalog", () => {
  const coalition = { leadId: "nasa", partnerIds: ["esa", "jaxa", "csa"] as [string, string, string] };

  it("array designs never attach to the ISS power allocation", () => {
    const d = defaultDesign("orbital-lab", coalition, real);
    for (const b of real.blueprints.filter((x) => x.category === "power")) expect(blueprintFit(b, d, real).optionIds).toEqual([]);
  });

  it("NASA's DTN stack needs a flight computer on Earth Guardian", () => {
    const start = defaultDesign("earth-guardian", coalition, real);
    const d = { ...start, moduleIds: start.moduleIds.filter((id) => real.modules.find((m) => m.id === id)?.category !== "computer") };
    const dtn = real.blueprints.find((b) => b.id === "bp-nasa-dtn-stack")!;
    const fit = blueprintFit(dtn, d, real);
    expect(fit.ok).toBe(false);
    expect(fit.optionIds).toContain("eg-obc-basic");
  });

  it("every mission offers at least one open design it can fit", () => {
    for (const m of real.missions) {
      const d = defaultDesign(m.id, coalition, real);
      expect(real.blueprints.some((b) => blueprintFit(b, d, real).optionIds.length > 0), m.id).toBe(true);
    }
  });
});
