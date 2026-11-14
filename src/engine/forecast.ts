import type { Catalog, Forecast, LiveContext, MissionDesign } from "./types";
import { simulateFlight } from "./simulate";

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * p;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  const a = sorted[lo] ?? 0;
  const b = sorted[hi] ?? a;
  return a + (b - a) * (pos - lo);
}

export function forecast(design: MissionDesign, catalog: Catalog, runs = 200, live?: LiveContext): Forecast {
  const totals: number[] = [];
  let wins = 0;
  for (let seed = 1; seed <= runs; seed++) {
    const f = simulateFlight(design, catalog, seed, live);
    if (f.success) wins++;
    totals.push(f.score.total);
  }
  totals.sort((a, b) => a - b);
  const mean = totals.length ? totals.reduce((s, x) => s + x, 0) / totals.length : 0;
  return {
    successProbability: runs > 0 ? wins / runs : 0,
    expectedScore: mean,
    p10: percentile(totals, 0.1),
    p90: percentile(totals, 0.9),
    runs,
  };
}
