import { describe, expect, it } from "vitest";
import { catalog as game } from "@/data";
import { catalog, orbitalDesign } from "./fixtures";
import { autoDesign, batteryShortWh, computeResources, councilReview, defaultDesign, designMoves, readinessReview, validateDesign } from "./index";
import { fmt } from "./design";
import type { Coalition, MissionDesign } from "./types";

const COUNCILS: Coalition["partnerIds"][] = [
  ["esa", "jaxa", "csa"],
  ["northrop-grumman", "airbus-defence-space", "spacex"],
  ["isro", "aee", "iceye"],
  ["ula", "rocket-lab", "conae"],
];

const FIX = /\b(Add|Drop|Swap to|Launch on|No part on offer|No room for|Agree with|Pick|Choose|Deselect|Room for)\b|stays in reserve/;
const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const RANK: Record<string, number> = { "no-go": 0, "go-with-condition": 1, go: 2 };

/** Designs a player really makes: the default, a loaded one, one missing comms, one on a rocket that is too small. */
function variants(d: MissionDesign): MissionDesign[] {
  const mission = game.missions.find((m) => m.id === d.missionId)!;
  const extra = mission.moduleIds.filter((id) => !d.moduleIds.includes(id) && game.modules.find((m) => m.id === id)?.payloadCapacityKg === undefined);
  return [
    d,
    { ...d, moduleIds: [...d.moduleIds, ...extra.slice(0, 4)] },
    { ...d, moduleIds: d.moduleIds.filter((id) => game.modules.find((m) => m.id === id)?.category !== "comms") },
    { ...d, launchVehicleId: "electron" },
  ];
}

