import type {
  Actor,
  Capability,
  Catalog,
  Coalition,
  Domain,
  Issue,
  MissionDesign,
  Module,
  ModuleCategory,
  ResourceKey,
  ResourceReport,
  Review,
  Values,
} from "./types";
import { designMoves, fmt, getActor, getMission, strongCapabilities, type DesignMove } from "./design";
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

/* ------------------------------------------------------------------ */
/* Voices: how each member opens its line, written from its persona    */
/* ------------------------------------------------------------------ */

interface Voice {
  approve: string;
  concern: string;
  veto: string;
}

const VOICE: Record<string, Voice> = {
  nasa: { approve: "The evidence holds.", concern: "The evidence worries me.", veto: "This would fail peer review." },
  esa: { approve: "Every partner can sign this.", concern: "Not every partner will sign yet.", veto: "No member state signs this." },
  isro: { approve: "Lean and ready.", concern: "One frugal fix first.", veto: "Even frugal can't save this." },
  jaxa: { approve: "Precise work, thank you.", concern: "Forgive me, one detail.", veto: "I am sorry, we cannot fly this." },
  csa: { approve: "Happy to lend a hand.", concern: "Let's fix one thing together.", veto: "Not yet, but we'll help." },
  asi: { approve: "Beautifully built.", concern: "Fine craft, one weak joint.", veto: "This is not well built." },
  aeb: { approve: "Let's go.", concern: "Small fix, big win.", veto: "Stop, this won't fly." },
  kasa: { approve: "Ship it, iterate next flight.", concern: "Quick iteration needed.", veto: "Not this iteration." },
  mbrsc: { approve: "A solid stepping stone.", concern: "To reach further, fix this.", veto: "This stone won't hold." },
  conae: { approve: "The data case holds.", concern: "The numbers say fix this.", veto: "The data rules it out." },
  nasrda: { approve: "Good for people on the ground.", concern: "People on the ground need this fixed.", veto: "This lets people down." },
  aep: { approve: "I'm learning, and I approve.", concern: "I'm new, but look.", veto: "Even I can see this fails." },
  ases: { approve: "A small team could fly this.", concern: "One clear step first.", veto: "Hope is not enough here." },
  aee: { approve: "The link stays alive.", concern: "Keep the link alive.", veto: "We'd lose the spacecraft." },
  tua: { approve: "Milestone ready.", concern: "Milestone at risk.", veto: "Milestone missed." },
  uksa: { approve: "Rather tidy.", concern: "Small snag.", veto: "No business case here." },
  ggpen: { approve: "This builds capacity.", concern: "For the long term, fix this.", veto: "This sets us back." },
  nssa: { approve: "Neat.", concern: "Curious gap.", veto: "Won't work." },
  spacex: { approve: "Fly it.", concern: "Fix it fast.", veto: "No." },
  "blue-origin": { approve: "Step by step, ready.", concern: "One step first.", veto: "Not yet." },
  "rocket-lab": { approve: "Good to go.", concern: "Quick tweak.", veto: "Hold the countdown." },
  "intuitive-machines": { approve: "We learned, and this flies.", concern: "Lesson from our last landing.", veto: "We've crashed for less." },
  firefly: { approve: "Right the first time.", concern: "Let's land it the first time.", veto: "This won't land right." },
  astrobotic: { approve: "Delivery confirmed.", concern: "Delivery issue.", veto: "We can't deliver this." },
  ispace: { approve: "Good for the lunar economy.", concern: "We learned this the hard way.", veto: "We've lost a lander like this." },
  axiom: { approve: "Customers will love it.", concern: "For our customers, one fix.", veto: "No customer flies this." },
  "sierra-space": { approve: "Elegant fold.", concern: "Fold it smarter.", veto: "It doesn't fold." },
  "northrop-grumman": { approve: "Margins verified.", concern: "Margin review.", veto: "Margin violation." },
  "thales-alenia-space": { approve: "Flight heritage holds.", concern: "Heritage says check this.", veto: "No heritage for this." },
  "airbus-defence-space": { approve: "Interfaces close.", concern: "Interface issue.", veto: "Interfaces don't close." },
  iceye: { approve: "Data flows.", concern: "Revisit at risk.", veto: "No data, no deal." },
  ula: { approve: "Right orbit, right margins.", concern: "Precision first.", veto: "Wrong numbers, no launch." },
};

