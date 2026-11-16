import {
  TIGHT_RATIO,
  type Catalog,
  type MissionDesign,
  type MissionId,
  type Modifier,
  type Module,
  type ResourceGauge,
  type ResourceKey,
  type ResourceLine,
  type ResourceReport,
  type ResourceStatus,
} from "./types";
import { resolveDesign, type ResolvedDesign } from "./design";
import { applyStat, effectiveModifiers, fittedBlueprints } from "./modifiers";

const scope = (m: Module, missionId: MissionId) => ({ category: m.category, missionId });

export const moduleMassKg = (m: Module, mods: Modifier[], mid: MissionId) =>
  applyStat(m.massKg, "moduleMass", mods, scope(m, mid));
export const modulePowerW = (m: Module, mods: Modifier[], mid: MissionId) =>
  applyStat(m.powerW, "modulePower", mods, scope(m, mid));
export const moduleCostMUsd = (m: Module, mods: Modifier[], mid: MissionId) =>
  applyStat(m.costMUsd, "moduleCost", mods, scope(m, mid));
/** generated W before the sunlight share */
export const moduleGeneratesW = (m: Module, mods: Modifier[], mid: MissionId) =>
  applyStat(m.generatesW ?? 0, "powerGeneration", mods, scope(m, mid));
export const moduleDownlinkGb = (m: Module, mods: Modifier[], mid: MissionId) =>
  applyStat(m.downlinkGbPerDay ?? 0, "downlinkRate", mods, scope(m, mid));

/**
 * On-board screening (modules with negative dataGbPerDay) can drop at most this share of the raw data.
 * A cloud screener only removes cloudy images, and about 67% of Earth is cloud-covered at any time
 * (NASA Earth Observatory, "Cloudy Earth": https://science.nasa.gov/earth/earth-observatory/cloudy-earth-85843/).
 */
export const MAX_ONBOARD_CUT = 0.67;

/** Share of the raw data that still has to reach Earth after on-board screening; 0 when nothing is produced. */
export function onboardKeep(grossGb: number, cutGb: number): number {
  if (grossGb <= 0) return 0;
  return (grossGb - Math.min(Math.max(0, cutGb), MAX_ONBOARD_CUT * grossGb)) / grossGb;
}

export function effectiveLinkFraction(r: ResolvedDesign): number {
  const bonus = r.modules.reduce((s, m) => s + (m.category === "comms" ? (m.linkFractionBonus ?? 0) : 0), 0);
  return Math.min(1, (r.destination?.earthLinkFraction ?? 0) + bonus);
}

export function statusOf(used: number, capacity: number): ResourceStatus {
  if (used > capacity + 1e-9) return "over";
  if (capacity > 0 && used / capacity > TIGHT_RATIO) return "tight";
  return "ok";
}

function gauge(
  key: ResourceKey,
  used: number,
  capacity: number,
  usedBy: ResourceLine[],
  providedBy: ResourceLine[],
): ResourceGauge {
  return { key, used, capacity, status: statusOf(used, capacity), usedBy, providedBy };
}

/**
 * Payload mass the rocket delivers to the destination, after the carrier's own mass and within its
 * payload limit, with the lines that explain it. Below zero when the carrier alone is too heavy.
 */
function deliverableKg(r: ResolvedDesign, mods: Modifier[], mid: MissionId): { kg: number; lines: ResourceLine[] } {
  const { vehicle, destination, carrier } = r;
  if (!vehicle || !destination) return { kg: 0, lines: [] };
  const base = vehicle.capacityKg[destination.orbitClass] ?? 0;
  const rocketCap = applyStat(base * destination.capacityFactor, "launchCapacity", mods, { missionId: mid });
  const lines: ResourceLine[] = [{ label: `${vehicle.name} to ${destination.orbitClass}`, amount: rocketCap }];
  if (!carrier) return { kg: rocketCap, lines };
  const carrierMass = moduleMassKg(carrier, mods, mid);
  lines.push({ label: `minus ${carrier.name} (carrier mass)`, amount: -carrierMass });
  lines.push({ label: `${carrier.name} payload limit (the smaller limit applies)`, amount: carrier.payloadCapacityKg ?? 0 });
  return { kg: Math.min(carrier.payloadCapacityKg ?? 0, rocketCap - carrierMass), lines };
}

/**
 * Kilograms the design is over what its rocket delivers, 0 when it fits. The mass gauge stops its
 * capacity at zero; this also counts a carrier heavier than the rocket can lift.
 */
export function massOverKg(design: MissionDesign, catalog: Catalog): number {
  const room = deliverableKg(resolveDesign(design, catalog), effectiveModifiers(design, catalog), design.missionId).kg;
  const over = computeResources(design, catalog).mass.used - room;
  return over > 1e-9 ? over : 0;
}

