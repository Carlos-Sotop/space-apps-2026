// The one-click coalitions on the Coalition screen, and the design each one gets in Quick play.
import { describe, expect, it } from "vitest";
import { catalog } from "@/data";
import { autoDesign, councilReview, forecast, validateDesign } from "@/engine";
import type { Coalition } from "@/engine/types";
import { recommendedCoalitions } from "./coalition";

const setOf = (ids: string[]) => [...ids].sort().join(",");

describe("recommendedCoalitions", () => {
  it("offers three different sets of three real partners, never the lead, for every lead and mission", () => {
    const ids = new Set(catalog.actors.map((a) => a.id));
    for (const lead of catalog.actors)
      for (const m of catalog.missions) {
        const recs = recommendedCoalitions(m, lead.id);
        expect(recs.map((r) => r.id)).toEqual(["specialists", "coverage", "pockets"]);
        expect(new Set(recs.map((r) => setOf(r.partnerIds))).size).toBe(3);
        for (const r of recs) {
          expect(new Set(r.partnerIds).size).toBe(3);
          expect(r.partnerIds).not.toContain(lead.id);
          for (const id of r.partnerIds) expect(ids.has(id)).toBe(true);
        }
      }
  });

  it("puts a world-class lander team in every Moon coalition", () => {
    const strong = (id: string) => (catalog.actors.find((a) => a.id === id)?.capabilities.landing ?? 0) >= 3;
    const moon = catalog.missions.find((m) => m.id === "moon-base-zero")!;
    for (const lead of catalog.actors)
      for (const r of recommendedCoalitions(moon, lead.id)) expect([lead.id, ...r.partnerIds].some(strong), `${lead.id} ${r.id}`).toBe(true);
  });

  it("depends on the mission", () => {
    const [lab, moon] = ["orbital-lab", "moon-base-zero"].map((id) => recommendedCoalitions(catalog.missions.find((m) => m.id === id), "nasa"));
    expect(setOf(lab![1]!.partnerIds)).not.toBe(setOf(moon![1]!.partnerIds));
  });
});

describe("every recommended coalition gets a design that flies", () => {
  const cases = ["nasa", "aeb", "isro", "spacex"].flatMap((lead) =>
    catalog.missions.flatMap((m) =>
      recommendedCoalitions(m, lead).map((r) => [`${m.name}, ${lead} with ${r.label}`, m.id, { leadId: lead, partnerIds: r.partnerIds } as Coalition] as const),
    ),
  );
  it.each(cases)("%s: clean, approved by every partner, at least 70% success", (_name, missionId, coalition) => {
    const d = autoDesign(missionId, coalition, catalog);
    expect(validateDesign(d, catalog)).toEqual([]);
    expect(councilReview(d, catalog).every((r) => r.verdict === "approve")).toBe(true);
    expect(forecast(d, catalog, 200).successProbability).toBeGreaterThanOrEqual(0.7);
  });
});
