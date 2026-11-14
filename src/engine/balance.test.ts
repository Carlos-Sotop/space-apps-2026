// Balance rules and the named designs of each mission. The first block runs on the small test
// catalog; the second runs the real catalog (src/data) so a data change that breaks balance shows up.
import { describe, expect, it } from "vitest";
import { catalog as testCatalog, moonDesign, orbitalDesign } from "./fixtures";
import { catalog } from "../data";
import { computeResources, councilValues, defaultDesign, forecast, simulateFlight, validateDesign } from "./index";
import { MAX_ONBOARD_CUT } from "./resources";
import { successProbability } from "./score";
import type { Catalog, Coalition, FlightResult, MissionDesign, MissionId, Module } from "./types";

const withModule = (cat: Catalog, id: string, patch: Partial<Module>): Catalog => ({
  ...cat,
  modules: cat.modules.map((m) => (m.id === id ? { ...m, ...patch } : m)),
});
const seeds = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

describe("rule: the carrier rolls its reliability once, at arrival", () => {
  const cat = withModule(testCatalog, "bus", { reliability: 0.5 });
  const flights = seeds(200).map((s) => simulateFlight(orbitalDesign(), cat, s));
  it("never fails again during operations", () => {
    expect(flights.some((f) => f.events.some((e) => e.title === "bus failed"))).toBe(false);
  });
  it("decides arrival instead", () => {
    const lost = flights.filter((f) => f.lostAt === "arrival").length;
    expect(lost).toBeGreaterThan(70);
    expect(lost).toBeLessThan(130);
  });
  it("is left out of the module average in the safety score", () => {
    // small rocket 0.95 x bus 0.5 (arrival) x average of the other modules (all 1); counting the bus again would give 0.4275
    expect(successProbability(orbitalDesign(), cat)).toBeCloseTo(0.95 * 0.5, 4);
  });
});

describe("rule: operations stop at the design life", () => {
  // the test lander lasts 14 days; the fixture Moon mission runs 60 days of operations
  const cat = withModule(withModule(testCatalog, "lander", { lifetimeDays: 14 }), "heater", { lifetimeDays: 90 });
  const short = moonDesign({ moduleIds: ["lander", "solar", "battery-big", "radio", "camera"] });
  const heated = moonDesign({ moduleIds: ["lander", "solar", "battery-big", "radio", "camera", "heater"] });
  it("warns before flight that the design will go quiet", () => {
    const issue = validateDesign(short, cat).find((i) => i.id === "lifetime-under");
    expect(issue?.severity).toBe("warning");
    expect(issue?.text).toContain("go quiet after 14 days");
  });
  it("ends operations on that day and misses every objective", () => {
    const reached = seeds(40)
      .map((s) => simulateFlight(short, cat, s))
      .filter((f) => !f.lostAt);
    expect(reached.length).toBeGreaterThan(0);
    for (const f of reached) {
      expect(f.success).toBe(false);
      expect(f.objectivesMet).toEqual([]);
      expect(f.events.some((e) => e.title === "Design life reached")).toBe(true);
      expect(f.events.some((e) => e.title === "Mission ended early")).toBe(true);
      expect(f.lessons.some((l) => l.includes("built to last 14 days"))).toBe(true);
    }
  });
  it("keeps going when a thermal module covers the mission", () => {
    expect(computeResources(heated, cat).lifetime.capacity).toBe(90);
    const flights = seeds(40).map((s) => simulateFlight(heated, cat, s));
    expect(flights.some((f) => f.events.some((e) => e.title === "Design life reached"))).toBe(false);
    expect(flights.some((f) => f.success)).toBe(true);
  });
});

