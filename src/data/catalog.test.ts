import { describe, expect, it } from "vitest";
import { catalog } from "./catalog";

const entries = [...catalog.rockets, ...catalog.landers, ...catalog.sites, ...catalog.payloads];
const share = (x: number) => x >= 0 && x <= 1;

describe("catalog", () => {
  it("has unique ids", () => {
    const ids = entries.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("points every lander at a rocket that exists", () => {
    const rocketIds = new Set(catalog.rockets.map((r) => r.id));
    for (const l of catalog.landers) expect(rocketIds.has(l.rocketId), l.id).toBe(true);
  });

  it("keeps chances between 0 and 1", () => {
    for (const r of catalog.rockets) expect(share(r.launchSuccess), r.id).toBe(true);
    for (const l of catalog.landers) expect(share(l.landingSuccess), l.id).toBe(true);
    for (const s of catalog.sites) {
      expect(share(s.earthVisibleFraction), s.id).toBe(true);
      expect(share(s.landingFactor), s.id).toBe(true);
    }
  });

  it("has no negative amounts", () => {
    for (const p of catalog.payloads) {
      for (const n of [p.massKg, p.powerW, p.dataMbPerDay, p.heatW, p.scienceValue, p.paysUsd]) {
        expect(n, p.id).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("gives every verified entry at least one source with a link", () => {
    for (const e of entries) {
      if (!e.verified) continue;
      expect(e.sources.length, e.id).toBeGreaterThan(0);
      for (const s of e.sources) expect(s.url, e.id).toMatch(/^https?:\/\//);
    }
  });
});
