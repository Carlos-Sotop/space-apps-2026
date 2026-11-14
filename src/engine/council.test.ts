import { describe, expect, it } from "vitest";
import { catalog as game } from "@/data";
import { catalog, orbitalDesign } from "./fixtures";
import { computeResources, councilReview, defaultDesign, designMoves, validateDesign } from "./index";
import type { Coalition, MissionDesign } from "./types";

const COUNCILS: Coalition["partnerIds"][] = [
  ["esa", "jaxa", "csa"],
  ["northrop-grumman", "airbus-defence-space", "spacex"],
  ["isro", "aee", "iceye"],
  ["ula", "rocket-lab", "conae"],
];

const FIX = /\b(Add|Drop|Swap to|Launch on|No part on offer|Pick|Choose|Deselect|Room for)\b|stays in reserve/;

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
  it("every line names a number, offers one fix and stays one short line", () => {
    for (const m of game.missions)
      for (const partnerIds of COUNCILS)
        for (const d of variants(defaultDesign(m.id, { leadId: "nasa", partnerIds }, game)))
          for (const r of councilReview(d, game)) {
            const where = `${m.id} ${r.actorId}: ${r.message}`;
            expect(r.message, where).toMatch(/\d/);
            expect(r.message, where).not.toMatch(/undefined|NaN|\n/);
            expect(r.message.length, where).toBeLessThanOrEqual(140);
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

  it("members who share a domain raise different issues or offer different fixes", () => {
    for (const partnerIds of COUNCILS) {
      const d = defaultDesign("moon-base-zero", { leadId: "nasa", partnerIds }, game);
      const lines = councilReview(d, game).filter((r) => r.verdict !== "approve");
      const fixes = lines.map((r) => r.message.slice(r.message.indexOf(". ") + 2));
      expect(new Set(fixes).size, fixes.join(" | ")).toBe(fixes.length);
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
