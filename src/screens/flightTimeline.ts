import type { FlightPhase, FlightPhaseId } from "@/engine/types";

/** Screen width of a phase: long phases are compressed so a 365-day mission still reads clearly. */
export const phaseWeight = (p: FlightPhase) => 2 + Math.sqrt(p.days);

export interface Timeline {
  phases: FlightPhase[];
  total: number;
  /** progress where each phase starts, 0 to 1 */
  starts: number[];
  /** game day where each phase starts */
  dayStarts: number[];
}

export function buildTimeline(phases: FlightPhase[]): Timeline {
  const total = phases.reduce((a, p) => a + phaseWeight(p), 0) || 1;
  const starts: number[] = [], dayStarts: number[] = [];
  let w = 0, d = 0;
  for (const p of phases) { starts.push(w / total); dayStarts.push(d); w += phaseWeight(p); d += p.days; }
  return { phases, total, starts, dayStarts };
}

export function phaseAt(t: Timeline, p: number): { index: number; frac: number } {
  let index = 0;
  for (let i = 0; i < t.phases.length; i++) if (p >= t.starts[i]) index = i;
  const span = phaseWeight(t.phases[index]) / t.total;
  return { index, frac: Math.min(1, Math.max(0, (p - t.starts[index]) / span)) };
}

export function dayAt(t: Timeline, p: number): number {
  const { index, frac } = phaseAt(t, p);
  return t.dayStarts[index] + frac * t.phases[index].days;
}

/** Progress at which the flight stops: the middle of the phase where the mission was lost, else 1. */
export function endProgress(t: Timeline, lostAt?: FlightPhaseId): number {
  if (!lostAt) return 1;
  const i = t.phases.findIndex((p) => p.id === lostAt);
  if (i < 0) return 1;
  return t.starts[i] + (phaseWeight(t.phases[i]) / t.total) * 0.6;
}

export type Outcome = "success" | "partial" | "lost";
