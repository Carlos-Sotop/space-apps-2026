import type { Capability, Catalog, Coalition, Domain, Issue, MissionDesign, Review, Values } from "./types";
import { fmt, getActor, strongCapabilities } from "./design";
import { computeResources } from "./resources";
import { validateDesign } from "./validate";

const CAPABILITY_DOMAIN: Record<Capability, Domain> = {
  launch: "launch",
  spacecraft: "spacecraft",
  landing: "spacecraft",
  habitat: "spacecraft",
  robotics: "spacecraft",
  science: "science",
  "earth-observation": "science",
  comms: "comms",
  "ground-segment": "comms",
  funding: "budget",
};

export function councilValues(
  coalition: Coalition,
  playerValues: Values,
  catalog: Catalog,
): { values: Values; weights: Record<string, number> } {
  const ids = [coalition.leadId, ...coalition.partnerIds];
  const actors = ids.map((id) => getActor(catalog, id));
  const total = actors.reduce((s, a) => s + a.contributionMUsd, 0);
  const weights: Record<string, number> = {};
  const sum: Values = { science: 0, safety: 0, cost: 0 };
  actors.forEach((a, i) => {
    const w = total > 0 ? a.contributionMUsd / total : 1 / actors.length;
    weights[a.id] = (weights[a.id] ?? 0) + w;
    const v = i === 0 ? playerValues : a.priorities;
    sum.science += w * v.science;
    sum.safety += w * v.safety;
    sum.cost += w * v.cost;
  });
  const norm = sum.science + sum.safety + sum.cost;
  const values =
    norm > 0
      ? { science: sum.science / norm, safety: sum.safety / norm, cost: sum.cost / norm }
      : { science: 1 / 3, safety: 1 / 3, cost: 1 / 3 };
  return { values, weights };
}

export function councilReview(design: MissionDesign, catalog: Catalog): Review[] {
  const issues = validateDesign(design, catalog);
  const rep = computeResources(design, catalog);
  const overKeys = Object.values(rep)
    .filter((g) => g.status === "over")
    .map((g) => g.key);
  const partners = design.coalition.partnerIds.map((id) => getActor(catalog, id));
  const domainsOf = new Map(partners.map((a) => [a.id, new Set(strongCapabilities(a).map((c) => CAPABILITY_DOMAIN[c]))]));
  const owned = new Set([...domainsOf.values()].flatMap((s) => [...s]));
  const fallback = [...partners].sort((a, b) => b.priorities.safety - a.priorities.safety)[0];

  return partners.map((actor) => {
    const domains = domainsOf.get(actor.id) ?? new Set<Domain>();
    const mine = issues.filter((i) => domains.has(i.domain) || (actor === fallback && !owned.has(i.domain)));
    const blockers = mine.filter((i) => i.severity === "blocker");
    const overMine = mine.filter((i) => i.resource !== undefined && overKeys.includes(i.resource));
    const safetyVeto = actor.priorities.safety >= 0.45 && overMine.length > 0;

    let verdict: Review["verdict"] = "approve";
    let cited: Issue[] = [];
    if (blockers.length > 0 || safetyVeto) {
      verdict = "veto";
      cited = blockers.length > 0 ? blockers : overMine;
    } else if (mine.length > 0) {
      verdict = "concern";
      cited = mine;
    }

    let message: string;
    const first = cited[0];
    if (verdict !== "approve" && first) {
      const verb = verdict === "veto" ? "I veto this design." : "I have a concern.";
      message = `${actor.shortName}: ${verb} ${first.text} ${first.fix}`;
    } else if (verdict === "veto") {
      message = `${actor.shortName}: I veto this design because a resource is over its limit. Cut something before we launch.`;
    } else {
      message = `${actor.shortName}: I approve. Mass is ${fmt(rep.mass.used)} of ${fmt(rep.mass.capacity)} kg and the budget is $${fmt(rep.budget.used)}M of $${fmt(rep.budget.capacity)}M, with no blockers in my area.`;
    }
    return { actorId: actor.id, verdict, message, issueIds: cited.map((i) => i.id) };
  });
}