describe("council lines", () => {
  it("every line names a number, offers one fix and stays one short line (150 characters, a two-step fix included)", () => {
    for (const m of game.missions)
      for (const partnerIds of COUNCILS)
        for (const d of variants(defaultDesign(m.id, { leadId: "nasa", partnerIds }, game)))
          for (const r of councilReview(d, game)) {
            const where = `${m.id} ${r.actorId}: ${r.message}`;
            expect(r.message, where).toMatch(/\d/);
            expect(r.message, where).not.toMatch(/undefined|NaN|\n/);
            expect(r.message.length, where).toBeLessThanOrEqual(150);
            expect(r.message, where).toMatch(/\.$/);
            if (r.verdict !== "approve") expect(r.message, where).toMatch(FIX);
          }
  });

  it("an over limit names the used amount and the limit, and the fix really clears it", () => {
    const d = orbitalDesign({ moduleIds: ["bus", "solar", "radio", "relay", "camera", "hyperspectral", "battery-big", "rtg"], launchVehicleId: "leo-only" });
    const rep = computeResources(d, catalog);
    expect(validateDesign(d, catalog).map((i) => i.id)).toContain("mass-over");
    const line = councilReview(d, catalog).find((r) => r.issueIds[0] === "mass-over")!;
    expect(line.message).toContain(`payload ${Math.round(rep.mass.used)} kg, limit ${Math.round(rep.mass.capacity)} kg`.replace(/^p/, "P"));
    const move = designMoves(d, catalog).find((mv) => line.message.includes(`${mv.label} (`))!;
    expect(move).toBeDefined();
    expect(validateDesign(move.design, catalog).map((i) => i.id)).not.toContain("mass-over");
  });

  it("members speak in their own voice", () => {
    const d = defaultDesign("moon-base-zero", { leadId: "nasa", partnerIds: ["northrop-grumman", "airbus-defence-space", "spacex"] }, game);
    const lines = councilReview({ ...d, launchVehicleId: "electron" }, game);
    expect(lines.find((r) => r.actorId === "spacex")?.message).toMatch(/^No\. /);
    expect(new Set(lines.map((r) => r.message)).size).toBe(3);
  });

  it("members who share a domain raise different issues, offer different fixes, or agree with the member who spoke first", () => {
    for (const m of game.missions)
      for (const partnerIds of COUNCILS)
        for (const d of variants(defaultDesign(m.id, { leadId: "nasa", partnerIds }, game))) {
          const lines = councilReview(d, game);
          const names = lines.map((r) => game.actors.find((a) => a.id === r.actorId)!.shortName);
          lines.forEach((r, i) => {
            const agree = r.message.match(/Agree with ([^:.]+)(?::|\.$)/);
            if (agree) expect(names.slice(0, i), r.message).toContain(agree[1]);
            for (const earlier of lines.slice(0, i)) expect(r.message, `${m.id}: ${r.message}`).not.toBe(earlier.message);
          });
        }
  });

  it("a battery the lander can't carry is named, never 'fixed' by swapping the radio or the lander alone", () => {
    for (const partnerIds of COUNCILS) {
      const d = defaultDesign("moon-base-zero", { leadId: "nasa", partnerIds }, game);
      const lines = councilReview(d, game).filter((r) => r.issueIds[0] === "battery-small");
      for (const r of lines) expect(r.message).not.toMatch(/Swap to (Post-quantum|Surface mesh|Lunar relay|Nova-C)|first \(/);
      if (lines.length) expect(lines[0].message).toMatch(/No room for|, add |\bAdd /);
    }
  });

  it("with a bigger rocket, a bigger lander plus the fuel cell is offered, and it works", () => {
    const d = { ...defaultDesign("moon-base-zero", { leadId: "nasa", partnerIds: ["esa", "jaxa", "csa"] }, game), launchVehicleId: "falcon-heavy" };
    const line = councilReview(d, game).find((r) => r.issueIds[0] === "battery-small");
    expect(line?.message).toMatch(/Swap to .+, add .+ \(\+\$\d+M\)\.$/);
    const first = designMoves(d, game).find((mv) => line!.message.includes(`${mv.label}, `))!;
    const second = designMoves(first.design, game).find((mv) => line!.message.includes(`, ${lowerFirst(mv.label)} (`))!;
    const after = validateDesign(second.design, game);
    expect(after.map((i) => i.id)).not.toContain("battery-small");
    expect(after.filter((i) => i.severity === "blocker")).toEqual([]);
  });

  it("a fix that clears more problems wins: a missing radio is fixed with a radio, not a crypto board", () => {
    for (const partnerIds of COUNCILS) {
      const d = defaultDesign("moon-base-zero", { leadId: "nasa", partnerIds }, game);
      const noComms = { ...d, moduleIds: d.moduleIds.filter((id) => game.modules.find((x) => x.id === id)?.category !== "comms") };
      for (const r of councilReview(noComms, game)) expect(r.message).not.toMatch(/Add Post-quantum secure link/);
    }
  });

  it("never fixes a thin margin by breaking it", () => {
    for (const partnerIds of COUNCILS) {
      const d = defaultDesign("moon-base-zero", { leadId: "nasa", partnerIds }, game);
      for (const r of councilReview(d, game)) {
        if (r.issueIds[0] !== "lifetime-tight") continue;
        expect(r.message).not.toMatch(/Drop Radioisotope/);
        expect(r.message).toMatch(/lasts \d+ days|No part on offer lasts longer/i);
      }
    }
  });

  it("an approval suggests a payload that fits only when nothing blocks the launch", () => {
    const d = defaultDesign("orbital-lab", { leadId: "nasa", partnerIds: ["esa", "jaxa", "csa"] }, game);
    expect(councilReview(d, game).some((r) => r.message.includes("Room for"))).toBe(true);
    const blocked = councilReview({ ...d, launchVehicleId: "electron" }, game);
    expect(blocked.some((r) => r.message.includes("Room for"))).toBe(false);
  });
});

/**
 * The refusal card leads with `plain`: what is wrong and how far it is from passing, in one
 * sentence a first-time player understands. Without it the card only showed a verdict stamp.
 */
describe("plain-language refusals", () => {
  const coalition: Coalition = { leadId: "nasa", partnerIds: ["esa", "jaxa", "csa"] };

  it("names the energy still missing for the dark period", () => {
    const d = autoDesign("moon-base-zero", coalition, game);
    const storage = d.moduleIds.filter((id) => (game.modules.find((m) => m.id === id)?.storageWh ?? 0) > 0);
    expect(storage.length).toBeGreaterThan(0);
    const smallest = storage.sort((a, b) => (game.modules.find((m) => m.id === a)!.storageWh ?? 0) - (game.modules.find((m) => m.id === b)!.storageWh ?? 0))[0];
    const short = { ...d, moduleIds: d.moduleIds.filter((id) => id !== smallest) };
    const issues = validateDesign(short, game);
    expect(issues.map((i) => i.id)).toContain("battery-small");
    const power = readinessReview(short, game).find((v) => v.check === "power")!;
    expect(power.verdict).not.toBe("go");
    expect(power.plain).toMatch(/^Batteries (die|run short) in the dark: short by [\d,]+ Wh$/);
    // the number in the sentence is the real shortfall the validator found
    expect(power.plain).toContain(fmt(batteryShortWh(issues)));
  });

  it("every refusal leads with one short sentence, and a GO never carries a gap", () => {
    for (const partnerIds of COUNCILS) {
      for (const missionId of ["orbital-lab", "earth-guardian", "moon-base-zero"] as const) {
        const d = defaultDesign(missionId, { leadId: "nasa", partnerIds }, game);
        for (const design of variants(d)) {
          for (const v of readinessReview(design, game)) {
            expect(v.plain.length).toBeGreaterThan(0);
            expect(v.plain.length).toBeLessThanOrEqual(110);
            expect(v.plain[0]).toBe(v.plain[0].toUpperCase());
            expect(v.plain).not.toMatch(/[.:]$/);
            // the two lines the card shows carry the number that has to change; the objectives
            // seat names the goal instead, because a missing capability has no shortfall
            if (v.verdict !== "go" && v.check !== "objectives") expect(`${v.plain} ${v.numbers}`).toMatch(/\d/);
          }
        }
      }
    }
  });

  it("a fix the card applies really clears the seat that asked for it", () => {
    const d = defaultDesign("moon-base-zero", { leadId: "nasa", partnerIds: ["esa", "jaxa", "csa"] }, game);
    const votes = readinessReview(d, game);
    for (const v of votes) {
      if (!v.fix) continue;
      const after = readinessReview({ ...d, ...v.fix.patch }, game).find((x) => x.actorId === v.actorId)!;
      expect(RANK[after.verdict]).toBeGreaterThanOrEqual(RANK[v.verdict]);
      // "Show me where" needs a step to open
      expect(v.fix.goTo).toBeDefined();
    }
  });
});
