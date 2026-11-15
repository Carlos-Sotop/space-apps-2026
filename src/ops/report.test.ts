import { describe, expect, it } from "vitest";
import { catalog } from "../data";
import { orbitalDesign } from "../engine/fixtures";
import { DAYS_PER_TURN, projectTurn, type OpsState } from "./index";

describe("projectTurn (C0 stub)", () => {
  it("previews the turn about to be played with no effects yet", () => {
    const report = projectTurn({ turn: 4 } as OpsState, { design: orbitalDesign(), catalog });
    expect(report).toEqual({
      turn: 4,
      fromDay: 3 * DAYS_PER_TURN,
      toDay: 4 * DAYS_PER_TURN,
      delta: { energyWh: 0, waterKg: 0, dataStoredGb: 0, dataReturnedGb: 0, sciencePoints: 0 },
      effects: [],
      warnings: [],
    });
  });
});