/** A member without a written voice speaks from its strongest priority. */
export function voiceOf(actor: Actor): Voice {
  const written = VOICE[actor.id];
  if (written) return written;
  const p = actor.priorities;
  if (p.safety >= 0.45) return { approve: "Margins hold.", concern: "Check this margin.", veto: "Not safe to fly." };
  if (p.cost >= 0.45) return { approve: "Good value.", concern: "This will cost us.", veto: "We can't afford this." };
  if (p.science >= 0.45) return { approve: "Good science.", concern: "Science at risk.", veto: "No science this way." };
  return { approve: "I approve.", concern: "One concern.", veto: "I veto this." };
}

/* ------------------------------------------------------------------ */
/* Facts: the real number and its limit                                */
/* ------------------------------------------------------------------ */

const pct = (x: number) => `${fmt(x * 100)}%`;
const money = (x: number) => `$${fmt(x)}M`;
const signed = (x: number, unit = "") => `${x >= 0 ? "+" : "-"}${fmt(Math.abs(x))}${unit}`;
const signedMoney = (x: number) => `${x >= 0 ? "+" : "-"}$${fmt(Math.abs(x))}M`;
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const sentence = (s: string) => capitalize(s.trim().replace(/[.:]$/, ""));

/** One clause naming the used amount and the limit for a resource. */
function resourceFact(key: ResourceKey, rep: ResourceReport): string {
  const g = rep[key];
  switch (key) {
    case "mass":
      return `payload ${fmt(g.used)} kg, limit ${fmt(g.capacity)} kg`;
    case "budget":
      return `cost ${money(g.used)}, treasury ${money(g.capacity)}`;
    case "power":
      return `draws ${fmt(g.used)} W, makes ${fmt(g.capacity)} W`;
    case "data":
      return `makes ${fmt(g.used)} Gb/day, link sends ${fmt(g.capacity)} Gb/day`;
    case "comms":
      return `link ${pct(g.capacity)} of the day, ${pct(g.used)} needed`;
    case "lifetime":
      return `lasts ${fmt(g.capacity)} days, mission needs ${fmt(g.used)}`;
  }
}

function issueFact(issue: Issue, rep: ResourceReport, design: MissionDesign, catalog: Catalog): string {
  const { id } = issue;
  if (issue.resource && (id.endsWith("-over") || id.endsWith("-under"))) return resourceFact(issue.resource, rep);
  if (issue.resource && id.endsWith("-tight")) return `${resourceFact(issue.resource, rep)}, under 10% margin`;
  if (id === "battery-small") {
    const m = issue.text.match(/hold ([\d,.]+) Wh.*needs about ([\d,.]+) Wh/);
    if (m) return `batteries hold ${m[1]} Wh, the dark needs ${m[2]} Wh`;
  }
  if (id.startsWith("missing-category-")) return `no ${id.slice("missing-category-".length)} module on board`;
  if (id === "launch-cannot-reach") {
    const vehicle = catalog.launchVehicles.find((v) => v.id === design.launchVehicleId);
    const dest = getMission(catalog, design.missionId).destinations.find((d) => d.id === design.destinationId);
    if (vehicle && dest) return `${vehicle.name} can't reach ${dest.orbitClass}`;
  }
  if (id === "primary-unmet") return "the main objective can't be met";
  if (id.startsWith("secondary-unmet-")) {
    const obj = getMission(catalog, design.missionId).secondaryObjectives.find((o) => `secondary-unmet-${o.id}` === id);
    if (obj) return `"${obj.title}" can't be met`;
  }
  return issue.text;
}

/* ------------------------------------------------------------------ */
/* Fixes: the best single change, tried against the real engine        */
/* ------------------------------------------------------------------ */

interface Tried {
  move: DesignMove;
  issues: Issue[];
  rep: ResourceReport;
  /** stored energy, Wh */
  storage: number;
}

const SCIENCE_CATEGORIES: ModuleCategory[] = ["instrument", "experiment", "isru", "rover", "habitat"];

const moduleOf = (catalog: Catalog, id?: string): Module | undefined => (id ? catalog.modules.find((m) => m.id === id) : undefined);
const storageOf = (d: MissionDesign, catalog: Catalog) => d.moduleIds.reduce((s, id) => s + (moduleOf(catalog, id)?.storageWh ?? 0), 0);

