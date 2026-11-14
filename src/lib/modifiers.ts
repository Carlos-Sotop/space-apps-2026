import type { Modifier, StatKey } from "@/engine/types";

const STAT: Record<StatKey, { label: string; unit: string }> = {
  launchCost: { label: "launch cost", unit: "$M" },
  launchCapacity: { label: "launch capacity", unit: "kg" },
  launchReliability: { label: "launch reliability", unit: "" },
  moduleMass: { label: "module mass", unit: "kg" },
  moduleCost: { label: "module cost", unit: "$M" },
  modulePower: { label: "module power", unit: "W" },
  powerGeneration: { label: "power generation", unit: "W" },
  downlinkRate: { label: "downlink rate", unit: "Gb/day" },
  scienceValue: { label: "science value", unit: "pts" },
  landingReliability: { label: "landing reliability", unit: "" },
  lifetime: { label: "lifetime", unit: "d" },
  treasury: { label: "treasury", unit: "$M" },
};

/** "-12% module mass", "+0.05 landing reliability" */
export function describeModifier(m: Modifier): string {
  const s = STAT[m.stat];
  if (m.op === "mul") {
    const pct = Math.round((m.value - 1) * 1000) / 10;
    return `${pct >= 0 ? "+" : "-"}${Math.abs(pct)}% ${s.label}`;
  }
  const v = Math.abs(m.value) < 1 ? `${m.value >= 0 ? "+" : "-"}${Math.abs(Math.round(m.value * 100))}%` : `${m.value >= 0 ? "+" : ""}${m.value} ${s.unit}`;
  return `${v} ${s.label}`;
}

export const describeModifiers = (ms: Modifier[]) => ms.map(describeModifier).join(", ");