describe("rule: on-board screening shrinks the downlink, not the science", () => {
  const edge = (cut: number): Catalog => ({
    ...testCatalog,
    modules: [
      ...testCatalog.modules,
      { ...testCatalog.modules[0]!, id: "edge-ai", name: "edge-ai", category: "computer", dataGbPerDay: -cut, massKg: 1, powerW: 1, payloadCapacityKg: undefined, reliability: 1 },
    ],
  });
  const ids = ["bus", "solar", "battery", "relay", "camera"];
  it("caps the cut at the cloudy share of the data", () => {
    // camera makes 5 Gb/day; a 10 Gb/day screener can only drop 67% of it
    const r = computeResources(orbitalDesign({ moduleIds: [...ids, "edge-ai"] }), edge(10));
    expect(r.data.used).toBeCloseTo(5 * (1 - MAX_ONBOARD_CUT));
    expect(r.data.usedBy.find((l) => l.label === "edge-ai")?.amount).toBeCloseTo(-5 * MAX_ONBOARD_CUT);
  });
  it("returns the same science as without screening when the link keeps up", () => {
    const fly = (moduleIds: string[]) => seeds(30).map((s) => simulateFlight(orbitalDesign({ moduleIds }), edge(3), s)).filter((f) => f.success);
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    const plain = fly(ids);
    const screened = fly([...ids, "edge-ai"]);
    // 3 of the camera's 5 Gb/day are screened out: less data comes down, the science stays
    expect(mean(screened.map((f) => f.dataReturnedGb))).toBeLessThan(mean(plain.map((f) => f.dataReturnedGb)) * 0.5);
    expect(mean(screened.map((f) => f.score.science))).toBeGreaterThan(mean(plain.map((f) => f.score.science)) - 2);
  });
});

/* ------------------------------------------------------------------ */
/* The real catalog                                                    */
/* ------------------------------------------------------------------ */

const EQUAL = { science: 1 / 3, safety: 1 / 3, cost: 1 / 3 };
// NASA leads with the "Mission specialists" partners the Coalition screen recommends for each mission.
const COALITIONS: Record<MissionId, Coalition> = {
  "orbital-lab": { leadId: "nasa", partnerIds: ["esa", "jaxa", "csa"] },
  "earth-guardian": { leadId: "nasa", partnerIds: ["esa", "aee", "csa"] },
  "moon-base-zero": { leadId: "nasa", partnerIds: ["jaxa", "isro", "blue-origin"] },
};
const design = (missionId: MissionId, o: Partial<MissionDesign>): MissionDesign => ({
  missionId,
  coalition: COALITIONS[missionId],
  values: councilValues(COALITIONS[missionId], EQUAL, catalog).values,
  secondaryObjectiveIds: [],
  destinationId: "",
  launchVehicleId: "",
  moduleIds: [],
  blueprintIds: [],
  rideshareIds: [],
  ...o,
});
const start = (missionId: MissionId): MissionDesign => ({
  ...defaultDesign(missionId, COALITIONS[missionId], catalog),
  values: councilValues(COALITIONS[missionId], EQUAL, catalog).values,
});

const ol = (moduleIds: string[], o: Partial<MissionDesign> = {}) =>
  design("orbital-lab", { destinationId: "ol-iss", launchVehicleId: "falcon-9", moduleIds, ...o });
const eg = (destinationId: string, launchVehicleId: string, moduleIds: string[], o: Partial<MissionDesign> = {}) =>
  design("earth-guardian", { destinationId, launchVehicleId, moduleIds, ...o });
const mb = (destinationId: string, launchVehicleId: string, moduleIds: string[], o: Partial<MissionDesign> = {}) =>
  design("moon-base-zero", { destinationId, launchVehicleId, moduleIds, ...o });