function tryMoves(design: MissionDesign, catalog: Catalog): Tried[] {
  return designMoves(design, catalog).map((move) => ({
    move,
    issues: validateDesign(move.design, catalog),
    rep: computeResources(move.design, catalog),
    storage: storageOf(move.design, catalog),
  }));
}

/** Science points a move removes (positive) or adds (negative). */
function scienceLost(t: Tried, catalog: Catalog): number {
  const out = moduleOf(catalog, t.move.kind === "drop" || t.move.kind === "swap" ? t.move.outId : undefined);
  const inn = moduleOf(catalog, t.move.kind === "add" || t.move.kind === "swap" ? t.move.inId : undefined);
  return (out?.scienceValue ?? 0) - (inn?.scienceValue ?? 0);
}

/** "(+40% link)", "(-36 kg)", "(+$23M)": the number that shows why the move helps. */
function moveDelta(issue: Issue, before: ResourceReport, beforeStorage: number, t: Tried): string {
  const key = issue.resource;
  const cost = t.rep.budget.used - before.budget.used;
  if (issue.id === "battery-small" && t.storage !== beforeStorage) return signed(t.storage - beforeStorage, " Wh");
  if (key === "mass" && t.move.kind === "vehicle") return `${fmt(t.rep.mass.capacity)} kg limit, ${signedMoney(cost)}`;
  if (!key || t.move.kind === "vehicle" || key === "budget") return signedMoney(cost);
  const b = before[key];
  const a = t.rep[key];
  const dUsed = a.used - b.used;
  const dCap = a.capacity - b.capacity;
  const useCap = Math.abs(dCap) > Math.abs(dUsed);
  switch (key) {
    case "mass":
      return useCap ? `${fmt(a.capacity)} kg limit` : signed(dUsed, " kg");
    case "power":
      return useCap ? signed(dCap, " W") : signed(dUsed, " W");
    case "data":
      return useCap ? signed(dCap, " Gb/day") : signed(dUsed, " Gb/day");
    case "comms":
      return `${signed(dCap * 100, "%")} link`;
    case "lifetime":
      return signed(dCap, " days");
  }
}

const num = (s: string) => Number(s.replace(/,/g, ""));

/** Energy the dark period needs beyond what the batteries hold, read from the battery issue; 0 when covered. */
function batteryShortWh(issues: Issue[]): number {
  const i = issues.find((x) => x.id === "battery-small");
  const m = i?.text.match(/hold ([\d,.]+) Wh.*needs about ([\d,.]+) Wh/);
  return m ? num(m[2]) - num(m[1]) : 0;
}

/** How far a design is from clearing an issue; lower is better. */
function gap(issue: Issue, issues: Issue[], rep: ResourceReport): number | undefined {
  if (issue.id === "battery-small") return batteryShortWh(issues);
  return issue.resource ? rep[issue.resource].used - rep[issue.resource].capacity : undefined;
}

/** How much reliability a move gives up: a cheaper rocket or carrier that fails more often. */
function reliabilityDrop(t: Tried, design: MissionDesign, catalog: Catalog): number {
  if (t.move.kind === "vehicle") {
    const now = catalog.launchVehicles.find((v) => v.id === design.launchVehicleId)?.reliability ?? 1;
    const next = catalog.launchVehicles.find((v) => v.id === t.move.inId)?.reliability ?? 0;
    return Math.max(0, now - next);
  }
  if (t.move.kind === "swap")
    return Math.max(0, (moduleOf(catalog, t.move.outId)?.reliability ?? 1) - (moduleOf(catalog, t.move.inId)?.reliability ?? 1));
  return 0;
}

interface Fix {
  text: string;
  rank: number;
}

/**
 * Changes that clear the issue without a new blocker, best first for this member: fewest new issues,
 * then science lost, money spent and reliability given up, weighted by what the member cares about.
 * When no single change clears it, the changes that get closest, marked "first".
 */
