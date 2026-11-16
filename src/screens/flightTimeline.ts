import type { FlightPhase, FlightPhaseId } from "@/engine/types";

/**
 * Share of the whole flight each zero-day phase (launch, ascent, orbit insertion) gets. The climb to
 * orbit is the hero shot, so it plays at the same pace on every mission: 3 x 0.1 of a 24 s flight is
 * about 7 s from ignition to orbit at 1x.
 */
export const CLIMB_SHARE = 0.1;

/** Screen width of a phase with days: long phases are compressed so a 365-day mission still reads clearly. */
export const phaseWeight = (p: FlightPhase) => 2 + Math.sqrt(p.days);

export interface Timeline {
  phases: FlightPhase[];
  /** progress where each phase starts, 0 to 1 */
  starts: number[];
  /** share of the progress each phase spans; they add up to 1 */
  spans: number[];
  /** game day where each phase starts */
  dayStarts: number[];
}

export function buildTimeline(phases: FlightPhase[]): Timeline {
  const zero = phases.filter((p) => p.days === 0).length;
  const rest = phases.reduce((a, p) => a + (p.days > 0 ? phaseWeight(p) : 0), 0);
  const climb = rest > 0 ? Math.min(0.6, zero * CLIMB_SHARE) : 1;
  const spans = phases.map((p) => (p.days > 0 ? ((1 - climb) * phaseWeight(p)) / rest : climb / zero));
  const starts: number[] = [], dayStarts: number[] = [];
  let w = 0, d = 0;
  phases.forEach((p, i) => { starts.push(w); dayStarts.push(d); w += spans[i]; d += p.days; });
  return { phases, starts, spans, dayStarts };
}

export function phaseAt(t: Timeline, p: number): { index: number; frac: number } {
  let index = 0;
  for (let i = 0; i < t.phases.length; i++) if (p >= t.starts[i]) index = i;
  const span = t.spans[index] || 1;
  return { index, frac: Math.min(1, Math.max(0, (p - (t.starts[index] ?? 0)) / span)) };
}

export function dayAt(t: Timeline, p: number): number {
  const { index, frac } = phaseAt(t, p);
  return (t.dayStarts[index] ?? 0) + frac * (t.phases[index]?.days ?? 0);
}

/** Progress at which the flight stops: 60% into the phase where the mission was lost, else 1. */
export function endProgress(t: Timeline, lostAt?: FlightPhaseId): number {
  if (!lostAt) return 1;
  const i = t.phases.findIndex((p) => p.id === lostAt);
  if (i < 0) return 1;
  return t.starts[i] + t.spans[i] * 0.6;
}

export type Outcome = "success" | "partial" | "lost";