/** Designs that should succeed in most of 200 flights. */
const GOOD: { name: string; design: () => MissionDesign }[] = [
  { name: "Orbital Lab: crew health on Cygnus", design: () => ol(["ol-cygnus", "ol-biomonitor", "ol-dosimetry", "ol-plant-chamber", "ol-protein-crystal", "ol-iss-power", "ol-iss-link"], { secondaryObjectiveIds: ["ol-health", "ol-plants"] }) },
  { name: "Orbital Lab: fire and fiber on Dragon", design: () => ol(["ol-cargo-dragon", "ol-combustion", "ol-fiber", "ol-biomonitor", "ol-protein-crystal", "ol-iss-power", "ol-iss-link"], { secondaryObjectiveIds: ["ol-fire-safety", "ol-manufacturing"] }) },
  { name: "Orbital Lab: cold atoms and tissue on HTV-X (H3)", design: () => ol(["ol-htv-x", "ol-cold-atom", "ol-bioprinter", "ol-plant-chamber", "ol-dosimetry", "ol-iss-power", "ol-iss-link"], { launchVehicleId: "h3", secondaryObjectiveIds: ["ol-plants", "ol-health"] }) },
  { name: "Earth Guardian: fire watch on PSLV", design: () => eg("eg-sso-dawn-dusk", "pslv", ["eg-bus-medium", "eg-thermal-ir", "eg-array-small", "eg-batt-small", "eg-kaband", "eg-ground-network", "eg-adcs-basic", "eg-obc-basic"], { secondaryObjectiveIds: ["eg-wildfire"] }) },
  { name: "Earth Guardian: crops and fires at 10:30", design: () => eg("eg-sso-1030", "falcon-9", ["eg-bus-medium", "eg-msi", "eg-thermal-ir", "eg-array-large", "eg-batt-large", "eg-kaband", "eg-ground-network", "eg-adcs-adv", "eg-obc-edge-ai"], { secondaryObjectiveIds: ["eg-crops", "eg-wildfire"] }) },
  { name: "Earth Guardian: flood radar with Ka-band", design: () => eg("eg-sso-dawn-dusk", "vega-c", ["eg-bus-medium", "eg-xsar", "eg-ais", "eg-array-large", "eg-batt-small", "eg-kaband", "eg-ground-network", "eg-adcs-basic", "eg-obc-edge-ai"], { secondaryObjectiveIds: ["eg-flood", "eg-ships"] }) },
  { name: "Earth Guardian: L-band SAR with a laser link", design: () => eg("eg-sso-dawn-dusk", "falcon-9", ["eg-bus-medium", "eg-lsar", "eg-array-large", "eg-batt-large", "eg-optical", "eg-ground-network", "eg-adcs-adv", "eg-obc-edge-ai"], { secondaryObjectiveIds: ["eg-flood", "eg-crops"] }) },
  { name: "Moon Base Zero: Blue Ghost at Malapert", design: () => mb("mb-malapert", "falcon-9", ["mb-blue-ghost", "mb-li-ion", "mb-dte-xband", "mb-rhu", "mb-regolith-science", "mb-dust-plasma", "mb-dtn-node"], { secondaryObjectiveIds: ["mb-night", "mb-scout"] }) },
  { name: "Moon Base Zero: Blue Ghost on the ridge with a relay", design: () => mb("mb-connecting-ridge", "falcon-9", ["mb-blue-ghost", "mb-li-ion", "mb-relay", "mb-rhu", "mb-ice-drill", "mb-dust-plasma", "mb-pq-link"], { secondaryObjectiveIds: ["mb-ice", "mb-quantum-link"] }) },
  { name: "Moon Base Zero: Blue Moon base on an expendable Falcon Heavy", design: () => mb("mb-connecting-ridge", "falcon-heavy-expendable", ["mb-blue-moon", "mb-vsat", "mb-rfc", "mb-rhu", "mb-relay", "mb-dtn-node", "mb-mesh", "mb-ice-drill", "mb-rover", "mb-regolith-science"], { secondaryObjectiveIds: ["mb-ice", "mb-night"] }) },
];

