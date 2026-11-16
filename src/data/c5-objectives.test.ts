// C5: real mission objectives. Each one says what it is and why it matters in one line each, cites a
// primary source, can be met with modules the mission offers, and shows up as a goal in Operations.
import { describe, expect, it } from "vitest";
import { catalog } from "./index";
import { autoDesign, simulateFlight } from "../engine";
import type { MissionDesign, MissionId, Objective } from "../engine/types";
import { applyAction, canRunOps, createOps, whyNot, type OpsCtx, type OpsState } from "../ops";

const all = catalog.missions.flatMap((m) => [m.primaryObjective, ...m.secondaryObjectives].map((o) => ({ m, o })));
const oneLine = (text: string | undefined, max: number) => !!text && !text.includes("\n") && text.length <= max && /[.]$/.test(text);

describe("every objective", () => {
  it.each(all.map(({ m, o }) => [`${m.name}: ${o.title}`, o] as const))("%s has a one-line summary, a why line and a primary source", (_n, o: Objective) => {
    expect(oneLine(o.summary, 90), o.summary).toBe(true);
    expect(oneLine(o.why, 110), o.why).toBe(true);
    expect(o.source?.title.length).toBeGreaterThan(5);
    expect(o.source?.url).toMatch(/^https:\/\//);
  });

  it("can be met with modules its mission offers", () => {
    for (const { m, o } of all) {
      const offered = m.moduleIds.map((id) => catalog.modules.find((x) => x.id === id)!);
      for (const c of o.requires.categories ?? []) expect(offered.some((x) => x.category === c), `${o.id} needs ${c}`).toBe(true);
      for (const id of o.requires.moduleIds ?? []) expect(m.moduleIds, o.id).toContain(id);
    }
  });

  it("names no company: the NASA build stays brand-neutral", () => {
    const companies = catalog.actors.filter((a) => a.kind === "company").flatMap((a) => [a.name, a.shortName]);
    for (const m of catalog.missions)
      for (const text of [m.briefing, m.tagline, ...[m.primaryObjective, ...m.secondaryObjectives].flatMap((o) => [o.title, o.summary, o.why ?? ""])])
        for (const name of [...companies, "MoonDAO"]) expect(text, name).not.toContain(name);
  });
});

describe("the objectives follow the sprint plan", () => {
  const ids = (id: MissionId) => catalog.missions.find((m) => m.id === id)!.secondaryObjectives.map((o) => o.id);
  it("Orbital Lab: protein crystals, plants, tissue, materials, fire safety, crew health", () => {
    expect(ids("orbital-lab")).toEqual(expect.arrayContaining(["ol-protein", "ol-plants", "ol-tissue", "ol-manufacturing", "ol-fire-safety", "ol-health"]));
  });
  it("Earth Guardian: wildfires, floods by radar, small farms, data to local ground stations", () => {
    expect(ids("earth-guardian")).toEqual(expect.arrayContaining(["eg-wildfire", "eg-flood", "eg-crops", "eg-local"]));
  });
  it("Moon Base Zero: touchdown, water ice, night shift, first tracks, comms and navigation", () => {
    expect(catalog.missions.find((m) => m.id === "moon-base-zero")!.primaryObjective.title).toMatch(/touchdown/i);
    expect(ids("moon-base-zero")).toEqual(expect.arrayContaining(["mb-ice", "mb-night", "mb-scout", "mb-surface-net"]));
  });
});

/** Operations for a design after the first flight that arrives. */
function opsFor(d: MissionDesign): OpsState {
  for (let seed = 1; seed < 60; seed++) {
    const flight = simulateFlight(d, catalog, seed);
    if (canRunOps(flight)) return createOps(d, catalog, { flight, seed });
  }
  throw new Error("no flight arrived");
}

describe("Operations goals", () => {
  it("every secondary objective a design picks becomes a goal in Operations", () => {
    for (const m of catalog.missions) {
      const base = autoDesign(m.id, { leadId: "nasa", partnerIds: ["esa", "jaxa", "csa"] }, catalog);
      for (const o of m.secondaryObjectives) {
        const s = opsFor({ ...base, secondaryObjectiveIds: [o.id] });
        expect(s.goals.some((g) => g.objectiveId === o.id), `${m.id} ${o.id}`).toBe(true);
      }
    }
  });

  describe("Moon goals built on site: grow food, a landing pad, oxygen from regolith", () => {
    const d = autoDesign("moon-base-zero", { leadId: "nasa", partnerIds: ["jaxa", "isro", "blue-origin"] }, catalog);
    const ctx: OpsCtx = { design: d, catalog };
    const clear = (s: OpsState): OpsState => (s.pendingEvent ? { ...s, pendingEvent: null } : s);
    const turn = (s: OpsState) => clear(applyAction(clear(s), { type: "advance" }, ctx));
    const freeTile = (s: OpsState, kind: string) => s.tiles.find((t) => whyNot(s, { type: "build", kind, tileId: t.id }, ctx) === null)!.id;

    it("every Moon operations phase offers all three", () => {
      expect(opsFor(d).goals.map((g) => g.id)).toEqual(expect.arrayContaining(["grow-plant", "landing-pad", "oxygen"]));
    });

    it("a sintered landing pad completes its goal", () => {
      let s = clear(opsFor(d));
      s = applyAction(s, { type: "build", kind: "pad", tileId: freeTile(s, "pad") }, ctx);
      s = turn(s);
      expect(s.goals.find((g) => g.id === "landing-pad")?.done).toBe(true);
    });

    it("the oxygen plant unlocks with research and completes its goal after two working turns", () => {
      let s = clear(opsFor(d));
      expect(whyNot({ ...s, ap: 4 }, { type: "build", kind: "isru", tileId: s.tiles[1]!.id }, ctx)).toBe("Research it first.");
      s = applyAction({ ...s, sciencePoints: 100 }, { type: "research", id: "electrolysis" }, ctx);
      s = applyAction(s, { type: "build", kind: "isru", tileId: freeTile(s, "isru") }, ctx);
      s = turn(turn(s));
      expect(s.goals.find((g) => g.id === "oxygen")?.done).toBe(true);
    });
  });
});