function rankedFixes(issue: Issue, ctx: ReviewContext, who: Actor): Fix[] {
  const { tried, issues, rep, storage, design, catalog } = ctx;
  const known = new Set(issues.map((i) => i.id));
  const p = who.priorities;
  const newBlocker = (t: Tried) => t.issues.some((i) => i.severity === "blocker" && !known.has(i.id));
  const label = (t: Tried, partial = false) => `${t.move.label}${partial ? " first" : ""} (${moveDelta(issue, rep, storage, t)})`;
  const rankOf = (t: Tried) =>
    t.issues.filter((i) => !known.has(i.id)).length * 1000 +
    Math.max(0, scienceLost(t, catalog)) * (0.5 + p.science) +
    Math.max(0, t.rep.budget.used - rep.budget.used) * (0.5 + p.cost) +
    reliabilityDrop(t, design, catalog) * 600 * (0.5 + p.safety) +
    (t.move.kind === "drop" ? 0.5 : 0);
  const now = gap(issue, issues, rep);
  // A fix must move the number the right way: dropping heaters "clears" a thin lifetime margin by
  // breaking it, and a thin margin is only fixed once the resource is back in the green.
  const better = (t: Tried) => {
    if (now === undefined || !issue.resource) return true;
    const g = gap(issue, t.issues, t.rep) ?? now;
    return g < now - 1e-9 && (!issue.id.endsWith("-tight") || t.rep[issue.resource].status === "ok");
  };
  const clears = tried
    .filter((t) => !t.issues.some((i) => i.id === issue.id) && !newBlocker(t) && better(t))
    .map((t) => ({ text: label(t), rank: rankOf(t), id: t.move.id }))
    .sort((a, b) => a.rank - b.rank || a.id.localeCompare(b.id));
  if (clears.length) return clears;
  if (now === undefined) return [];
  return tried
    .map((t) => ({ t, g: gap(issue, t.issues, t.rep) ?? now }))
    .filter(({ t, g }) => g < now - 1e-9 && !newBlocker(t))
    .sort((a, b) => a.g - b.g || a.t.move.id.localeCompare(b.t.move.id))
    .map(({ t, g }) => ({ text: label(t, true), rank: g }));
}

/** When no single change helps, say so plainly in a few words. */
function noFix(issue: Issue, rep: ResourceReport): string {
  if (issue.id === "battery-small") return "No battery on offer covers it, so cut the night load";
  switch (issue.resource) {
    case "lifetime":
      return `No part on offer lasts longer than ${fmt(rep.lifetime.capacity)} days`;
    case "mass":
      return "No single change fits it, so trim the payload";
    case "budget":
      return "No single change fits the treasury, so trim the design";
    case "power":
      return "Cut the load or add generation";
    case "data":
      return "Add downlink or drop a data-heavy instrument";
    case "comms":
      return "Add a relay or a ground network";
    default:
      return sentence(issue.fix.split(/, or |; /)[0]);
  }
}

/* ------------------------------------------------------------------ */
/* Approvals: the tightest number in the member's area and one idea    */
/* ------------------------------------------------------------------ */

const DOMAIN_RESOURCES: Record<Domain, ResourceKey[]> = {
  launch: ["mass"],
  budget: ["budget"],
  spacecraft: ["power", "lifetime"],
  science: ["data"],
  comms: ["comms", "data"],
};

/** The member's tightest resource, preferring one no earlier member has talked about. */
function tightest(domains: Set<Domain>, rep: ResourceReport, spoken: Set<ResourceKey>): ResourceKey {
  const mineFirst = [...new Set([...domains].flatMap((d) => DOMAIN_RESOURCES[d]))];
  const rest = (["mass", "power", "lifetime", "data", "comms", "budget"] as ResourceKey[]).filter((k) => !mineFirst.includes(k));
  const ratio = (k: ResourceKey) => rep[k].used / rep[k].capacity;
  const pick = (keys: ResourceKey[]) => keys.filter((k) => rep[k].capacity > 0 && !spoken.has(k)).sort((a, b) => ratio(b) - ratio(a))[0];
  return pick(mineFirst) ?? pick(rest) ?? mineFirst.find((k) => rep[k].capacity > 0) ?? "mass";
}

/** Science payloads that fit without any new issue, most science first. */
function roomFor(tried: Tried[], before: Issue[], catalog: Catalog): Module[] {
  const known = new Set(before.map((i) => i.id));
  return tried
    .filter((t) => t.move.kind === "add" && t.issues.every((i) => known.has(i.id)))
    .map((t) => moduleOf(catalog, t.move.inId))
    .filter((m): m is Module => !!m && SCIENCE_CATEGORIES.includes(m.category) && (m.scienceValue ?? 0) > 0)
    .sort((a, b) => (b.scienceValue ?? 0) - (a.scienceValue ?? 0) || a.costMUsd - b.costMUsd);
}