export function computeResources(design: MissionDesign, catalog: Catalog): ResourceReport {
  const r = resolveDesign(design, catalog);
  const mods = effectiveModifiers(design, catalog);
  const mid = design.missionId;
  const { mission, vehicle, destination, modules, carrier, payload, rideshares, members } = r;
  const sunlight = destination?.sunlightFraction ?? 1;
  // adopting an open design costs its integration hardware, power and work (only when it fits)
  const fitted = fittedBlueprints(design, catalog);
  const integration = (key: "massKg" | "powerW" | "costMUsd"): ResourceLine[] =>
    fitted
      .filter((b) => (b.integration?.[key] ?? 0) > 0)
      .map((b) => ({ label: `Integrating ${b.name} (open tech)`, amount: b.integration?.[key] ?? 0 }));

  // mass
  const massUsedBy: ResourceLine[] = [
    ...payload.map((m) => ({ label: m.name, amount: moduleMassKg(m, mods, mid) })),
    ...rideshares.map((o) => ({ label: `${o.payloadName} (rideshare)`, amount: o.massKg })),
    ...integration("massKg"),
  ];
  const massUsed = massUsedBy.reduce((s, l) => s + l.amount, 0);
  const deliverable = deliverableKg(r, mods, mid);
  const massProvided = deliverable.lines;
  const massCap = Math.max(0, deliverable.kg);

  // power
  const powerProvided: ResourceLine[] = modules
    .filter((m) => (m.generatesW ?? 0) > 0)
    .map((m) => ({
      label: m.name,
      amount: moduleGeneratesW(m, mods, mid) * (m.sunlightIndependent ? 1 : sunlight),
    }));
  const powerUsedBy: ResourceLine[] = [
    ...modules.map((m) => ({ label: m.name, amount: modulePowerW(m, mods, mid) })),
    ...rideshares.map((o) => ({ label: `${o.payloadName} (rideshare)`, amount: o.powerW })),
    ...integration("powerW"),
  ].filter((l) => l.amount > 0);

  // budget
  const treasuryLines: ResourceLine[] = [
    { label: `${mission.name} base treasury`, amount: mission.baseTreasuryMUsd },
    ...members.map((a) => ({ label: `${a.shortName} contribution`, amount: a.contributionMUsd })),
    ...rideshares.map((o) => ({ label: `${o.payloadName} pays`, amount: o.paysMUsd })),
  ];
  const rawTreasury = treasuryLines.reduce((s, l) => s + l.amount, 0);
  const treasury = applyStat(rawTreasury, "treasury", mods, { missionId: mid });
  const budgetUsedBy: ResourceLine[] = [
    ...(vehicle
      ? [{ label: vehicle.name, amount: applyStat(vehicle.costMUsd, "launchCost", mods, { missionId: mid }) }]
      : []),
    ...modules.map((m) => ({ label: m.name, amount: moduleCostMUsd(m, mods, mid) })),
    ...integration("costMUsd"),
  ];

  // data and comms
  const link = effectiveLinkFraction(r);
  const dataLines: ResourceLine[] = [
    ...modules.map((m) => ({ label: m.name, amount: m.dataGbPerDay ?? 0 })),
    ...rideshares.map((o) => ({ label: `${o.payloadName} (rideshare)`, amount: o.dataGbPerDay })),
  ];
  const grossGb = dataLines.reduce((s, l) => s + Math.max(0, l.amount), 0);
  const cutGb = dataLines.reduce((s, l) => s + Math.max(0, -l.amount), 0);
  const appliedCut = grossGb * (1 - onboardKeep(grossGb, cutGb));
  // screening lines show the cut that applies, shared in proportion when it is capped
  const dataUsedBy = dataLines
    .map((l) => (l.amount < 0 ? { ...l, amount: -appliedCut * (-l.amount / cutGb) } : l))
    .filter((l) => l.amount !== 0);
  const dataProvided: ResourceLine[] = modules
    .filter((m) => (m.downlinkGbPerDay ?? 0) > 0)
    .map((m) => ({ label: m.name, amount: moduleDownlinkGb(m, mods, mid) * link }));
  const commsProvided: ResourceLine[] = [
    { label: "Ground station visibility", amount: destination?.earthLinkFraction ?? 0 },
    ...modules
      .filter((m) => m.category === "comms" && (m.linkFractionBonus ?? 0) > 0)
      .map((m) => ({ label: m.name, amount: m.linkFractionBonus ?? 0 })),
  ];

  // lifetime
  const extenders = modules.filter(
    (m) => (m.category === "thermal" || m.category === "battery") && m.lifetimeDays !== undefined,
  );
  const baseLife = carrier?.lifetimeDays ?? mission.durationDays * 1.5;
  const lifeLines: ResourceLine[] = [
    carrier?.lifetimeDays !== undefined
      ? { label: `${carrier.name} (carrier design life)`, amount: carrier.lifetimeDays }
      : { label: "Default design life (1.5 x mission)", amount: mission.durationDays * 1.5 },
    ...extenders.map((m) => ({ label: `${m.name} (night survival)`, amount: m.lifetimeDays ?? 0 })),
  ];
  const lifetimeCap = applyStat(
    Math.max(baseLife, ...extenders.map((m) => m.lifetimeDays ?? 0)),
    "lifetime",
    mods,
    { missionId: mid },
  );

  const sum = (ls: ResourceLine[]) => ls.reduce((s, l) => s + l.amount, 0);
  return {
    mass: gauge("mass", massUsed, massCap, massUsedBy, massProvided),
    power: gauge("power", sum(powerUsedBy), sum(powerProvided), powerUsedBy, powerProvided),
    budget: gauge("budget", sum(budgetUsedBy), treasury, budgetUsedBy, treasuryLines),
    data: gauge("data", Math.max(0, sum(dataUsedBy)), sum(dataProvided), dataUsedBy, dataProvided),
    comms: gauge(
      "comms",
      mission.requiredLinkFraction,
      link,
      [{ label: "Required link coverage", amount: mission.requiredLinkFraction }],
      commsProvided,
    ),
    lifetime: gauge(
      "lifetime",
      mission.durationDays,
      lifetimeCap,
      [{ label: "Mission duration", amount: mission.durationDays }],
      lifeLines,
    ),
  };
}
