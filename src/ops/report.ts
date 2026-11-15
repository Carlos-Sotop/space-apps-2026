// Turn reports (Sunday sprint contract). Every advance stores `lastReport`; projectTurn previews the
// turn about to be played with the same rules, so the UI can show income per turn before the player commits.
import { previewState } from "./core";
import { getScenario } from "./scenarios";
import { DAYS_PER_TURN, type OpsCtx, type OpsState, type OpsTurnReport } from "./types";
import { warningsFor } from "./warnings";

/**
 * Preview of the turn about to be played, with no random events ("+12 science, -3 kWh"): its deltas and
 * effects, plus the warnings for the turns ahead. A waiting event card is set aside and an unanswered storm
 * is sheltered. Once operations are over, an empty report.
 */
export function projectTurn(state: OpsState, ctx: OpsCtx): OpsTurnReport {
  const empty: OpsTurnReport = {
    turn: state.turn,
    fromDay: (state.turn - 1) * DAYS_PER_TURN,
    toDay: state.turn * DAYS_PER_TURN,
    delta: { energyWh: 0, waterKg: 0, dataStoredGb: 0, dataReturnedGb: 0, sciencePoints: 0 },
    effects: [],
    warnings: [],
  };
  if (state.status !== "running") return empty;
  const next = previewState(state, ctx);
  const report = next.lastReport ?? empty;
  return { ...report, warnings: warningsFor(state, getScenario(state.missionId), ctx, (x) => previewState(x, ctx)) };
}
