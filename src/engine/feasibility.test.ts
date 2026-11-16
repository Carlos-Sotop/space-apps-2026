// Moon Base Zero must stay solvable, and when a design cannot close the night, the fix must name the real exit.
// Night math: dark hours = (1 - sunlight) x 708 h. All Moon storage together is 40,000 + 3,000 Wh, so the ridge
// (88% sun, 85 h) carries up to ~506 W, de Gerlache (75%, 177 h) ~243 W and Malapert (58%, 297 h) ~145 W.
import { describe, expect, it } from "vitest";
import { catalog } from "@/data";
import { autoDesign, readinessAllGo, readinessReview, validateDesign } from "./index";
import type { Coalition, MissionDesign } from "./types";

const NASA: Coalition = { leadId: "nasa", partnerIds: ["jaxa", "isro", "blue-origin"] };
// a real playtest team: its budget is 398 $M against NASA's 623 $M
const PLAYTEST: Coalition = { leadId: "aeb", partnerIds: ["bizu-space", "ispace", "axiom"] };
const base = autoDesign("moon-base-zero", NASA, catalog);
const moon = (patch: Partial<MissionDesign>): MissionDesign => ({ ...base, secondaryObjectiveIds: [], blueprintIds: [], rideshareIds: [], ...patch });
const battery = (d: MissionDesign) => validateDesign(d, catalog).find((i) => i.id === "battery-small");

describe("Moon Base Zero: every night has an exit", () => {
  it("a smaller-budget team closes the mission at the ridge with the fuel cell and rideshare income", () => {
    const d = moon({
      coalition: PLAYTEST,
      destinationId: "mb-connecting-ridge",
      moduleIds: ["mb-blue-moon", "mb-rfc", "mb-li-ion", "mb-dust-plasma", "mb-dte-xband"],
      rideshareIds: ["mb-rs-kasa", "mb-rs-tua", "mb-rs-nssa"],
    });
    expect(validateDesign(d, catalog)).toEqual([]);
    expect(readinessAllGo(readinessReview(d, catalog))).toBe(true);
  });

  it("when no battery on offer can carry the night, the fix says so and points at the sunniest site", () => {
    const d = moon({ destinationId: "mb-malapert", moduleIds: ["mb-blue-moon", "mb-rfc", "mb-li-ion", "mb-dust-plasma", "mb-regolith-science", "mb-dte-xband"] });
    const issue = battery(d);
    expect(issue?.fix).toMatch(/No battery on offer can carry this night/);
    expect(issue?.fix).toMatch(/Shackleton connecting ridge/);
  });

  it("when a bigger store exists, the fix names it", () => {
    const d = moon({ destinationId: "mb-connecting-ridge", moduleIds: ["mb-blue-moon", "mb-li-ion", "mb-dust-plasma", "mb-dte-xband"] });
    expect(battery(d)?.fix).toMatch(/Regenerative fuel cell/);
  });
});
