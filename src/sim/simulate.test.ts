import { describe, expect, it } from "vitest";
import type { Catalog, Manifest } from "../types";
import { resourceUse } from "./resources";
import { simulate } from "./simulate";

const catalog: Catalog = {
  rockets: [{ id: "r", name: "Test rocket", launchSuccess: 1, sources: [], verified: false }],
  landers: [
    {
      id: "l",
      name: "Test lander",
      rocketId: "r",
      payloadMassKg: 100,
      payloadPowerW: 100,
      downlinkMbPerDay: 1000,
      heatRejectionW: 100,
      landingSuccess: 1,
      pricePerKgUsd: 1_000_000,
      missionCostUsd: 50_000_000,
      survivesNight: false,
      sources: [],
      verified: false,
    },
  ],
  sites: [
    {
      id: "s",
      name: "Test site",
      latitudeDeg: 0,
      longitudeDeg: 0,
      sunlitDays: 14,
      earthVisibleFraction: 1,
      landingFactor: 1,
      scienceFactor: 1,
      sources: [],
      verified: false,
    },
  ],
  payloads: [
    { id: "cam", name: "Camera", kind: "science", owner: "Team", massKg: 10, powerW: 20, dataMbPerDay: 100, heatW: 20, scienceValue: 50, paysUsd: 0, sources: [], verified: false },
    { id: "box", name: "Memorial box", kind: "memorial", owner: "Customer", massKg: 5, powerW: 0, dataMbPerDay: 0, heatW: 0, scienceValue: 0, paysUsd: 5_000_000, sources: [], verified: false },
    { id: "heavy", name: "Heavy drill", kind: "science", owner: "Team", massKg: 200, powerW: 50, dataMbPerDay: 10, heatW: 50, scienceValue: 80, paysUsd: 0, sources: [], verified: false },
  ],
};
const budget = { startUsd: 60_000_000 };
const flight: Manifest = { landerId: "l", siteId: "s", payloadIds: ["cam", "box"] };

describe("simulate", () => {
  it("flies the same way for the same seed", () => {
    expect(simulate(flight, catalog, budget, 42)).toEqual(simulate(flight, catalog, budget, 42));
  });

  it("refuses a manifest heavier than the lander carries", () => {
    const r = simulate({ ...flight, payloadIds: ["heavy"] }, catalog, budget, 1);
    expect(r.ok).toBe(false);
    expect(r.events[0].text).toMatch(/can't fly/);
  });

  it("returns all the data when Earth is always up and the link is big enough", () => {
    const r = simulate(flight, catalog, budget, 7);
    expect(r.ok).toBe(true);
    expect(r.dataReturnedMb.cam).toBe(1400);
    expect(r.score.science).toBe(50);
    expect(r.score.customersServed).toBe(1);
  });

  it("scores no science when the landing fails", () => {
    const crashing: Catalog = { ...catalog, landers: [{ ...catalog.landers[0], landingSuccess: 0 }] };
    const r = simulate({ ...flight, payloadIds: ["cam"] }, crashing, budget, 3);
    expect(r.ok).toBe(false);
    expect(r.score.science).toBe(0);
  });

  it("counts the manifest against the lander's limits", () => {
    const use = resourceUse(flight, catalog, budget);
    expect(use.massKg).toEqual({ used: 15, limit: 100 });
    expect(use.costUsd).toEqual({ used: 50_000_000, limit: 65_000_000 });
  });
});
