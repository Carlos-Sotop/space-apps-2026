// Turn reports (Sunday sprint contract, C0). C4 makes every advance store `lastReport` and fills projectTurn in.
import { DAYS_PER_TURN, type OpsCtx, type OpsState, type OpsTurnReport } from "./types";

/**
 * Preview of the turn about to be played, with no random events: what the UI shows as income per turn
 * ("+12 science, -3 kWh"). C0 stub: zero deltas, no effects and no warnings.
 */
export function projectTurn(state: OpsState, _ctx: OpsCtx): OpsTurnReport {
  return {
    turn: state.turn,
    fromDay: (state.turn - 1) * DAYS_PER_TURN,
    toDay: state.turn * DAYS_PER_TURN,
    delta: { energyWh: 0, waterKg: 0, dataStoredGb: 0, dataReturnedGb: 0, sciencePoints: 0 },
    effects: [],
    warnings: [],
  };
}
