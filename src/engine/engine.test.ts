import { describe, expect, it } from "vitest";
import { catalog, coalition, moonDesign, orbitalDesign } from "./fixtures";
import {
  applyStat,
  computeResources,
  councilReview,
  councilValues,
  defaultDesign,
  effectiveModifiers,
  forecast,
  makeRng,
  simulateFlight,
  validateDesign,
} from "./index";
import type { LiveContext } from "./types";

declare const performance: { now(): number };

const ids = (d = orbitalDesign()) => validateDesign(d, catalog).map((i) => i.id);

describe("rng", () => {
  it("is deterministic and in [0,1)", () => {
    const a = makeRng(7);
    const b = makeRng(7);
    for (let i = 0; i < 50; i++) {
      const x = a();
      expect(x).toBe(b());
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
});

describe("modifiers", () => {
  it("applies muls before adds and respects scope", () => {
    const mods = [
      { stat: "moduleMass" as const, op: "add" as const, value: 5 },
      { stat: "moduleMass" as const, op: "mul" as const, value: 0.9 },
      { stat: "moduleMass" as const, op: "mul" as const, value: 0.5, scope: { category: "power" as const } },
    ];
    expect(applyStat(100, "moduleMass", mods)).toBeCloseTo(95);
    expect(applyStat(100, "moduleMass", mods, { category: "power" })).toBeCloseTo(50);
  });
  it("collects perks of all four members and blueprints", () => {
    const withPerk = {
      ...catalog,
      actors: catalog.actors.map((a) =>
        a.id === "banker" ? { ...a, perk: { ...a.perk, modifiers: [{ stat: "treasury" as const, op: "add" as const, value: 7 }] } } : a,
      ),
    };
    expect(effectiveModifiers(orbitalDesign(), withPerk)).toHaveLength(1);
    expect(effectiveModifiers(orbitalDesign({ blueprintIds: ["light-solar"] }), withPerk)).toHaveLength(2);
  });
  it("throws a clear error on unknown ids", () => {
    expect(() => computeResources(orbitalDesign({ moduleIds: ["nope"] }), catalog)).toThrow('Unknown module "nope"');
  });
});

describe("resources", () => {
  const rep = computeResources(orbitalDesign(), catalog);
  it("mass: payload excludes carrier, capacity is the smaller limit", () => {
    expect(rep.mass.used).toBe(50);
    expect(rep.mass.capacity).toBe(300);
    expect(rep.mass.status).toBe("ok");
  });
  it("power is orbit-average", () => {
    expect(rep.power.capacity).toBeCloseTo(120);
    expect(rep.power.used).toBe(20 + 5 + 5 + 15 + 20);
  });
  it("budget", () => {
    expect(rep.budget.capacity).toBe(20 + 40 + 30 + 20 + 10);
    expect(rep.budget.used).toBe(20 + 10 + 2 + 1 + 3 + 4);
  });
  it("data and comms", () => {
    expect(rep.comms.capacity).toBeCloseTo(0.3);
    expect(rep.data.used).toBe(5);
    expect(rep.data.capacity).toBeCloseTo(9);
  });
  it("lifetime defaults to 1.5x duration", () => {
    expect(rep.lifetime.capacity).toBe(45);
    expect(rep.lifetime.used).toBe(30);
  });
  it("lifetime: carrier sets the base, thermal and battery extend it, other categories are ignored", () => {
    const cat = {
      ...catalog,
      modules: catalog.modules.map((m) =>
        m.id === "lander" ? { ...m, lifetimeDays: 14 } : m.id === "heater" ? { ...m, lifetimeDays: 45 } : m.id === "camera" ? { ...m, lifetimeDays: 3 } : m,
      ),
    };
    const base = moonDesign({ moduleIds: ["lander", "solar", "radio", "camera"] });
    expect(computeResources(base, cat).lifetime.capacity).toBe(14);
    expect(computeResources({ ...base, moduleIds: [...base.moduleIds, "heater"] }, cat).lifetime.capacity).toBe(45);
  });
  it("negative data modules reduce data used, clamped at 0", () => {
    const cat = { ...catalog, modules: [...catalog.modules, { ...catalog.modules[0]!, id: "edge-ai", category: "computer" as const, dataGbPerDay: -3, massKg: 1 }] };
    expect(computeResources(orbitalDesign({ moduleIds: ["bus", "solar", "radio", "camera", "edge-ai"] }), cat).data.used).toBe(2);
    expect(computeResources(orbitalDesign({ moduleIds: ["bus", "solar", "radio", "edge-ai"] }), cat).data.used).toBe(0);
  });
  it("comms adds link bonus, capped at 1", () => {
    const r = computeResources(orbitalDesign({ moduleIds: ["bus", "relay", "relay"] }), catalog);
    expect(r.comms.capacity).toBeCloseTo(1);
  });
  it("rocket capacity limits mass when there is no carrier", () => {
    const r = computeResources(orbitalDesign({ moduleIds: ["solar"], launchVehicleId: "leo-only" }), catalog);
    expect(r.mass.capacity).toBe(300);
  });
  it("rideshares add mass, power, data and treasury", () => {
    const r = computeResources(orbitalDesign({ rideshareIds: ["cubesat"] }), catalog);
    expect(r.mass.used).toBe(60);
    expect(r.budget.capacity).toBe(125);
    expect(r.data.used).toBe(6);
  });
  it("a perk of -10% module mass lowers payload mass", () => {
    const cat = {
      ...catalog,
      actors: catalog.actors.map((a) =>
        a.id === "lead" ? { ...a, perk: { ...a.perk, modifiers: [{ stat: "moduleMass" as const, op: "mul" as const, value: 0.9 }] } } : a,
      ),
    };
    expect(computeResources(orbitalDesign(), cat).mass.used).toBeCloseTo(45);
  });
  it("blueprint adoption changes numbers", () => {
    const r = computeResources(orbitalDesign({ blueprintIds: ["light-solar"] }), catalog);
    expect(r.mass.used).toBe(40);
  });
  it("works on empty designs without throwing", () => {
    const r = computeResources(orbitalDesign({ launchVehicleId: "", destinationId: "", moduleIds: [] }), catalog);
    expect(r.mass.capacity).toBe(0);
    expect(r.mass.status).toBe("ok");
  });
});

describe("validation", () => {
  it("valid design has no blockers", () => {
    expect(validateDesign(orbitalDesign(), catalog).filter((i) => i.severity === "blocker")).toEqual([]);
  });
  it("missing choices are blockers", () => {
    const list = ids(orbitalDesign({ launchVehicleId: "", destinationId: "", moduleIds: [] }));
    expect(list).toEqual(
      expect.arrayContaining(["missing-launch-vehicle", "missing-destination", "missing-modules", "missing-category-power", "missing-category-comms"]),
    );
    expect(validateDesign(orbitalDesign({ moduleIds: ["bus"] }), catalog).find((i) => i.id === "missing-category-comms")?.severity).toBe("blocker");
  });
  it("over mass is a blocker with a concrete fix", () => {
    const issues = validateDesign(orbitalDesign({ moduleIds: ["bus", "solar", "radio", "hyperspectral", "hyperspectral", "hyperspectral", "hyperspectral", "hyperspectral", "hyperspectral", "hyperspectral"] }), catalog);
    const mass = issues.find((i) => i.id === "mass-over");
    expect(mass?.severity).toBe("blocker");
    expect(mass?.fix).toContain("hyperspectral");
  });
  it("tight margin is a warning", () => {
    const d = orbitalDesign({ moduleIds: ["bus", "solar", "battery", "radio", "camera", "hyperspectral", "hyperspectral", "hyperspectral", "hyperspectral"] });
    // 15+48*4+10+20+5 = 242kg of 300 -> 81%: ok; add one more -> 290 kg: tight
    const d2 = { ...d, moduleIds: [...d.moduleIds, "hyperspectral"] };
    const issue = validateDesign(d2, catalog).find((i) => i.id === "mass-tight");
    expect(issue?.severity).toBe("warning");
    expect(issue?.text).toContain("10%");
  });
  it("launch vehicle that cannot reach the orbit is a blocker", () => {
    expect(ids(moonDesign({ launchVehicleId: "leo-only" }))).toContain("launch-cannot-reach");
  });
  it("too many secondaries is a blocker, unmet requires a warning", () => {
    const three = orbitalDesign({ secondaryObjectiveIds: ["sec-imaging", "sec-spectra", "sec-thermal"] });
    expect(ids(three)).toContain("too-many-secondaries");
    const issues = validateDesign(orbitalDesign({ secondaryObjectiveIds: ["sec-spectra"] }), catalog);
    expect(issues.find((i) => i.id === "secondary-unmet-sec-spectra")?.severity).toBe("warning");
  });
  it("small batteries warn for the Moon", () => {
    expect(ids(moonDesign())).toContain("battery-small");
    expect(ids(moonDesign({ moduleIds: ["lander", "solar", "battery-big", "battery-big", "radio", "camera"] }))).not.toContain("battery-small");
  });
});

describe("council", () => {
  it("values weights sum to 1 and the lead uses player values", () => {
    const player = { science: 1, safety: 0, cost: 0 };
    const { values, weights } = councilValues(coalition, player, catalog);
    expect(Object.values(weights).reduce((s, w) => s + w, 0)).toBeCloseTo(1);
    expect(weights["lead"]).toBeCloseTo(0.4);
    expect(values.science + values.safety + values.cost).toBeCloseTo(1);
    // lead 0.4*1 + 0.3*0.2 + 0.2*0.3 + 0.1*0.2 = 0.54
    expect(values.science).toBeCloseTo(0.54);
  });
  it("a comms bot vetoes a comms blocker", () => {
    const reviews = councilReview(orbitalDesign({ moduleIds: ["bus", "solar", "camera"] }), catalog);
    expect(reviews).toHaveLength(3);
    const linker = reviews.find((r) => r.actorId === "linker");
    expect(linker?.verdict).toBe("veto");
    expect(linker?.issueIds).toContain("missing-category-comms");
  });
  it("approves a clean design", () => {
    const reviews = councilReview(orbitalDesign(), catalog);
    expect(reviews.find((r) => r.actorId === "banker")?.verdict).toBe("approve");
  });
  it("a safety-minded bot vetoes any over resource", () => {
    const reviews = councilReview(orbitalDesign({ moduleIds: ["bus", "radio", "camera"] }), catalog);
    expect(reviews.find((r) => r.actorId === "rocketeer")?.verdict).toBe("veto");
    const over = councilReview(orbitalDesign({ moduleIds: ["bus", "solar", "radio", "camera", "hyperspectral", "hyperspectral"] }), catalog);
    expect(over.find((r) => r.actorId === "rocketeer")?.verdict).toBe("veto");
  });
});

describe("council noise", () => {
  it("a tight mass margin is raised only by the launch bot", () => {
    const cat = { ...catalog, modules: catalog.modules.map((m) => (m.id === "bus" ? { ...m, payloadCapacityKg: 55 } : m)) };
    const reviews = councilReview(orbitalDesign(), cat);
    expect(reviews.find((r) => r.actorId === "rocketeer")?.verdict).toBe("concern");
    expect(reviews.find((r) => r.actorId === "linker")?.verdict).toBe("approve");
    expect(reviews.find((r) => r.actorId === "banker")?.verdict).toBe("approve");
  });
  it("issues in a domain no partner owns go to the most safety-minded partner", () => {
    const reviews = councilReview(orbitalDesign({ moduleIds: ["bus", "solar", "battery", "radio"] }), catalog);
    // no instrument: science domain (unowned) blocker goes to the rocketeer (safety 0.5)
    expect(reviews.find((r) => r.actorId === "rocketeer")?.verdict).toBe("veto");
    expect(reviews.find((r) => r.actorId === "banker")?.verdict).toBe("approve");
  });
});

describe("science score", () => {
  it("adding a science instrument that fits raises the expected score", () => {
    const base = orbitalDesign({ moduleIds: ["bus", "solar", "battery", "relay", "camera"] });
    const more = orbitalDesign({ moduleIds: ["bus", "solar", "battery", "relay", "camera", "hyperspectral"] });
    expect(validateDesign(more, catalog).filter((i) => i.severity === "blocker")).toEqual([]);
    expect(forecast(more, catalog).expectedScore).toBeGreaterThan(forecast(base, catalog).expectedScore);
  });
});

describe("defaultDesign", () => {
  it("has no blockers when a valid design exists, on every mission", () => {
    for (const m of catalog.missions) {
      const d = defaultDesign(m.id, coalition, catalog);
      expect(validateDesign(d, catalog).filter((i) => i.severity === "blocker")).toEqual([]);
    }
  });
  it("builds a design that has no missing-choice blockers", () => {
    const d = defaultDesign("orbital-lab", coalition, catalog);
    expect(d.launchVehicleId).not.toBe("");
    expect(validateDesign(d, catalog).some((i) => i.id.startsWith("missing"))).toBe(false);
  });
});

const live: LiveContext = {
  fetchedAt: "2026-10-01T00:00:00Z",
  snapshot: true,
  spaceWeather: [{ id: "c1", kind: "CME", time: "2026-09-30T12:00Z", note: "Halo CME", link: "https://example.org/cme" }],
  earthEvents: Array.from({ length: 50 }, (_, i) => ({ id: `e${i}`, title: `Fire ${i}`, category: "wildfires", lat: 0, lon: 0, link: "https://example.org/e" })),
};

describe("simulation", () => {
  it("is deterministic per seed and varies across seeds", () => {
    expect(simulateFlight(orbitalDesign(), catalog, 5)).toEqual(simulateFlight(orbitalDesign(), catalog, 5));
    const totals = new Set(Array.from({ length: 30 }, (_, s) => JSON.stringify(simulateFlight(orbitalDesign(), catalog, s + 1))));
    expect(totals.size).toBeGreaterThan(1);
  });
  it("a blocked design never launches", () => {
    const f = simulateFlight(orbitalDesign({ moduleIds: [] }), catalog, 1);
    expect(f.success).toBe(false);
    expect(f.lostAt).toBe("launch");
    expect(f.score.total).toBe(0);
    expect(f.telemetry).toHaveLength(0);
    expect(f.lessons.length).toBeGreaterThanOrEqual(3);
  });
  it("a healthy design usually succeeds with sane telemetry", () => {
    const flights = Array.from({ length: 20 }, (_, s) => simulateFlight(orbitalDesign(), catalog, s + 1));
    const ok = flights.find((f) => f.success);
    expect(ok).toBeDefined();
    expect(ok?.objectivesMet).toContain("orbital-lab-primary");
    expect(ok?.telemetry.length).toBeGreaterThan(0);
    expect(ok?.telemetry.length).toBeLessThanOrEqual(120);
    expect(ok?.lessons.length).toBeGreaterThanOrEqual(3);
    expect(ok?.lessons.length).toBeLessThanOrEqual(6);
    expect(ok?.score.total).toBeGreaterThan(0);
  });
  it("no batteries on the Moon loses power at night", () => {
    let found = false;
    for (let s = 1; s <= 10 && !found; s++) {
      const f = simulateFlight(moonDesign(), catalog, s);
      if (f.events.some((e) => e.title === "Power shortfall")) {
        found = true;
        expect(f.lessons.some((l) => l.includes("lunar night"))).toBe(true);
      }
    }
    expect(found).toBe(true);
  });
  it("a live CME fires the DONKI-sourced event", () => {
    const f = simulateFlight(orbitalDesign(), catalog, 11, live);
    if (f.lostAt && f.lostAt !== "operations") return;
    const ev = f.events.find((e) => e.liveSource);
    expect(ev?.liveSource?.title).toBe("NASA DONKI CME 2026-09-30T12:00Z");
    expect(ev?.liveSource?.url).toBe("https://example.org/cme");
    expect(ev?.text).toContain("2026-09-30");
  });
  it("negative data modules cut the daily data in the sim", () => {
    const cat = { ...catalog, modules: [...catalog.modules, { ...catalog.modules[0]!, id: "edge-ai", category: "computer" as const, dataGbPerDay: -2, massKg: 1, powerW: 1, payloadCapacityKg: undefined }] };
    const a = simulateFlight(orbitalDesign(), cat, 4);
    const b = simulateFlight(orbitalDesign({ moduleIds: ["bus", "solar", "battery", "radio", "camera", "edge-ai"] }), cat, 4);
    expect(b.dataReturnedGb).toBeLessThan(a.dataReturnedGb);
    expect(b.dataReturnedGb).toBeGreaterThan(0);
  });
  it("earth-guardian logs at most 5 live Earth event lines", () => {
    const d = orbitalDesign({ missionId: "earth-guardian", destinationId: "sso" });
    const f = simulateFlight(d, catalog, 3, { ...live, spaceWeather: [] });
    const lines = f.events.filter((e) => e.liveSource?.title.startsWith("NASA EONET"));
    expect(lines.length).toBeLessThanOrEqual(5);
    if (f.success) expect(lines.length).toBeGreaterThan(0);
  });
  it("samples telemetry evenly for long missions", () => {
    const longCat = { ...catalog, missions: catalog.missions.map((m) => (m.id === "orbital-lab" ? { ...m, durationDays: 500, phases: m.phases.map((p) => (p.id === "operations" ? { ...p, days: 500 } : p)) } : m)) };
    const f = simulateFlight(orbitalDesign({ moduleIds: ["bus", "solar", "rtg", "battery", "radio", "relay", "camera"] }), longCat, 2);
    expect(f.telemetry.length).toBeLessThanOrEqual(120);
  });
});

describe("forecast", () => {
  it("returns sane numbers", () => {
    const f = forecast(orbitalDesign(), catalog, 100);
    expect(f.runs).toBe(100);
    expect(f.successProbability).toBeGreaterThanOrEqual(0);
    expect(f.successProbability).toBeLessThanOrEqual(1);
    expect(f.p10).toBeLessThanOrEqual(f.p90);
    expect(f.expectedScore).toBeGreaterThan(0);
  });
  it("is deterministic", () => {
    expect(forecast(orbitalDesign(), catalog)).toEqual(forecast(orbitalDesign(), catalog));
  });
  it("runs 200 flights of a 30-day mission fast enough to stay interactive (target 300 ms; best of 3 under 1.5 s)", () => {
    forecast(orbitalDesign(), catalog, 20);
    let best = Infinity;
    for (let k = 0; k < 3; k++) {
      const t0 = performance.now();
      const f = forecast(orbitalDesign(), catalog, 200, live);
      best = Math.min(best, performance.now() - t0);
      expect(f.runs).toBe(200);
    }
    expect(best).toBeLessThan(1500);
  });
});
