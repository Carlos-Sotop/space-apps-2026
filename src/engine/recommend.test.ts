import { describe, expect, it } from "vitest";
import { catalog, coalition } from "./fixtures";
import { autoDesign, defaultDesign, recommendStep } from "./index";
import type { DesignStep } from "./types";

describe("recommend (C0: follows today's default design)", () => {
  it("autoDesign is the default design for every mission", () => {
    for (const m of catalog.missions) expect(autoDesign(m.id, coalition, catalog)).toEqual(defaultDesign(m.id, coalition, catalog));
  });

  it("recommendStep patches only the fields its step decides", () => {
    const fields: Record<DesignStep, string[]> = {
      charter: ["values"],
      objectives: ["secondaryObjectiveIds"],
      launch: ["destinationId", "launchVehicleId"],
      build: ["moduleIds"],
      opentech: ["blueprintIds"],
      rideshare: ["rideshareIds"],
    };
    for (const m of catalog.missions) {
      const design = defaultDesign(m.id, coalition, catalog);
      for (const [step, keys] of Object.entries(fields) as [DesignStep, string[]][]) {
        const patch = recommendStep(step, design, catalog);
        expect(Object.keys(patch).sort()).toEqual([...keys].sort());
        expect({ ...design, ...patch }).toEqual(design);
      }
    }
  });
});
