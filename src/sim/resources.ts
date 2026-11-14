import type { Budget, Catalog, Lander, Manifest, Payload, ResourceUse, Rocket, Site } from "../types";

export interface Resolved {
  rocket: Rocket;
  lander: Lander;
  site: Site;
  payloads: Payload[];
}

/** Looks up every id in the manifest. Throws on an unknown id. */
export function resolve(manifest: Manifest, catalog: Catalog): Resolved {
  const lander = catalog.landers.find((l) => l.id === manifest.landerId);
  if (!lander) throw new Error(`Unknown lander: ${manifest.landerId}`);
  const rocket = catalog.rockets.find((r) => r.id === lander.rocketId);
  if (!rocket) throw new Error(`Unknown rocket: ${lander.rocketId}`);
  const site = catalog.sites.find((s) => s.id === manifest.siteId);
  if (!site) throw new Error(`Unknown site: ${manifest.siteId}`);
  const payloads = manifest.payloadIds.map((id) => {
    const payload = catalog.payloads.find((p) => p.id === id);
    if (!payload) throw new Error(`Unknown payload: ${id}`);
    return payload;
  });
  return { rocket, lander, site, payloads };
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/**
 * What the manifest uses against the lander's limits.
 * Cost is the flight's price against the team's money plus what customers pay.
 */
export function resourceUse(manifest: Manifest, catalog: Catalog, budget: Budget): ResourceUse {
  const { lander, payloads } = resolve(manifest, catalog);
  return {
    massKg: { used: sum(payloads.map((p) => p.massKg)), limit: lander.payloadMassKg },
    powerW: { used: sum(payloads.map((p) => p.powerW)), limit: lander.payloadPowerW },
    heatW: { used: sum(payloads.map((p) => p.heatW)), limit: lander.heatRejectionW },
    dataMbPerDay: { used: sum(payloads.map((p) => p.dataMbPerDay)), limit: lander.downlinkMbPerDay },
    costUsd: { used: lander.missionCostUsd, limit: budget.startUsd + sum(payloads.map((p) => p.paysUsd)) },
  };
}