/** Designs that should fail, each for a reason the player can see. */
const BAD: { name: string; design: () => MissionDesign; blocker?: string; warning?: string; event?: string }[] = [
  { name: "Orbital Lab: flame chamber with no station power", design: () => ol(["ol-cygnus", "ol-combustion", "ol-iss-link"]), blocker: "missing-category-power" },
  { name: "Orbital Lab: experiments with no data link", design: () => ol(["ol-cygnus", "ol-plant-chamber", "ol-iss-power"]), blocker: "missing-category-comms" },
  { name: "Earth Guardian: L-band SAR on an X-band radio", design: () => eg("eg-sso-dawn-dusk", "falcon-9", ["eg-bus-medium", "eg-lsar", "eg-array-large", "eg-batt-small", "eg-xband", "eg-ground-network", "eg-adcs-basic"], { secondaryObjectiveIds: ["eg-flood"] }), warning: "data-over", event: "Mission fell short" },
  { name: "Earth Guardian: imager with no ground network", design: () => eg("eg-sso-1030", "falcon-9", ["eg-bus-medium", "eg-msi", "eg-array-large", "eg-batt-large", "eg-xband", "eg-adcs-basic"]), warning: "comms-under", event: "Mission fell short" },
  { name: "Earth Guardian: fire imager on Firefly Alpha", design: () => eg("eg-sso-dawn-dusk", "firefly-alpha", ["eg-bus-small", "eg-thermal-ir", "eg-array-small", "eg-xband", "eg-ground-network"]), event: "Launch failure" },
  { name: "Moon Base Zero: Blue Ghost with no night heat", design: () => mb("mb-malapert", "falcon-9", ["mb-blue-ghost", "mb-li-ion", "mb-dte-xband", "mb-regolith-science"]), warning: "lifetime-under", event: "Design life reached" },
  { name: "Moon Base Zero: Nova-C at de Gerlache, no heat, direct link only", design: () => mb("mb-de-gerlache-rim", "falcon-9", ["mb-nova-c", "mb-li-ion", "mb-dte-xband", "mb-regolith-science"]), warning: "lifetime-under", event: "Design life reached" },
  { name: "Moon Base Zero: Griffin on a Falcon 9", design: () => mb("mb-connecting-ridge", "falcon-9", ["mb-griffin", "mb-li-ion", "mb-dte-xband", "mb-rhu", "mb-ice-drill"]), blocker: "mass-over" },
];

const MISSIONS: MissionId[] = ["orbital-lab", "earth-guardian", "moon-base-zero"];

// Each design flies its 200 seeds once; the tests below share the results.
const flown = new Map<string, FlightResult[]>();
const fly200 = (key: string, d: MissionDesign): FlightResult[] => {
  if (!flown.has(key)) flown.set(key, seeds(200).map((s) => simulateFlight(d, catalog, s)));
  return flown.get(key)!;
};
const share = (fs: FlightResult[]) => fs.filter((f) => f.success).length / fs.length;
const meanScore = (fs: FlightResult[]) => fs.reduce((s, f) => s + f.score.total, 0) / fs.length;

describe("balance on the real catalog", () => {
  it("every mission has at least 3 good and 2 bad named designs", () => {
    for (const m of MISSIONS) {
      const tag = catalog.missions.find((x) => x.id === m)!.name;
      expect(GOOD.filter((g) => g.name.startsWith(tag)).length, m).toBeGreaterThanOrEqual(3);
      expect(BAD.filter((b) => b.name.startsWith(tag)).length, m).toBeGreaterThanOrEqual(2);
    }
  });

  it.each(MISSIONS)("the starting design of %s flies without blockers and usually succeeds", (m) => {
    const d = start(m);
    expect(validateDesign(d, catalog).filter((i) => i.severity === "blocker")).toEqual([]);
    expect(share(fly200(`start:${m}`, d))).toBeGreaterThanOrEqual(0.65);
  });

  it.each(GOOD.map((g) => [g.name, g] as const))("good: %s succeeds in most flights", (name, g) => {
    const d = g.design();
    expect(validateDesign(d, catalog).filter((i) => i.severity === "blocker")).toEqual([]);
    expect(share(fly200(name, d))).toBeGreaterThanOrEqual(0.6);
  });

  it.each(BAD.map((b) => [b.name, b] as const))("bad: %s fails for a visible reason", (name, b) => {
    const d = b.design();
    const issues = validateDesign(d, catalog);
    if (b.blocker) expect(issues.find((i) => i.id === b.blocker)?.severity).toBe("blocker");
    if (b.warning) expect(issues.find((i) => i.id === b.warning)?.severity).toBe("warning");
    const flights = fly200(name, d);
    expect(share(flights)).toBeLessThanOrEqual(0.4);
    if (b.event) {
      const failed = flights.filter((f) => !f.success);
      const named = failed.filter((f) => f.events.some((e) => e.title === b.event)).length;
      expect(named / failed.length).toBeGreaterThanOrEqual(0.5);
    }
  });

  it("good designs score more than bad ones on average", () => {
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    const good = mean(GOOD.map((g) => meanScore(fly200(g.name, g.design()))));
    const bad = mean(BAD.map((b) => meanScore(fly200(b.name, b.design()))));
    expect(good).toBeGreaterThan(bad + 200);
  });

  it("the forecast agrees with the flights it summarizes", () => {
    const g = GOOD[0]!;
    const f = forecast(g.design(), catalog);
    expect(f.successProbability).toBeCloseTo(share(fly200(g.name, g.design())), 10);
    expect(f.expectedScore).toBeCloseTo(meanScore(fly200(g.name, g.design())), 6);
  });
});

