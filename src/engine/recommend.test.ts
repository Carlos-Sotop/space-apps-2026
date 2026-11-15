// The recommended design (Quick play and the "Use recommended" buttons), on the real catalog.
import { describe, expect, it } from "vitest";
import { catalog } from "@/data";
import { autoDesign, computeResources, councilReview, defaultDesign, forecast, recommendStep, validateDesign } from "./index";
import { DESIGN_STEPS, RECOMMENDED_MARGIN, STEP_FIELDS } from "./recommend";
import type { Coalition, MissionDesign, MissionId } from "./types";

declare const performance: { now(): number };

const MISSIONS: MissionId[] = ["orbital-lab", "earth-guardian", "moon-base-zero"];
// NASA leads with the "Mission specialists" partners the Coalition screen recommends for each mission.
const SPECIALISTS: Record<MissionId, Coalition> = {
  "orbital-lab": { leadId: "nasa", partnerIds: ["esa", "jaxa", "csa"] },
  "earth-guardian": { leadId: "nasa", partnerIds: ["esa", "aee", "csa"] },
  "moon-base-zero": { leadId: "nasa", partnerIds: ["jaxa", "isro", "blue-origin"] },
};

const withinMargin = (d: MissionDesign) => {
  const rep = computeResources(d, catalog);
  return (["mass", "power", "budget"] as const).every((k) => rep[k].used <= (1 - RECOMMENDED_MARGIN) * rep[k].capacity + 1e-9);
};

describe("autoDesign: the recommended design", () => {
  it.each(MISSIONS)("%s is clean, keeps margin, and every partner approves it", (m) => {
    const d = autoDesign(m, SPECIALISTS[m], catalog);
    expect(validateDesign(d, catalog)).toEqual([]);
    expect(withinMargin(d)).toBe(true);
    expect(councilReview(d, catalog).map((r) => r.verdict)).toEqual(["approve", "approve", "approve"]);
  });

  it.each(MISSIONS)("%s wins at least 70% of the risk assessment and scores above the cheapest starting design", (m) => {
    const d = autoDesign(m, SPECIALISTS[m], catalog);
    const f = forecast(d, catalog, 200);
    expect(f.successProbability).toBeGreaterThanOrEqual(0.7);
    expect(f.expectedScore).toBeGreaterThan(forecast(defaultDesign(m, SPECIALISTS[m], catalog), catalog, 200).expectedScore);
  });

  it.each(MISSIONS)("%s fills every step: a charter, objectives the parts meet, and a rideshare whenever one fits", (m) => {
    const d = autoDesign(m, SPECIALISTS[m], catalog);
    expect(d.values.science + d.values.safety + d.values.cost).toBeCloseTo(1, 9);
    expect(d.secondaryObjectiveIds.length).toBeGreaterThanOrEqual(1);
    const mission = catalog.missions.find((x) => x.id === m)!;
    const fits = mission.rideshareOfferIds.filter((id) => !d.rideshareIds.includes(id)).some((id) => {
      const more = { ...d, rideshareIds: [...d.rideshareIds, id] };
      return validateDesign(more, catalog).length === 0 && withinMargin(more);
    });
    expect(d.rideshareIds.length > 0 || !fits).toBe(true);
  });

  it("answers from the cache after the first call and returns a fresh copy", () => {
    const first = autoDesign("earth-guardian", SPECIALISTS["earth-guardian"], catalog);
    first.moduleIds.push("eg-lsar");
    first.coalition.partnerIds[0] = "nasa";
    const t0 = performance.now();
    const again = autoDesign("earth-guardian", SPECIALISTS["earth-guardian"], catalog);
    expect(performance.now() - t0).toBeLessThan(5);
    expect(again.moduleIds).not.toContain("eg-lsar");
    expect(again.coalition.partnerIds[0]).toBe("esa");
  });

  it("is the same for a rebuilt catalog object with the same content", () => {
    const rebuilt = { ...catalog };
    expect(autoDesign("moon-base-zero", SPECIALISTS["moon-base-zero"], rebuilt)).toEqual(autoDesign("moon-base-zero", SPECIALISTS["moon-base-zero"], catalog));
  });
});

describe("recommendStep", () => {
  it("patches only the fields its step decides", () => {
    for (const m of MISSIONS) {
      const design = defaultDesign(m, SPECIALISTS[m], catalog);
      for (const step of DESIGN_STEPS) expect(Object.keys(recommendStep(step, design, catalog)).sort()).toEqual([...STEP_FIELDS[step]].sort());
    }
  });

  it.each(MISSIONS)("walking every step of %s in order from the starting design ends at autoDesign", (m) => {
    let d = defaultDesign(m, SPECIALISTS[m], catalog);
    for (const step of DESIGN_STEPS) d = { ...d, ...recommendStep(step, d, catalog) };
    expect(d).toEqual(autoDesign(m, SPECIALISTS[m], catalog));
  });

  it("builds on the rocket and destination the player picked", () => {
    const auto = autoDesign("earth-guardian", SPECIALISTS["earth-guardian"], catalog);
    let d: MissionDesign = { ...auto, destinationId: "eg-sso-dawn-dusk", launchVehicleId: "pslv" };
    for (const step of ["build", "opentech", "rideshare"] as const) d = { ...d, ...recommendStep(step, d, catalog) };
    expect(d.launchVehicleId).toBe("pslv");
    expect(validateDesign(d, catalog)).toEqual([]);
    expect(forecast(d, catalog, 100).successProbability).toBeGreaterThanOrEqual(0.7);
  });

  it("meets the objectives the player picked", () => {
    let d: MissionDesign = { ...autoDesign("orbital-lab", SPECIALISTS["orbital-lab"], catalog), secondaryObjectiveIds: ["ol-manufacturing", "ol-plants"] };
    for (const step of ["launch", "build", "opentech", "rideshare"] as const) d = { ...d, ...recommendStep(step, d, catalog) };
    expect(d.secondaryObjectiveIds).toEqual(["ol-manufacturing", "ol-plants"]);
    expect(d.moduleIds).toEqual(expect.arrayContaining(["ol-fiber", "ol-plant-chamber"]));
    expect(validateDesign(d, catalog)).toEqual([]);
  });

  it("never leaves a blocker when the player's rocket cannot carry their objectives", () => {
    // Electron cannot lift a radar, so the flood objective cannot be met: the advice still flies
    let d: MissionDesign = { ...autoDesign("earth-guardian", SPECIALISTS["earth-guardian"], catalog), destinationId: "eg-sso-1030", launchVehicleId: "electron", secondaryObjectiveIds: ["eg-flood"] };
    for (const step of ["build", "opentech", "rideshare"] as const) d = { ...d, ...recommendStep(step, d, catalog) };
    expect(validateDesign(d, catalog).filter((i) => i.severity === "blocker")).toEqual([]);
    expect(forecast(d, catalog, 100).successProbability).toBeGreaterThan(0.5);
  });
});
