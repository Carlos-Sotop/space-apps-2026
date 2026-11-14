import type { Budget, Catalog, FlightEvent, FlightResult, Manifest } from "../types";
import { pct, round1, usd } from "../lib/format";
import { makeRng } from "./rng";
import { resolve, resourceUse } from "./resources";

/** Points per paying customer delivered, and per $100,000 left at the end. Tune these. */
export const SCORE_WEIGHTS = { perCustomer: 10, perHundredThousandUsd: 1 };

/**
 * Flies one mission: launch, landing, one lunar day of work, then night.
 * Pure: the same manifest, catalog, budget and seed always give the same result.
 */
export function simulate(manifest: Manifest, catalog: Catalog, budget: Budget, seed: number): FlightResult {
  const rng = makeRng(seed);
  const { rocket, lander, site, payloads } = resolve(manifest, catalog);
  const use = resourceUse(manifest, catalog, budget);
  const events: FlightEvent[] = [];
  const revenue = payloads.reduce((a, p) => a + p.paysUsd, 0);
  const moneyLeftUsd = budget.startUsd + revenue - lander.missionCostUsd;
  const returned: Record<string, number> = Object.fromEntries(payloads.map((p) => [p.id, 0]));

  const finish = (ok: boolean, science: number, customersServed: number): FlightResult => {
    const total =
      science +
      customersServed * SCORE_WEIGHTS.perCustomer +
      (moneyLeftUsd / 100_000) * SCORE_WEIGHTS.perHundredThousandUsd;
    const dataReturnedMb = Object.fromEntries(Object.entries(returned).map(([id, mb]) => [id, round1(mb)]));
    return {
      ok,
      events,
      dataReturnedMb,
      score: { science: round1(science), customersServed, moneyLeftUsd, total: round1(total) },
    };
  };

  if (use.massKg.used > use.massKg.limit) {
    events.push({
      day: 0,
      phase: "launch",
      kind: "failure",
      text: `The payloads weigh ${round1(use.massKg.used)} kg and ${lander.name} carries ${use.massKg.limit} kg. The mission can't fly.`,
    });
    return finish(false, 0, 0);
  }
  if (use.costUsd.used > use.costUsd.limit) {
    events.push({
      day: 0,
      phase: "launch",
      kind: "failure",
      text: `The flight costs ${usd(use.costUsd.used)} and the team has ${usd(use.costUsd.limit)}. The mission can't fly.`,
    });
    return finish(false, 0, 0);
  }

  if (rng() >= rocket.launchSuccess) {
    events.push({ day: 0, phase: "launch", kind: "failure", text: `${rocket.name} failed during launch.` });
    return finish(false, 0, 0);
  }
  events.push({ day: 0, phase: "launch", kind: "success", text: `${rocket.name} sent ${lander.name} toward the Moon.` });

  if (rng() >= lander.landingSuccess * site.landingFactor) {
    events.push({ day: 0, phase: "landing", kind: "failure", text: `${lander.name} did not land upright at ${site.name}.` });
    return finish(false, 0, 0);
  }
  events.push({ day: 1, phase: "landing", kind: "success", text: `${lander.name} landed at ${site.name}.` });

  const powerShare = use.powerW.used > 0 ? Math.min(1, use.powerW.limit / use.powerW.used) : 1;
  const heatShare = use.heatW.used > 0 ? Math.min(1, use.heatW.limit / use.heatW.used) : 1;
  const runShare = Math.min(powerShare, heatShare);
  if (powerShare < 1) {
    events.push({
      day: 1,
      phase: "surface",
      kind: "warning",
      text: `The payloads need ${round1(use.powerW.used)} W and get ${use.powerW.limit} W, so they run ${pct(powerShare)} of the time.`,
    });
  }
  if (heatShare < 1) {
    events.push({
      day: 1,
      phase: "surface",
      kind: "warning",
      text: `The payloads give off ${round1(use.heatW.used)} W of heat and the lander sheds ${use.heatW.limit} W, so they run ${pct(heatShare)} of the time.`,
    });
  }

  const queued: Record<string, number> = Object.fromEntries(payloads.map((p) => [p.id, 0]));
  const days = Math.max(0, Math.floor(site.sunlitDays));
  let daysWithoutEarth = 0;
  for (let day = 1; day <= days; day++) {
    for (const p of payloads) queued[p.id] += p.dataMbPerDay * runShare;
    if (rng() >= site.earthVisibleFraction) {
      daysWithoutEarth++;
      continue;
    }
    const waiting = Object.values(queued).reduce((a, b) => a + b, 0);
    if (waiting === 0) continue;
    const sent = Math.min(waiting, lander.downlinkMbPerDay);
    for (const p of payloads) {
      const part = (queued[p.id] / waiting) * sent;
      queued[p.id] -= part;
      returned[p.id] += part;
    }
  }
  if (daysWithoutEarth > 0) {
    events.push({
      day: days,
      phase: "surface",
      kind: "warning",
      text: `Earth was below the horizon on ${daysWithoutEarth} of ${days} days, so data waited on board.`,
    });
  }

  events.push(
    lander.survivesNight
      ? { day: days + 1, phase: "night", kind: "info", text: `${lander.name} is built to survive the night. Night work is not simulated yet.` }
      : { day: days + 1, phase: "night", kind: "info", text: `Night fell at ${site.name} and ${lander.name} shut down for good.` },
  );

  let science = 0;
  for (const p of payloads) {
    const full = p.dataMbPerDay * days;
    const share = full > 0 ? Math.min(1, returned[p.id] / full) : 1;
    science += p.scienceValue * site.scienceFactor * share;
  }
  const lost = Object.values(queued).reduce((a, b) => a + b, 0);
  if (lost > 0.05) {
    events.push({ day: days + 1, phase: "end", kind: "warning", text: `${round1(lost)} MB never reached Earth.` });
  }
  events.push({ day: days + 1, phase: "end", kind: "success", text: "Mission over." });

  const customersServed = payloads.filter((p) => p.paysUsd > 0).length;
  return finish(true, science, customersServed);
}
