import type { FlightPhaseId, FlightResult } from "../engine/types";
import { gradeFor } from "../engine/score";
import { getScenario } from "./scenarios";
import type { OpsScore, OpsState } from "./types";
import { clamp, defOf, flag } from "./util";

const BEFORE_ARRIVAL: FlightPhaseId[] = ["launch", "ascent", "orbit-insertion", "transfer", "arrival"];

/** Operations need a spacecraft that arrived. */
export function canRunOps(flight: FlightResult): boolean {
  return !(flight.lostAt && BEFORE_ARRIVAL.includes(flight.lostAt));
}

export function opsScore(s: OpsState): OpsScore {
  const sc = getScenario(s.missionId);
  const dataGoal = s.goals.find((g) => g.kind === "main" && g.unit === "Gb");
  const returnFrac = dataGoal && dataGoal.target > 0 ? clamp(s.dataReturnedGb / dataGoal.target, 0, 1) : 0;
  const core = s.goals.filter((g) => g.kind !== "discovery");
  const coreTotal = core.reduce((a, g) => a + g.points, 0);
  const donePts = s.goals.filter((g) => g.done).reduce((a, g) => a + g.points, 0);
  const goalFrac = coreTotal > 0 ? clamp(donePts / coreTotal, 0, 1) : 0;
  const science = 100 * (0.5 * returnFrac + 0.35 * goalFrac + 0.15 * clamp(coreTotal > 0 ? s.science / coreTotal : 0, 0, 1));

  const real = s.structures.filter((st) => !defOf(sc, st.kind)?.traits.includes("overlay"));
  const avgHealth = real.length ? real.reduce((a, st) => a + st.health, 0) / real.length / 100 : 0;
  const dark = s.history.filter((h) => h.energyWh <= 0).length;
  const darkShare = s.history.length ? dark / s.history.length : 0;
  const resilience = 100 * (0.5 * avgHealth + 0.3 * (1 - darkShare) + 0.2 * (s.status === "lost" ? 0 : 1));

  const apUse = flag(s, "apTotal") > 0 ? flag(s, "apSpent") / flag(s, "apTotal") : 0;
  const energyUse = flag(s, "generatedWh") > 0 ? flag(s, "usedWh") / flag(s, "generatedWh") : 0;
  const lostShare = flag(s, "dataProduced") > 0 ? s.dataLostGb / flag(s, "dataProduced") : 0;
  const efficiency = 100 * (0.4 * clamp(apUse / 0.6, 0, 1) + 0.3 * clamp(energyUse / 0.5, 0, 1) + 0.3 * (1 - clamp(lostShare, 0, 1)));

  const raw = 0.5 * science + 0.3 * resilience + 0.2 * efficiency;
  const total = Math.round(s.status === "lost" ? raw * 0.5 : raw);
  return {
    science: Math.round(science),
    resilience: Math.round(resilience),
    efficiency: Math.round(efficiency),
    total,
    grade: gradeFor(total * 10),
  };
}

/** Both scores on the engine's 0 to 1000 scale: flight 40 percent, operations 60 percent. */
export function finalScore(flight: FlightResult, ops: OpsState | null): { total: number; grade: string; flight: number; ops: number } {
  const f = flight.score.total;
  if (!ops) return { total: f, grade: gradeFor(f), flight: f, ops: 0 };
  const o = opsScore(ops).total * 10;
  const total = Math.round(0.4 * f + 0.6 * o);
  return { total, grade: gradeFor(total), flight: f, ops: o };
}
