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
import { applyStat, effectiveModifiers } from "./modifiers";

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

export function computeResources(design: MissionDesign, catalog: Catalog): ResourceReport {
  const r = resolveDesign(design, catalog);
  const mods = effectiveModifiers(design, catalog);
  const mid = design.missionId;
  const { mission, vehicle, destination, modules, carrier, payload, rideshares, members } = r;
  const sunlight = destination?.sunlightFraction ?? 1;

  // mass
  const massUsedBy: ResourceLine[] = [
    ...payload.map((m) => ({ label: m.name, amount: moduleMassKg(m, mods, mid) })),
    ...rideshares.map((o) => ({ label: `${o.payloadName} (rideshare)`, amount: o.massKg })),
  ];
  const massUsed = massUsedBy.reduce((s, l) => s + l.amount, 0);
  const massProvided: ResourceLine[] = [];
  let massCap = 0;
  if (vehicle && destination) {
    const base = vehicle.capacityKg[destination.orbitClass] ?? 0;
    const rocketCap = applyStat(base * destination.capacityFactor, "launchCapacity", mods, { missionId: mid });
    massProvided.push({ label: `${vehicle.name} to ${destination.orbitClass}`, amount: rocketCap });
    massCap = rocketCap;
    if (carrier) {
      const carrierMass = moduleMassKg(carrier, mods, mid);
      massProvided.push({ label: `minus ${carrier.name} (carrier mass)`, amount: -carrierMass });
      massProvided.push({
        label: `${carrier.name} payload limit (the smaller limit applies)`,
        amount: carrier.payloadCapacityKg ?? 0,
      });
      massCap = Math.min(carrier.payloadCapacityKg ?? 0, rocketCap - carrierMass);
    }
    massCap = Math.max(0, massCap);
  }

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
  ];

  // data and comms
  const link = effectiveLinkFraction(r);
  const dataUsedBy: ResourceLine[] = [
    ...modules.map((m) => ({ label: m.name, amount: m.dataGbPerDay ?? 0 })),
    ...rideshares.map((o) => ({ label: `${o.payloadName} (rideshare)`, amount: o.dataGbPerDay })),
  ].filter((l) => l.amount !== 0);
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
