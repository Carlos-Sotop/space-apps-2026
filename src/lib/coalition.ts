import { catalog } from "@/data";
import type { Actor, Capability, Mission } from "@/engine/types";
import { getActor } from "./catalog";

/** The five capability areas shown on cards and in the coverage strip. */
export const COVERAGE: { key: Capability; label: string }[] = [
  { key: "launch", label: "Launch" },
  { key: "spacecraft", label: "Spacecraft" },
  { key: "science", label: "Science" },
  { key: "comms", label: "Comms" },
  { key: "funding", label: "Funding" },
];

/** 0-3: the best strength any member brings. */
export function coverage(members: Actor[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of COVERAGE) out[c.key] = Math.max(0, ...members.map((a) => a.capabilities[c.key] ?? 0));
  return out;
}

export const treasury = (mission: Mission | undefined, members: Actor[]) =>
  (mission?.baseTreasuryMUsd ?? 0) + members.reduce((s, a) => s + a.contributionMUsd, 0);

const FOCUS: Record<string, Capability[]> = {
  "orbital-lab": ["habitat", "science", "launch", "robotics"],
  "earth-guardian": ["earth-observation", "comms", "ground-segment", "science"],
  "moon-base-zero": ["landing", "comms", "robotics", "launch"],
};

export interface RecommendedCoalition {
  id: string;
  label: string;
  partnerIds: [string, string, string];
}

function topN(pool: Actor[], score: (a: Actor) => number): Actor[] {
  return [...pool].sort((a, b) => score(b) - score(a)).slice(0, 3);
}

/** Three one-click coalitions derived from the catalog for the chosen lead. */
export function recommendedCoalitions(mission: Mission | undefined, leadId: string): RecommendedCoalition[] {
  const lead = getActor(leadId);
  const pool = catalog.actors.filter((a) => a.id !== leadId);
  if (!lead || pool.length < 3) return [];
  const focus = FOCUS[mission?.id ?? ""] ?? ["science"];

  const specialists = topN(pool, (a) => focus.reduce((s, c) => s + (a.capabilities[c] ?? 0), 0));

  const covered = new Set<string>();
  const greedy: Actor[] = [];
  const have = (a: Actor) => COVERAGE.filter((c) => (a.capabilities[c.key] ?? 0) >= 2).map((c) => c.key as string);
  have(lead).forEach((k) => covered.add(k));
  while (greedy.length < 3) {
    const rest = pool.filter((a) => !greedy.includes(a));
    const next = [...rest].sort((a, b) => have(b).filter((k) => !covered.has(k)).length - have(a).filter((k) => !covered.has(k)).length || b.contributionMUsd - a.contributionMUsd)[0];
    greedy.push(next);
    have(next).forEach((k) => covered.add(k));
  }

  const deep = topN(pool, (a) => a.contributionMUsd);

  const ids = (xs: Actor[]) => xs.map((a) => a.id) as [string, string, string];
  return [
    { id: "specialists", label: "Mission specialists", partnerIds: ids(specialists) },
    { id: "coverage", label: "Best coverage", partnerIds: ids(greedy) },
    { id: "pockets", label: "Deep pockets", partnerIds: ids(deep) },
  ];
}
