// C7: Brazilian companies and the launch vehicle spec card.
import { describe, expect, it } from "vitest";
import { recommendedCoalitions } from "@/lib/coalition";
import { catalog } from "./index";

describe("C7 data", () => {
  it("lists Bizu Space and Visiona as Brazilian companies with sources", () => {
    for (const id of ["bizu-space", "visiona"]) {
      const a = catalog.actors.find((x) => x.id === id);
      expect(a, id).toBeDefined();
      expect(a!.kind).toBe("company");
      expect(a!.country).toBe("BR");
      expect(a!.sources.length).toBeGreaterThan(1);
    }
  });

  it("gives every launch vehicle a spec card with a sane record", () => {
    for (const v of catalog.launchVehicles) {
      const s = v.specs;
      expect(s, v.id).toBeDefined();
      expect(s!.heightM, v.id).toBeGreaterThan(10);
      expect(s!.heightM, v.id).toBeLessThan(150);
      expect(s!.stages, v.id).toBeGreaterThanOrEqual(1);
      expect(s!.stages, v.id).toBeLessThanOrEqual(4);
      expect(s!.successes, v.id).toBeLessThanOrEqual(s!.flights);
      expect(s!.recordAsOf, v.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      if (v.status === "in-development" && v.id !== "starship") expect(s!.flights, v.id).toBe(0);
    }
  });

  it("does not change the recommended coalitions of any mission", () => {
    for (const m of catalog.missions)
      for (const r of recommendedCoalitions(m, "nasa")) expect(r.partnerIds.some((id) => id === "bizu-space" || id === "visiona"), `${m.id} ${r.id}`).toBe(false);
  });
});

describe("C7 verified rockets", () => {
  it("marks a rocket verified only with a spec card and a source beyond Wikipedia", () => {
    const checked = catalog.launchVehicles.filter((v) => v.verified).map((v) => v.id).sort();
    expect(checked).toEqual(["ariane-62", "ariane-64", "falcon-heavy", "falcon-heavy-expendable", "vega-c"]);
    for (const v of catalog.launchVehicles.filter((x) => x.verified)) {
      expect(v.specs, v.id).toBeDefined();
      expect(v.sources.some((s) => !s.url.includes("wikipedia.org")), v.id).toBe(true);
    }
  });
});