interface ReviewContext {
  design: MissionDesign;
  catalog: Catalog;
  issues: Issue[];
  rep: ResourceReport;
  storage: number;
  tried: Tried[];
}

const SEVERITY_ORDER = (i: Issue, over: Set<ResourceKey>) =>
  i.severity === "blocker" ? 0 : i.resource && over.has(i.resource) && !i.id.endsWith("-tight") ? 1 : i.id.endsWith("-tight") ? 3 : 2;

/**
 * Each partner reviews the issues in the domains it owns. Its line names the real number, the
 * limit and the best single change the engine found, opened in that member's voice.
 */
export function councilReview(design: MissionDesign, catalog: Catalog): Review[] {
  const issues = validateDesign(design, catalog);
  const rep = computeResources(design, catalog);
  const overKeys = new Set(
    Object.values(rep)
      .filter((g) => g.status === "over")
      .map((g) => g.key),
  );
  const partners = design.coalition.partnerIds.map((id) => getActor(catalog, id));
  const domainsOf = new Map(partners.map((a) => [a.id, new Set(strongCapabilities(a).map((c) => CAPABILITY_DOMAIN[c]))]));
  const owned = new Set([...domainsOf.values()].flatMap((s) => [...s]));
  const fallback = [...partners].sort((a, b) => b.priorities.safety - a.priorities.safety)[0];
  let ctx: ReviewContext | undefined;
  const context = (): ReviewContext =>
    (ctx ??= { design, catalog, issues, rep, storage: storageOf(design, catalog), tried: tryMoves(design, catalog) });
  // Two members raising the same issue offer different fixes of similar quality, and approvals
  // talk about different numbers.
  const said = new Set<string>();
  const spoken = new Set<ResourceKey>();
  const freshFix = (fixes: Fix[]) => {
    const best = fixes[0];
    if (!best) return undefined;
    return (fixes.find((f) => !said.has(f.text) && f.rank <= best.rank + 30) ?? best).text;
  };
  const fresh = (options: string[]) => options.find((o) => !said.has(o)) ?? options[0];
  const blocked = issues.some((i) => i.severity === "blocker");
  const raised = new Set<string>();

  return partners.map((actor) => {
    const domains = domainsOf.get(actor.id) ?? new Set<Domain>();
    const mine = issues
      .filter((i) => domains.has(i.domain) || (actor === fallback && !owned.has(i.domain)))
      .map((i, n) => ({ i, n }))
      .sort((a, b) => SEVERITY_ORDER(a.i, overKeys) - SEVERITY_ORDER(b.i, overKeys) || a.n - b.n)
      .map((x) => x.i);
    const blockers = mine.filter((i) => i.severity === "blocker");
    const overMine = mine.filter((i) => i.resource !== undefined && overKeys.has(i.resource));
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

    // Lead with an issue nobody has raised yet; a repeated issue gets a different fix.
    const first = cited.find((i) => !raised.has(i.id)) ?? cited[0];
    if (first) cited = [first, ...cited.filter((i) => i !== first)];
    const voice = voiceOf(actor);
    let message: string;
    if (first) {
      const repeat = raised.has(first.id);
      raised.add(first.id);
      const fixes = rankedFixes(first, context(), actor);
      const fix = (repeat ? fixes.find((f) => !said.has(f.text))?.text : undefined) ?? freshFix(fixes) ?? noFix(first, rep);
      said.add(fix);
      if (first.resource) spoken.add(first.resource);
      message = `${voice[verdict]} ${sentence(issueFact(first, rep, design, catalog))}. ${fix}.`;
    } else {
      const key = tightest(domains, rep, spoken);
      spoken.add(key);
      const budgetOnly = domains.size === 1 && domains.has("budget");
      const idea = blocked
        ? undefined
        : budgetOnly
          ? `${money(rep.budget.capacity - rep.budget.used)} stays in reserve`
          : fresh(roomFor(context().tried, issues, catalog).map((m) => `Room for ${m.name} (${signedMoney(m.costMUsd)})`));
      if (idea) said.add(idea);
      message = `${voice.approve} ${sentence(resourceFact(key, rep))}.${idea ? ` ${sentence(idea)}.` : ""}`;
    }
    return { actorId: actor.id, verdict, message, issueIds: cited.map((i) => i.id) };
  });
}
