import { describe, expect, it } from "vitest";
import { catalog } from "@/data";
import { defaultDesign, readinessAllGo, readinessChanges, readinessReview, readinessSeats } from "./index";
import type { Coalition, Forecast, MissionDesign, MissionId } from "./types";

const COUNCILS: Record<MissionId, Coalition> = {
  "orbital-lab": { leadId: "nasa", partnerIds: ["esa", "jaxa", "csa"] },
  "earth-guardian": { leadId: "nasa", partnerIds: ["esa", "aee", "csa"] },
  "moon-base-zero": { leadId: "nasa", partnerIds: ["jaxa", "isro", "blue-origin"] },
};
const OTHER: Coalition["partnerIds"][] = [["isro", "aee", "iceye"], ["ula", "rocket-lab", "conae"], ["spacex", "airbus-defence-space", "northrop-grumman"]];

const design = (id: MissionId, coalition = COUNCILS[id]) => defaultDesign(id, coalition, catalog);
const risk = (successProbability: number): Forecast => ({ successProbability, expectedScore: 600, p10: 400, p90: 800, runs: 200 });
const apply = (d: MissionDesign, patch: object): MissionDesign => ({ ...d, ...patch });
/** The lunar lander with only the small battery: the night needs about five times what it stores. */
const shortNight = (): MissionDesign => ({ ...design("moon-base-zero"), moduleIds: ["mb-blue-ghost", "mb-li-ion", "mb-dte-xband", "mb-dust-plasma", "mb-rhu"], launchVehicleId: "falcon-9" });

describe("Go / No-Go seats", () => {
  it("the lead checks the objectives and the partners split the five engineering checks", () => {
    for (const partnerIds of [COUNCILS["moon-base-zero"].partnerIds, ...OTHER]) {
      const seats = readinessSeats({ leadId: "nasa", partnerIds }, catalog);
      expect(seats.map((s) => s.actorId)).toEqual(["nasa", ...partnerIds]);
      expect(seats[0].checks).toEqual(["objectives"]);
      expect(seats.slice(1).flatMap((s) => s.checks).sort()).toEqual(["budget", "comms", "mass", "power", "reliability"]);
      for (const s of seats.slice(1)) expect(s.checks.length).toBeGreaterThan(0);
    }
  });

  it("votes once per seat, lead first, and the same design always gets the same votes", () => {
    for (const id of Object.keys(COUNCILS) as MissionId[]) {
      const d = design(id);
      const votes = readinessReview(d, catalog, risk(0.8));
      expect(votes.map((v) => v.actorId)).toEqual([d.coalition.leadId, ...d.coalition.partnerIds]);
      expect(readinessReview(d, catalog, risk(0.8))).toEqual(votes);
      for (const v of votes) {
        expect(v.reason.length).toBeGreaterThan(0);
        expect(v.reason.length).toBeLessThanOrEqual(80);
        expect(v.numbers).toMatch(/\d/);
      }
    }
  });
});

describe("Go / No-Go verdicts", () => {
  it("a lander whose batteries cannot last the night is NO-GO, and its fix brings every seat to GO", () => {
    const d = shortNight();
    const votes = readinessReview(d, catalog);
    const power = votes.find((v) => v.check === "power")!;
    expect(power.verdict).toBe("no-go");
    expect(power.reason).toBe("Batteries die in the dark");
    expect(readinessAllGo(votes)).toBe(false);
    expect(power.fix).toBeDefined();
    const fixed = apply(d, power.fix!.patch);
    const after = readinessReview(fixed, catalog);
    expect(after.map((v) => v.verdict)).toEqual(["go", "go", "go", "go"]);
    expect(readinessAllGo(after)).toBe(true);
    const lines = readinessChanges(votes, after, catalog);
    expect(lines.some((l) => /: NO-GO to GO/.test(l))).toBe(true);
  });

  it("a design over the rocket's limit is NO-GO on mass and cannot be signed", () => {
    const d = { ...design("earth-guardian"), moduleIds: [...design("earth-guardian").moduleIds, "eg-lsar", "eg-msi"] };
    const votes = readinessReview(d, catalog);
    const mass = votes.find((v) => v.check === "mass")!;
    expect(mass.verdict).toBe("no-go");
    expect(readinessAllGo(votes)).toBe(false);
    expect(votes.find((v) => v.check === "reliability")!.verdict).toBe("no-go");
  });

  it("a thin margin is GO IF, with a fix that clears it and a barter the member accepts", () => {
    const d = design("earth-guardian");
    const votes = readinessReview(d, catalog, risk(0.8));
    const thin = votes.find((v) => v.verdict === "go-with-condition");
    expect(thin).toBeDefined();
    expect(thin!.fix).toBeDefined();
    const fixed = readinessReview(apply(d, thin!.fix!.patch), catalog, risk(0.8));
    expect(fixed.find((v) => v.actorId === thin!.actorId)!.verdict).toBe("go");
    if (thin!.concession) {
      const traded = readinessReview(apply(d, thin!.concession.patch), catalog, risk(0.8));
      const seat = traded.find((v) => v.actorId === thin!.actorId)!;
      expect(seat.verdict).toBe("go");
      expect(seat.acceptedFor).toBeTruthy();
      expect(traded.every((v) => v.verdict !== "no-go")).toBe(true);
    }
  });

  it("the risk assessment decides the reliability seat: NO-GO under 50%, GO IF under 70%, GO above", () => {
    const d = design("orbital-lab");
    const owner = readinessSeats(d.coalition, catalog).find((s) => s.checks.includes("reliability"))!.actorId;
    const verdict = (p: number) => readinessReview(d, catalog, risk(p)).find((v) => v.actorId === owner)!;
    expect(verdict(0.4).verdict).toBe("no-go");
    expect(verdict(0.4).check).toBe("reliability");
    expect(verdict(0.8).verdict).toBe("go");
    const mid = verdict(0.6);
    expect(mid.verdict === "go-with-condition" || /^Accepted/i.test(mid.reason) || /accepted/.test(mid.reason)).toBe(true);
  });

  it("no fix in the review makes another seat NO-GO", () => {
    const designs = [shortNight(), design("earth-guardian"), ...OTHER.map((partnerIds) => design("earth-guardian", { leadId: "isro", partnerIds }))];
    for (const d of designs) {
      const votes = readinessReview(d, catalog);
      for (const v of votes.filter((x) => x.fix)) {
        const after = readinessReview(apply(d, v.fix!.patch), catalog);
        const newNoGo = after.filter((a) => a.verdict === "no-go" && votes.find((b) => b.actorId === a.actorId)?.verdict !== "no-go");
        expect(newNoGo, `${v.actorId}: ${v.fix!.label}`).toEqual([]);
      }
    }
  });

  it("explains a change with the number that moved", () => {
    const d = design("earth-guardian");
    const before = readinessReview(d, catalog, risk(0.8));
    const thin = before.find((v) => v.verdict === "go-with-condition" && v.check === "mass");
    if (!thin?.fix) return;
    const after = readinessReview(apply(d, thin.fix.patch), catalog, risk(0.8));
    expect(readinessChanges(before, after, catalog)).toContainEqual(expect.stringMatching(/^ESA: GO IF to GO, mass margin rose from 0% to \d+%$/));
  });
});