describe("data: Falcon Heavy configurations", () => {
  const recovered = catalog.launchVehicles.find((v) => v.id === "falcon-heavy")!;
  const expendable = catalog.launchVehicles.find((v) => v.id === "falcon-heavy-expendable")!;
  it("lists the recovered and the expendable vehicle apart", () => {
    expect(recovered.name).toContain("recovered");
    expect(expendable.name).toContain("expendable");
    expect(recovered.reusable).toBe(true);
    expect(expendable.reusable).toBe(false);
    expect(recovered.costMUsd).toBeLessThan(expendable.costMUsd);
    expect(recovered.capacityKg.TLI!).toBeLessThan(expendable.capacityKg.TLI!);
  });
  it("cites NASA for the lunar capacity of both", () => {
    for (const v of [recovered, expendable]) expect(v.sources.some((s) => s.url.includes("elvperf.ksc.nasa.gov"))).toBe(true);
  });
  it("only an expendable Falcon Heavy lifts a loaded Blue Moon lander", () => {
    const ids = ["mb-blue-moon", "mb-vsat", "mb-rfc", "mb-li-ion", "mb-rhu", "mb-dte-xband", "mb-ice-drill"];
    expect(validateDesign(mb("mb-connecting-ridge", "falcon-heavy", ids), catalog).some((i) => i.id === "mass-over")).toBe(true);
    expect(validateDesign(mb("mb-connecting-ridge", "falcon-heavy-expendable", ids), catalog).some((i) => i.id === "mass-over")).toBe(false);
  });
});

describe("data: Moon Base Zero", () => {
  it("flies a lander on its own panels: no separate power module is required", () => {
    const d = mb("mb-malapert", "falcon-9", ["mb-blue-ghost", "mb-li-ion", "mb-dte-xband", "mb-rhu", "mb-dust-plasma"]);
    expect(validateDesign(d, catalog).filter((i) => i.severity === "blocker")).toEqual([]);
  });
  it("needs an instrument for the main objective", () => {
    const d = mb("mb-malapert", "falcon-9", ["mb-blue-ghost", "mb-li-ion", "mb-dte-xband", "mb-rhu", "mb-ice-drill"]);
    const issues = validateDesign(d, catalog);
    expect(issues.find((i) => i.id === "missing-category-instrument")?.severity).toBe("blocker");
    expect(issues.find((i) => i.id === "primary-unmet")?.text).toContain("instrument");
  });
  it("a tipped lander loses half its power", () => {
    const cat: Catalog = {
      ...catalog,
      missions: catalog.missions.map((m) =>
        m.id === "moon-base-zero" ? { ...m, events: m.events.map((e) => (e.id === "mb-lander-tips" ? { ...e, chance: 1, mitigatedBy: [] } : e)) } : m,
      ),
    };
    const d = mb("mb-malapert", "falcon-9", ["mb-blue-ghost", "mb-li-ion", "mb-dte-xband", "mb-rhu", "mb-dust-plasma"]);
    const peak = (c: Catalog) =>
      Math.max(...seeds(20).flatMap((s) => simulateFlight(d, c, s).telemetry.filter((t) => t.phase === "operations").map((t) => t.powerW)));
    const landed = seeds(20).map((s) => simulateFlight(d, cat, s)).filter((f) => f.lostAt !== "launch" && f.lostAt !== "arrival");
    expect(landed.length).toBeGreaterThan(0);
    expect(landed.every((f) => f.events.some((e) => e.title === "Lander tips over"))).toBe(true);
    expect(peak(cat)).toBeLessThanOrEqual(peak(catalog) * 0.5 + 1e-6);
  });
});
