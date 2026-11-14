// Integrity checks for the catalog. They run on whatever data is in src/data, so a data lane gets feedback right away.
import { describe, expect, it } from "vitest";
import { catalog } from "./index";

const ids = <T extends { id: string }>(xs: T[]) => new Set(xs.map((x) => x.id));
const unique = (xs: { id: string }[]) => new Set(xs.map((x) => x.id)).size === xs.length;

describe("catalog", () => {
  const actorIds = ids(catalog.actors), moduleIds = ids(catalog.modules), vehicleIds = ids(catalog.launchVehicles), offerIds = ids(catalog.rideshareOffers);

  it("has unique ids in every list", () => {
    for (const list of [catalog.actors, catalog.modules, catalog.launchVehicles, catalog.missions, catalog.blueprints, catalog.rideshareOffers]) expect(unique(list)).toBe(true);
  });

  it("gives every actor priorities that sum to 1", () => {
    for (const a of catalog.actors) expect(a.priorities.science + a.priorities.safety + a.priorities.cost).toBeCloseTo(1, 5);
  });

  it("has at least 4 actors so a council can form", () => expect(catalog.actors.length).toBeGreaterThanOrEqual(4));

  it("only references ids that exist", () => {
    for (const v of catalog.launchVehicles) expect(actorIds.has(v.providerId)).toBe(true);
    for (const o of catalog.rideshareOffers) expect(actorIds.has(o.actorId)).toBe(true);
    for (const b of catalog.blueprints) { expect(actorIds.has(b.authorId)).toBe(true); if (b.parentId) expect(ids(catalog.blueprints).has(b.parentId)).toBe(true); }
    for (const m of catalog.missions) {
      for (const id of m.launchVehicleIds) expect(vehicleIds.has(id)).toBe(true);
      for (const id of m.moduleIds) expect(moduleIds.has(id)).toBe(true);
      for (const id of m.rideshareOfferIds) expect(offerIds.has(id)).toBe(true);
    }
  });

  it("lets every mission be completed: a module exists for each required category", () => {
    for (const m of catalog.missions) {
      const cats = new Set(m.moduleIds.map((id) => catalog.modules.find((x) => x.id === id)?.category));
      for (const c of m.requiredCategories) expect(cats.has(c), `${m.id} needs ${c}`).toBe(true);
      expect(m.destinations.length).toBeGreaterThan(0);
    }
  });
});
