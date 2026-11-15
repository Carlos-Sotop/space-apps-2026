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

/** What each mission needs most, first the one it cannot fly without. */
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

const strength = (a: Actor, c: Capability) => a.capabilities[c] ?? 0;
const setKey = (xs: Actor[]) => xs.map((a) => a.id).sort().join(",");

/**
 * Three one-click coalitions derived from the catalog for the chosen lead, always three different sets:
 * - Mission specialists: the strongest in what the mission needs.
 * - Best coverage: each pick adds the most strength the council still lacks in the mission's needs and the five card areas.
 * - Deep pockets: the biggest contributions, keeping one world-class partner in the mission's first need
 *   (a world-class lander team for the Moon, a station-module builder for the lab, an Earth-observation agency for Earth Guardian).
 */
export function recommendedCoalitions(mission: Mission | undefined, leadId: string): RecommendedCoalition[] {
  const lead = getActor(leadId);
  const pool = catalog.actors.filter((a) => a.id !== leadId);
  if (!lead || pool.length < 3) return [];
  const focus = FOCUS[mission?.id ?? ""] ?? ["science"];
  const focusOf = (a: Actor) => focus.reduce((s, c) => s + strength(a, c), 0);
  const taken = new Set<string>();
  /** Picks in order of preference; the last pick skips any candidate that would repeat an offered set. */
  const pickThree = (ranked: (picked: Actor[]) => Actor[]): Actor[] => {
    const picked: Actor[] = [];
    while (picked.length < 3) {
      const options = ranked(picked).filter((a) => !picked.includes(a));
      const next = picked.length < 2 ? options[0] : options.find((a) => !taken.has(setKey([...picked, a])));
      if (!next) break;
      picked.push(next);
    }
    taken.add(setKey(picked));
    return picked;
  };

  const bySpecialty = [...pool].sort((a, b) => focusOf(b) - focusOf(a) || b.contributionMUsd - a.contributionMUsd || a.id.localeCompare(b.id));
  const specialists = pickThree(() => bySpecialty);

  const areas = [...new Set<Capability>([...focus, ...COVERAGE.map((c) => c.key)])];
  const greedy = pickThree((picked) => {
    const have = (c: Capability) => Math.max(strength(lead, c), ...picked.map((a) => strength(a, c)));
    const gain = (a: Actor) => areas.reduce((s, c) => s + Math.max(0, strength(a, c) - have(c)), 0);
    return [...pool].sort((a, b) => gain(b) - gain(a) || focusOf(b) - focusOf(a) || b.contributionMUsd - a.contributionMUsd || a.id.localeCompare(b.id));
  });

  const must = focus[0]!;
  const byMoney = [...pool].sort((a, b) => b.contributionMUsd - a.contributionMUsd || focusOf(b) - focusOf(a) || a.id.localeCompare(b.id));
  const deep = pickThree((picked) => {
    // the last seat goes to the richest world-class partner in the first need when no member has it yet
    const covered = [lead, ...picked].some((a) => strength(a, must) >= 3);
    if (picked.length < 2 || covered) return byMoney;
    return [...byMoney.filter((a) => strength(a, must) >= 3), ...byMoney];
  });

  const ids = (xs: Actor[]) => xs.map((a) => a.id) as [string, string, string];
  return [
    { id: "specialists", label: "Mission specialists", partnerIds: ids(specialists) },
    { id: "coverage", label: "Best coverage", partnerIds: ids(greedy) },
    { id: "pockets", label: "Deep pockets", partnerIds: ids(deep) },
  ];
}
