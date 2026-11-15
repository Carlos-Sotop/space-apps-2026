import { MAX_SECONDARY } from "./types";
import type {
  Actor,
  Capability,
  Catalog,
  Coalition,
  DesignPatch,
  DesignStep,
  Domain,
  Forecast,
  Issue,
  MissionDesign,
  Module,
  ModuleCategory,
  ResourceKey,
  ResourceReport,
  Review,
  Source,
  Values,
} from "./types";
import { designMoves, fmt, getActor, getMission, strongCapabilities, type DesignMove } from "./design";
import { forecast } from "./forecast";
import { computeResources } from "./resources";
import { validateDesign } from "./validate";

/**
 * One partner's vote in the Go / No-Go readiness review (Sunday sprint contract, C0; the review itself is C2).
 * Modeled on NASA flight readiness reviews and the launch Go/No-Go poll: each partner runs one check with
 * real numbers, and a single NO-GO holds the launch.
 */
export interface ReadinessVote {
  actorId: string; verdict: "go" | "no-go" | "go-with-condition";
  check: "mass" | "power" | "comms" | "budget" | "reliability" | "objectives" | "values";
  reason: string; numbers: string; source?: Source;
  fix?: { label: string; patch: DesignPatch; goTo?: DesignStep };
  concession?: { label: string; cost: string; patch: DesignPatch };
}

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
    const carrier = design.moduleIds.map((m) => catalog.modules.find((x) => x.id === m)).find(isCarrier);
    if (vehicle && dest) return `${vehicle.name} can't lift ${fmt(rep.mass.used + (carrier?.massKg ?? 0))} kg to ${dest.orbitClass}`;
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
  /** the changes applied, in order: one, or a carrier or rocket swap followed by one more */
  steps: DesignMove[];
  issues: Issue[];
  rep: ResourceReport;
  /** stored energy, Wh */
  storage: number;
}

const SCIENCE_CATEGORIES: ModuleCategory[] = ["instrument", "experiment", "isru", "rover", "habitat"];

const moduleOf = (catalog: Catalog, id?: string): Module | undefined => (id ? catalog.modules.find((m) => m.id === id) : undefined);
const storageOf = (d: MissionDesign, catalog: Catalog) => d.moduleIds.reduce((s, id) => s + (moduleOf(catalog, id)?.storageWh ?? 0), 0);

const isCarrier = (m?: Module) => !!m && (m.category === "lander" || m.category === "bus") && m.payloadCapacityKg !== undefined;
const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

function tried(steps: DesignMove[], catalog: Catalog): Tried {
  const last = steps[steps.length - 1];
  const move = steps.length === 1 ? last : { ...last, id: steps.map((x) => x.id).join("+"), label: `${steps[0].label}, ${lowerFirst(last.label)}` };
  return { move, steps, issues: validateDesign(last.design, catalog), rep: computeResources(last.design, catalog), storage: storageOf(last.design, catalog) };
}

function tryMoves(design: MissionDesign, catalog: Catalog): Tried[] {
  return designMoves(design, catalog).map((move) => tried([move], catalog));
}

/**
 * Two-step changes for issues no single change clears: a bigger carrier or rocket first, then one
 * part added or swapped (a fuel cell only a bigger lander can carry). About 300 designs, run only when needed.
 */
function tryTwoSteps(singles: Tried[], catalog: Catalog): Tried[] {
  const out: Tried[] = [];
  for (const first of singles) {
    const m = first.move;
    if (m.kind !== "vehicle" && !(m.kind === "swap" && isCarrier(moduleOf(catalog, m.outId)))) continue;
    for (const second of designMoves(m.design, catalog)) {
      if (second.kind !== "add" && second.kind !== "swap") continue;
      if (second.kind === "swap" && isCarrier(moduleOf(catalog, second.outId))) continue;
      out.push(tried([m, second], catalog));
    }
  }
  return out;
}

/** Science points the changes remove (positive) or add (negative). */
function scienceLost(t: Tried, catalog: Catalog): number {
  return t.steps.reduce((sum, step) => {
    const out = moduleOf(catalog, step.kind === "drop" || step.kind === "swap" ? step.outId : undefined);
    const inn = moduleOf(catalog, step.kind === "add" || step.kind === "swap" ? step.inId : undefined);
    return sum + (out?.scienceValue ?? 0) - (inn?.scienceValue ?? 0);
  }, 0);
}

/** "(+40% link)", "(-36 kg)", "(+$23M)": the number that shows why the move helps; two steps show what they cost. */
function moveDelta(issue: Issue, before: ResourceReport, beforeStorage: number, t: Tried): string {
  const cost = t.rep.budget.used - before.budget.used;
  return t.steps.length > 1 ? signedMoney(cost) : singleDelta(issue, before, beforeStorage, t, cost);
}

function singleDelta(issue: Issue, before: ResourceReport, beforeStorage: number, t: Tried, cost: number): string {
  const key = issue.resource;
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

/** How much reliability the changes give up: a cheaper rocket or carrier that fails more often. */
function reliabilityDrop(t: Tried, design: MissionDesign, catalog: Catalog): number {
  return t.steps.reduce((sum, step) => {
    if (step.kind === "vehicle") {
      const now = catalog.launchVehicles.find((v) => v.id === design.launchVehicleId)?.reliability ?? 1;
      const next = catalog.launchVehicles.find((v) => v.id === step.inId)?.reliability ?? 0;
      return sum + Math.max(0, now - next);
    }
    if (step.kind === "swap")
      return sum + Math.max(0, (moduleOf(catalog, step.outId)?.reliability ?? 1) - (moduleOf(catalog, step.inId)?.reliability ?? 1));
    return sum;
  }, 0);
}

interface Fix {
  text: string;
  rank: number;
  /** the changed design behind the text */
  tried: Tried;
}

/**
 * Changes that clear the issue without a new blocker, best first for this member: fewest new issues,
 * then fewest problems left, then science lost, money spent and reliability given up, weighted by what
 * the member cares about. When no single change clears it, a bigger carrier or rocket plus one part;
 * failing that, single changes that get closer without adding any problem, marked "first".
 */
function rankedFixes(issue: Issue, ctx: ReviewContext, who: Actor): Fix[] {
  const { tried: singles, issues, rep, storage, design, catalog } = ctx;
  const known = new Set(issues.map((i) => i.id));
  const p = who.priorities;
  const newBlocker = (t: Tried) => t.issues.some((i) => i.severity === "blocker" && !known.has(i.id));
  const label = (t: Tried, partial = false) => `${t.move.label}${partial ? " first" : ""} (${moveDelta(issue, rep, storage, t)})`;
  const rankOf = (t: Tried) =>
    t.issues.filter((i) => !known.has(i.id)).length * 1000 +
    t.issues.filter((i) => known.has(i.id) && i.id !== issue.id).length * 150 +
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
  const clearing = (list: Tried[]) =>
    list
      .filter((t) => !t.issues.some((i) => i.id === issue.id) && !newBlocker(t) && better(t))
      .map((t) => ({ text: label(t), rank: rankOf(t), id: t.move.id, tried: t }))
      .sort((a, b) => a.rank - b.rank || a.id.localeCompare(b.id));
  const single = clearing(singles);
  if (single.length) return single;
  if (issue.resource || issue.id === "battery-small") {
    const double = clearing((ctx.twoSteps ??= tryTwoSteps(singles, catalog)));
    if (double.length) return double;
  }
  if (now === undefined || now <= 0) return [];
  // A first step trims a part: it closes at least a quarter of the gap and makes nothing else worse.
  // Swapping the radio to save 5 W at night is not a battery fix, and a new lander is not a first step.
  const trims = (t: Tried) => t.move.kind !== "vehicle" && !(t.move.kind === "swap" && isCarrier(moduleOf(catalog, t.move.outId)));
  return singles
    .map((t) => ({ t, g: gap(issue, t.issues, t.rep) ?? now }))
    .filter(({ t, g }) => trims(t) && g <= now * 0.75 && t.issues.every((i) => known.has(i.id)))
    .sort((a, b) => a.g - b.g || a.t.move.id.localeCompare(b.t.move.id))
    .map(({ t, g }) => ({ text: label(t, true), rank: g, tried: t }));
}

/** When no change helps, say why in a few words. */
function noFix(issue: Issue, rep: ResourceReport, design: MissionDesign, catalog: Catalog): string {
  if (issue.id === "battery-small") {
    const flown = design.moduleIds.map((id) => moduleOf(catalog, id));
    const carrier = flown.find(isCarrier);
    const biggest = getMission(catalog, design.missionId).moduleIds
      .map((id) => moduleOf(catalog, id))
      .filter((m): m is Module => !!m && (m.storageWh ?? 0) > 0)
      .sort((a, b) => (b.storageWh ?? 0) - (a.storageWh ?? 0))[0];
    if (carrier && biggest && !design.moduleIds.includes(biggest.id))
      return `No room for the ${biggest.name} (${fmt(biggest.massKg)} kg)`;
    return "No battery on offer covers it, so cut the night load";
  }
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
  /** two-step changes, built the first time an issue needs them */
  twoSteps?: Tried[];
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
  // Two members raising the same issue offer different fixes of similar quality, or the second one
  // agrees with the first; approvals talk about different numbers.
  const said = new Map<string, string>();
  const spoken = new Set<ResourceKey>();
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
      const best = fixes[0];
      const freshOne = best && fixes.find((f) => !said.has(f.text) && f.rank <= best.rank + 30);
      const pick = freshOne?.text ?? best?.text ?? noFix(first, rep, design, catalog);
      const fact = sentence(issueFact(first, rep, design, catalog));
      // agreeing keeps a number on the card: the fact's, or else the fix's
      const fix = repeat && said.has(pick) ? `Agree with ${said.get(pick)}${/\d/.test(fact) ? "" : `: ${lowerFirst(pick)}`}` : pick;
      if (!said.has(pick)) said.set(pick, actor.shortName);
      if (first.resource) spoken.add(first.resource);
      message = `${voice[verdict]} ${fact}. ${fix}.`;
    } else {
      const key = tightest(domains, rep, spoken);
      spoken.add(key);
      const budgetOnly = domains.size === 1 && domains.has("budget");
      const idea = blocked
        ? undefined
        : budgetOnly
          ? `${money(rep.budget.capacity - rep.budget.used)} stays in reserve`
          : fresh(roomFor(context().tried, issues, catalog).map((m) => `Room for ${m.name} (${signedMoney(m.costMUsd)})`));
      if (idea && !said.has(idea)) said.set(idea, actor.shortName);
      message = `${voice.approve} ${sentence(resourceFact(key, rep))}.${idea ? ` ${sentence(idea)}.` : ""}`;
    }
    return { actorId: actor.id, verdict, message, issueIds: cited.map((i) => i.id) };
  });
}

/* ------------------------------------------------------------------ */
/* Go / No-Go readiness review (Sunday sprint C2)                      */
/* ------------------------------------------------------------------ */
// Modeled on NASA's pre-launch readiness reviews and the commit-to-launch poll: every seat runs its
// checks on the engine's real numbers and answers GO, GO IF (a condition) or NO-GO. One NO-GO, or an
// open condition, holds the signatures. Same design, same catalog, same risk: same votes.

export type ReadinessCheck = ReadinessVote["check"];
export type ReadinessVerdict = ReadinessVote["verdict"];

/** A vote with the number it rests on, so a change can be explained: "mass margin rose from 4% to 18%". */
export interface ReadinessVoteDetail extends ReadinessVote {
  metric: { label: string; value: number; unit: string };
  /** the member's own hardware that makes it accept a soft condition (barter) */
  acceptedFor?: string;
}

export const VERDICT_LABEL: Record<ReadinessVerdict, string> = { go: "GO", "go-with-condition": "GO IF", "no-go": "NO-GO" };

export const READINESS_SOURCES = {
  margins: {
    title: "NASA GSFC-STD-1000G, Rules for the Design, Development, Verification, and Operation of Flight Systems, Table 1.06-1",
    url: "https://standards.nasa.gov/sites/default/files/standards/GSFC/G/0/GSFC-STD-1000Revg_signature.pdf",
  },
  risk: { title: "NASA/SP-2011-3421, Probabilistic Risk Assessment Procedures Guide", url: "https://ntrs.nasa.gov/citations/20120001369" },
  poll: {
    title: "NASA NPD 8610.24C, Launch Services Program Pre-Launch Readiness Reviews",
    url: "https://nodis3.gsfc.nasa.gov/displayDir.cfm?t=NPD&c=8610&s=24C",
  },
  barter: {
    title: "ESA: International Space Station legal framework (partners barter their utilisation rights)",
    url: "https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/International_Space_Station/International_Space_Station_legal_framework",
  },
} satisfies Record<string, Source>;

/** Margin asked of mass, power, link and budget: 10%, NASA Goddard's mass and power rule at critical design review. */
export const READY_MARGIN = 0.1;
/** Share of simulated flights that must succeed for a clean GO, and under which the review says NO-GO. */
export const READY_SUCCESS = 0.7;
export const NO_GO_SUCCESS = 0.5;
/** Batteries covering less than this share of the dark period are a NO-GO: the craft would freeze. */
export const NO_GO_NIGHT_COVER = 0.5;
/** Flights the risk assessment simulates when the caller has none. */
export const RISK_RUNS = 200;

/** What one check found. */
interface Outcome {
  check: ReadinessCheck;
  verdict: ReadinessVerdict;
  reason: string;
  numbers: string;
  metric: ReadinessVoteDetail["metric"];
  source?: Source;
  /** the issue a fix has to clear */
  issue?: Issue;
  /** physics, not preference: no barter changes it */
  hard: boolean;
}

interface ReadyContext {
  design: MissionDesign;
  catalog: Catalog;
  issues: Issue[];
  rep: ResourceReport;
  risk: Forecast;
  review: () => ReviewContext;
}

const RANK: Record<ReadinessVerdict, number> = { "no-go": 0, "go-with-condition": 1, go: 2 };
const whole = (x: number) => `${Math.round(x * 100)}%`;
const margin = (used: number, capacity: number) => (capacity > 0 ? (capacity - used) / capacity : used > 0 ? -1 : 1);
const firstSentence = (s: string) => sentence(s.split(/\. /)[0]);

/** The check an issue belongs to. */
function checkOf(issue: Issue): ReadinessCheck {
  if (issue.resource === "data") return "comms";
  if (issue.resource === "mass" || issue.domain === "launch") return "mass";
  if (issue.resource === "budget" || issue.domain === "budget") return "budget";
  if (issue.resource === "comms" || issue.domain === "comms") return "comms";
  if (issue.domain === "science") return "objectives";
  return "power";
}

const mineFor = (check: ReadinessCheck, issues: Issue[]) => issues.filter((i) => checkOf(i) === check);

function massCheck(c: ReadyContext): Outcome {
  const g = c.rep.mass;
  const m = margin(g.used, g.capacity);
  const base = {
    check: "mass" as const,
    numbers: `${fmt(g.used)} of ${fmt(g.capacity)} kg, ${whole(m)} margin`,
    metric: { label: "mass margin", value: Math.round(m * 100), unit: "%" },
    source: READINESS_SOURCES.margins,
  };
  const mine = mineFor("mass", c.issues);
  const blocker = mine.find((i) => i.severity === "blocker");
  if (blocker) {
    const heavy = blocker.id === "mass-over" || blocker.id === "launch-cannot-reach";
    return { ...base, verdict: "no-go", hard: true, issue: blocker, reason: heavy ? "Too heavy for the rocket" : firstSentence(blocker.text), numbers: sentence(issueFact(blocker, c.rep, c.design, c.catalog)) };
  }
  if (m < READY_MARGIN) return { ...base, verdict: "go-with-condition", hard: false, issue: mine.find((i) => i.id === "mass-tight"), reason: "Under 10% mass margin: masses grow late" };
  return { ...base, verdict: "go", hard: false, reason: "Fits the rocket with margin" };
}

function powerCheck(c: ReadyContext): Outcome {
  const g = c.rep.power;
  const m = margin(g.used, g.capacity);
  const base = {
    check: "power" as const,
    numbers: `${fmt(g.used)} of ${fmt(g.capacity)} W, ${whole(m)} margin`,
    metric: { label: "power margin", value: Math.round(m * 100), unit: "%" },
    source: READINESS_SOURCES.margins,
  };
  const mine = mineFor("power", c.issues);
  const blocker = mine.find((i) => i.severity === "blocker");
  if (blocker) return { ...base, verdict: "no-go", hard: true, issue: blocker, reason: blocker.id === "power-over" ? "Draws more than the station allows" : firstSentence(blocker.text) };
  const life = mine.find((i) => i.id === "lifetime-under");
  if (life) {
    const l = c.rep.lifetime;
    return {
      ...base, verdict: "no-go", hard: true, issue: life, reason: "Goes quiet before the mission ends",
      numbers: `lasts ${fmt(l.capacity)} of ${fmt(l.used)} days`, metric: { label: "design life", value: Math.round(l.capacity), unit: " days" },
    };
  }
  const battery = mine.find((i) => i.id === "battery-small");
  if (battery) {
    const x = battery.text.match(/hold ([\d,.]+) Wh.*needs about ([\d,.]+) Wh/);
    const have = x ? num(x[1]) : 0;
    const need = x ? num(x[2]) : 1;
    const cover = need > 0 ? have / need : 1;
    const out = { ...base, issue: battery, numbers: `batteries ${fmt(have)} of ${fmt(need)} Wh for the dark`, metric: { label: "night battery cover", value: Math.round(cover * 100), unit: "%" } };
    return cover < NO_GO_NIGHT_COVER
      ? { ...out, verdict: "no-go", hard: true, reason: "Batteries die in the dark" }
      : { ...out, verdict: "go-with-condition", hard: false, reason: "Batteries run short in the dark" };
  }
  if (m < 0) return { ...base, verdict: "no-go", hard: true, issue: mine.find((i) => i.id === "power-over"), reason: "Draws more power than it makes" };
  if (m < READY_MARGIN) return { ...base, verdict: "go-with-condition", hard: false, issue: mine.find((i) => i.id === "power-tight"), reason: "Under 10% power margin" };
  const lifeTight = mine.find((i) => i.id === "lifetime-tight");
  if (lifeTight) {
    const l = c.rep.lifetime;
    return {
      ...base, verdict: "go-with-condition", hard: false, issue: lifeTight, reason: "Design life barely covers the mission",
      numbers: `lasts ${fmt(l.capacity)} of ${fmt(l.used)} days`, metric: { label: "design life", value: Math.round(l.capacity), unit: " days" },
    };
  }
  return { ...base, verdict: "go", hard: false, reason: "Power holds with margin" };
}

function commsCheck(c: ReadyContext): Outcome {
  const g = c.rep.comms;
  const d = c.rep.data;
  const base = {
    check: "comms" as const,
    numbers: `link ${whole(g.capacity)} of the day, ${whole(g.used)} needed`,
    metric: { label: "link time", value: Math.round(g.capacity * 100), unit: "%" },
  };
  const mine = mineFor("comms", c.issues);
  const blocker = mine.find((i) => i.severity === "blocker");
  if (blocker) return { ...base, verdict: "no-go", hard: true, issue: blocker, reason: firstSentence(blocker.text) };
  const under = mine.find((i) => i.id === "comms-under");
  if (under) {
    const ratio = g.used > 0 ? g.capacity / g.used : 1;
    return ratio < 0.5
      ? { ...base, verdict: "no-go", hard: true, issue: under, reason: "Out of contact most of the time" }
      : { ...base, verdict: "go-with-condition", hard: false, issue: under, reason: "Less link time than the team needs" };
  }
  const dataOver = mine.find((i) => i.id === "data-over");
  const dataBase = {
    numbers: `makes ${fmt(d.used)} Gb/day, sends ${fmt(d.capacity)} Gb/day`,
    metric: { label: "downlink margin", value: Math.round(margin(d.used, d.capacity) * 100), unit: "%" },
  };
  if (dataOver) return { ...base, ...dataBase, verdict: "go-with-condition", hard: false, issue: dataOver, reason: "Data piles up on board" };
  const tight = mine.find((i) => i.id === "comms-tight" || i.id === "data-tight");
  if (tight) return { ...base, ...(tight.id === "data-tight" ? dataBase : {}), verdict: "go-with-condition", hard: false, issue: tight, reason: "Under 10% link margin" };
  return { ...base, verdict: "go", hard: false, reason: "The link covers what the team needs" };
}

function budgetCheck(c: ReadyContext): Outcome {
  const g = c.rep.budget;
  const m = margin(g.used, g.capacity);
  const base = {
    check: "budget" as const,
    numbers: `${money(g.used)} of ${money(g.capacity)}, ${whole(m)} in reserve`,
    metric: { label: "budget reserve", value: Math.round(m * 100), unit: "%" },
  };
  const mine = mineFor("budget", c.issues);
  const blocker = mine.find((i) => i.severity === "blocker");
  if (blocker) return { ...base, verdict: "no-go", hard: true, issue: blocker, reason: "Costs more than the treasury holds" };
  if (m < READY_MARGIN) return { ...base, verdict: "go-with-condition", hard: false, issue: mine.find((i) => i.id === "budget-tight"), reason: "Under 10% reserve for surprises" };
  return { ...base, verdict: "go", hard: false, reason: "Within the treasury, with reserve" };
}

function reliabilityCheck(c: ReadyContext): Outcome {
  const p = c.risk.successProbability;
  const base = {
    check: "reliability" as const,
    numbers: `${Math.round(p * c.risk.runs)} of ${c.risk.runs} simulated flights succeed`,
    metric: { label: "success", value: Math.round(p * 100), unit: "%" },
    source: READINESS_SOURCES.risk,
  };
  if (c.issues.some((i) => i.severity === "blocker")) return { ...base, verdict: "no-go", hard: true, reason: "Can't fly until the red issues are fixed" };
  if (p < NO_GO_SUCCESS) return { ...base, verdict: "no-go", hard: true, reason: "Fails more often than it succeeds" };
  if (p < READY_SUCCESS) return { ...base, verdict: "go-with-condition", hard: false, reason: "Too many simulated flights fail" };
  return { ...base, verdict: "go", hard: false, reason: "The odds look good" };
}

function objectivesCheck(c: ReadyContext): Outcome {
  const mission = getMission(c.catalog, c.design.missionId);
  const chosen = c.design.secondaryObjectiveIds.length;
  const mine = mineFor("objectives", c.issues);
  const unmet = mine.filter((i) => i.id.startsWith("secondary-unmet-"));
  const met = Math.max(0, chosen - unmet.length);
  const base = {
    check: "objectives" as const,
    numbers: chosen ? `main goal and ${met} of ${chosen} extra goals covered` : "main goal covered, 0 extra goals picked",
    metric: { label: "goals covered", value: 1 + met, unit: "" },
  };
  const blocker = mine.find((i) => i.severity === "blocker");
  if (blocker) {
    const reason = blocker.id === "primary-unmet" ? "The main goal can't be met" : blocker.id === "too-many-secondaries" ? "Too many extra goals" : firstSentence(blocker.text);
    return { ...base, verdict: "no-go", hard: true, issue: blocker, reason, numbers: blocker.id === "primary-unmet" ? `main goal: ${mission.primaryObjective.title}` : base.numbers };
  }
  if (unmet.length) {
    const obj = mission.secondaryObjectives.find((o) => `secondary-unmet-${o.id}` === unmet[0].id);
    return { ...base, verdict: "go-with-condition", hard: false, issue: unmet[0], reason: obj ? `Can't meet "${obj.title}" yet` : "An extra goal can't be met" };
  }
  return { ...base, verdict: "go", hard: false, reason: chosen ? "Covers the main goal and every extra" : "Covers the main goal" };
}

const CHECKS: Record<ReadinessCheck, ((c: ReadyContext) => Outcome) | undefined> = {
  mass: massCheck,
  power: powerCheck,
  comms: commsCheck,
  budget: budgetCheck,
  reliability: reliabilityCheck,
  objectives: objectivesCheck,
  values: undefined,
};

/* Seats: the player's organization owns the science case; partners split the engineering checks. */

const strength = (a: Actor, ...caps: Capability[]) => Math.max(0, ...caps.map((k) => a.capabilities[k] ?? 0));
const PARTNER_CHECKS = ["mass", "power", "comms", "budget", "reliability"] as const;
const AFFINITY: Record<(typeof PARTNER_CHECKS)[number], (a: Actor) => number> = {
  mass: (a) => 2 * strength(a, "launch") + a.priorities.safety,
  power: (a) => 2 * strength(a, "spacecraft", "landing", "habitat") + a.priorities.safety,
  comms: (a) => 2 * strength(a, "comms", "ground-segment"),
  budget: (a) => 2 * strength(a, "funding") + 3 * a.priorities.cost,
  reliability: (a) => 3 * a.priorities.safety + strength(a, "landing", "launch"),
};

/**
 * Which checks each seat runs, in seat order (lead first). The lead checks the objectives; partners
 * draft the five engineering checks by strength, snake order, so every check has an owner.
 */
export function readinessSeats(coalition: Coalition, catalog: Catalog): { actorId: string; checks: ReadinessCheck[] }[] {
  const partners = coalition.partnerIds.map((id) => getActor(catalog, id));
  const owned = new Map<string, ReadinessCheck[]>(partners.map((a) => [a.id, []]));
  const left: ReadinessCheck[] = [...PARTNER_CHECKS];
  const round = [...partners, ...[...partners].reverse()];
  for (const a of round) {
    if (!left.length) break;
    const pick = [...left].sort((x, y) => AFFINITY[y as keyof typeof AFFINITY](a) - AFFINITY[x as keyof typeof AFFINITY](a) || left.indexOf(x) - left.indexOf(y))[0];
    owned.get(a.id)!.push(pick);
    left.splice(left.indexOf(pick), 1);
  }
  return [{ actorId: coalition.leadId, checks: ["objectives"] }, ...partners.map((a) => ({ actorId: a.id, checks: owned.get(a.id)! }))];
}

/* Fixes and concessions: real changes, tried against the engine */

function patchOf(design: MissionDesign, next: MissionDesign): DesignPatch {
  const patch: DesignPatch = {};
  if (next.launchVehicleId !== design.launchVehicleId) patch.launchVehicleId = next.launchVehicleId;
  if (next.destinationId !== design.destinationId) patch.destinationId = next.destinationId;
  if (next.moduleIds.join("|") !== design.moduleIds.join("|")) patch.moduleIds = next.moduleIds;
  if (next.secondaryObjectiveIds.join("|") !== design.secondaryObjectiveIds.join("|")) patch.secondaryObjectiveIds = next.secondaryObjectiveIds;
  if (next.blueprintIds.join("|") !== design.blueprintIds.join("|")) patch.blueprintIds = next.blueprintIds;
  if (next.rideshareIds.join("|") !== design.rideshareIds.join("|")) patch.rideshareIds = next.rideshareIds;
  return patch;
}

const stepOf = (patch: DesignPatch): DesignStep =>
  patch.launchVehicleId || patch.destinationId ? "launch" : patch.secondaryObjectiveIds && !patch.moduleIds ? "objectives" : "build";

const fixFrom = (design: MissionDesign, label: string, next: MissionDesign): NonNullable<ReadinessVote["fix"]> => {
  const patch = patchOf(design, next);
  return { label, patch, goTo: stepOf(patch) };
};

/** Launch-and-arrival odds from the rocket and the carrier: what a swap changes in the risk assessment. */
function odds(d: MissionDesign, catalog: Catalog): number {
  const vehicle = catalog.launchVehicles.find((v) => v.id === d.launchVehicleId)?.reliability ?? 0;
  return vehicle * (d.moduleIds.map((id) => moduleOf(catalog, id)).find(isCarrier)?.reliability ?? 0.98);
}

const POWER_ISSUES = new Set(["battery-small", "lifetime-under", "lifetime-tight", "power-over", "power-tight"]);
const CARRIER_ISSUES = new Set([...POWER_ISSUES, "mass-tight", "mass-over", "launch-cannot-reach"]);

interface Candidate {
  design: MissionDesign;
  label: string;
}

function deepLabel(design: MissionDesign, next: MissionDesign, catalog: Catalog): string {
  const parts: string[] = [];
  const carrier = (d: MissionDesign) => d.moduleIds.map((id) => moduleOf(catalog, id)).find(isCarrier);
  const was = carrier(design);
  const now = carrier(next);
  if (now && was && now.id !== was.id) parts.push(`swap to ${now.name}`);
  for (const id of next.moduleIds) if (!design.moduleIds.includes(id) && id !== now?.id) parts.push(`add ${moduleOf(catalog, id)?.name ?? id}`);
  if (next.launchVehicleId !== design.launchVehicleId) parts.push(`fly on ${catalog.launchVehicles.find((v) => v.id === next.launchVehicleId)?.name ?? next.launchVehicleId}`);
  const cost = computeResources(next, catalog).budget.used - computeResources(design, catalog).budget.used;
  return `${sentence(parts.join(", "))} (${signedMoney(cost)})`;
}

/**
 * Bigger changes for what no one- or two-step change clears: any carrier the mission offers, on any
 * rocket, plus a battery or sunlight-independent source when the issue is power. Only designs with no
 * blocker that clear the issue.
 */
function deepCandidates(issue: Issue, ctx: ReviewContext): Candidate[] {
  const { design, catalog } = ctx;
  if (!CARRIER_ISSUES.has(issue.id)) return [];
  const offered = getMission(catalog, design.missionId).moduleIds.map((id) => moduleOf(catalog, id)).filter((m): m is Module => !!m);
  const flownCarrier = design.moduleIds.map((id) => moduleOf(catalog, id)).find(isCarrier);
  const rest = design.moduleIds.filter((id) => id !== flownCarrier?.id);
  const extras: (Module | undefined)[] = [undefined];
  if (POWER_ISSUES.has(issue.id)) extras.push(...offered.filter((m) => !isCarrier(m) && ((m.storageWh ?? 0) > 0 || m.sunlightIndependent) && !rest.includes(m.id)));
  const carriers = flownCarrier ? offered.filter(isCarrier) : [undefined];
  const out: Candidate[] = [];
  for (const carrier of carriers)
    for (const e of extras)
      for (const v of catalog.launchVehicles) {
        const d: MissionDesign = { ...design, moduleIds: [...(carrier ? [carrier.id] : []), ...rest, ...(e ? [e.id] : [])], launchVehicleId: v.id };
        if (d.launchVehicleId === design.launchVehicleId && d.moduleIds.join("|") === design.moduleIds.join("|")) continue;
        const issues = validateDesign(d, catalog);
        if (issues.some((i) => i.severity === "blocker" || i.id === issue.id)) continue;
        out.push({ design: d, label: deepLabel(design, d, catalog) });
      }
  return out;
}

/** Verdicts of the checks that need no simulation, for screening candidate fixes. */
function quickChecks(d: MissionDesign, catalog: Catalog): Outcome[] {
  const c: ReadyContext = {
    design: d, catalog, issues: validateDesign(d, catalog), rep: computeResources(d, catalog),
    risk: { successProbability: 1, expectedScore: 0, p10: 0, p90: 0, runs: 0 },
    review: () => { throw new Error("not used"); },
  };
  return (["mass", "power", "comms", "budget", "objectives"] as const).map((k) => CHECKS[k]!(c));
}

/**
 * The candidate that improves the vote's own check and leaves the fewest NO-GO, then GO IF, verdicts,
 * then keeps the best launch-and-arrival odds, then costs least.
 */
function pickFix(o: Outcome, candidates: Candidate[], ctx: ReviewContext): Candidate | undefined {
  const { catalog, rep } = ctx;
  const scored = candidates.map((cand, n) => {
    const outs = quickChecks(cand.design, catalog);
    const mine = outs.find((x) => x.check === o.check);
    const better = !mine || RANK[mine.verdict] > RANK[o.verdict] || (RANK[mine.verdict] === RANK[o.verdict] && mine.metric.label === o.metric.label && mine.metric.value > o.metric.value);
    return {
      cand, n, better,
      noGo: outs.filter((x) => x.verdict === "no-go").length,
      cond: outs.filter((x) => x.verdict === "go-with-condition").length,
      odds: Math.round(odds(cand.design, catalog) * 100),
      cost: computeResources(cand.design, catalog).budget.used - rep.budget.used,
    };
  });
  return scored
    .filter((x) => x.better)
    .sort((a, b) => a.noGo - b.noGo || a.cond - b.cond || b.odds - a.odds || a.cost - b.cost || a.n - b.n)[0]?.cand;
}

/** The swap of rocket or carrier that raises the launch-and-arrival odds most without a new issue. */
function reliabilityFix(ctx: ReviewContext): NonNullable<ReadinessVote["fix"]> | undefined {
  const { design, catalog, issues, rep } = ctx;
  const known = new Set(issues.map((i) => i.id));
  const now = odds(design, catalog);
  const best = ctx.tried
    .filter((t) => (t.move.kind === "vehicle" || (t.move.kind === "swap" && isCarrier(moduleOf(catalog, t.move.outId)))) && t.issues.every((i) => known.has(i.id)))
    .map((t) => ({ t, gain: odds(t.move.design, catalog) - now, cost: t.rep.budget.used - rep.budget.used }))
    .filter((x) => x.gain > 0.005)
    .sort((a, b) => b.gain - a.gain || a.cost - b.cost || a.t.move.id.localeCompare(b.t.move.id))[0];
  return best ? fixFrom(design, `${best.t.move.label} (${signedMoney(best.cost)})`, best.t.move.design) : undefined;
}

function fixFor(o: Outcome, ctx: ReviewContext, who: Actor): ReadinessVote["fix"] {
  if (o.verdict === "go") return undefined;
  const { design, catalog } = ctx;
  if (o.check === "reliability") return ctx.issues.some((i) => i.severity === "blocker") ? undefined : reliabilityFix(ctx);
  const issue = o.issue;
  if (!issue) return undefined;
  if (issue.id === "too-many-secondaries")
    return { label: `Keep ${MAX_SECONDARY} extra goals`, patch: { secondaryObjectiveIds: design.secondaryObjectiveIds.slice(0, MAX_SECONDARY) }, goTo: "objectives" };
  const candidates: Candidate[] = rankedFixes(issue, ctx, who).map((f) => ({ design: f.tried.move.design, label: f.text }));
  candidates.push(...deepCandidates(issue, ctx));
  if (issue.id.startsWith("secondary-unmet-")) {
    const obj = getMission(catalog, design.missionId).secondaryObjectives.find((x) => `secondary-unmet-${x.id}` === issue.id);
    if (obj) candidates.push({ design: { ...design, secondaryObjectiveIds: design.secondaryObjectiveIds.filter((id) => id !== obj.id) }, label: `Drop "${obj.title}"` });
  }
  const best = pickFix(o, candidates, ctx);
  return best ? fixFrom(design, best.label, best.design) : undefined;
}

/** What a change does to the six gauges, biggest first, at most three: "+12 kg, +30 W made, +$4M". */
function gaugeDelta(before: ResourceReport, after: ResourceReport): string {
  const parts: { text: string; size: number }[] = [];
  const add = (d: number, text: string, scale: number) => { if (Math.abs(d) >= 0.05) parts.push({ text, size: Math.abs(d) / scale }); };
  const dm = after.mass.used - before.mass.used;
  add(dm, signed(dm, " kg"), Math.max(1, before.mass.capacity));
  const dw = after.power.used - before.power.used;
  add(dw, signed(dw, " W used"), Math.max(1, before.power.capacity));
  const dg = after.power.capacity - before.power.capacity;
  add(dg, signed(dg, " W made"), Math.max(1, before.power.capacity));
  const db = after.budget.used - before.budget.used;
  add(db, signedMoney(db), Math.max(1, before.budget.capacity));
  const dl = after.lifetime.capacity - before.lifetime.capacity;
  add(dl, signed(dl, " days of life"), Math.max(1, before.lifetime.capacity));
  const dd = after.data.capacity - before.data.capacity;
  add(dd, signed(dd, " Gb/day downlink"), Math.max(1, before.data.capacity));
  return parts.sort((a, b) => b.size - a.size).slice(0, 3).map((p) => p.text).join(", ") || "nothing on the gauges";
}

/**
 * ISS-style barter for a soft condition: adopt the member's open design (credit flows to it), or give
 * its hardware a payload slot. Either shows on the gauges; the member then accepts the condition.
 * Only trades that add no blocker; the one that leaves the fewest NO-GO and GO IF verdicts first.
 */
function concessionFor(o: Outcome, ctx: ReviewContext, who: Actor): ReadinessVote["concession"] {
  if (o.verdict !== "go-with-condition" || o.hard) return undefined;
  const { design, catalog, rep } = ctx;
  const mission = getMission(catalog, design.missionId);
  const offered = new Set(mission.moduleIds);
  const cats = new Set(design.moduleIds.map((id) => moduleOf(catalog, id)?.category));
  const trades: { label: string; d: MissionDesign }[] = [
    ...catalog.blueprints
      .filter((b) => b.authorId === who.id && !design.blueprintIds.includes(b.id) && cats.has(b.category))
      .map((b) => ({ label: `Adopt ${who.shortName}'s ${b.name}`, d: { ...design, blueprintIds: [...design.blueprintIds, b.id] } })),
    ...catalog.modules
      .filter((m) => m.providerId === who.id && offered.has(m.id) && !isCarrier(m) && !design.moduleIds.includes(m.id))
      .map((m) => ({ label: `Fly ${who.shortName}'s ${m.name}`, d: { ...design, moduleIds: [...design.moduleIds, m.id] } })),
  ];
  const known = new Set(ctx.issues.map((i) => i.id));
  const best = trades
    .map((t, n) => {
      const issues = validateDesign(t.d, catalog);
      const outs = quickChecks(t.d, catalog);
      return { t, n, issues, noGo: outs.filter((x) => x.verdict === "no-go").length, cond: outs.filter((x) => x.verdict === "go-with-condition").length, r: computeResources(t.d, catalog) };
    })
    .filter((x) => !x.issues.some((i) => i.severity === "blocker" && !known.has(i.id)) && x.noGo === 0)
    .sort((a, b) => a.cond - b.cond || a.r.mass.used - b.r.mass.used || a.n - b.n)[0];
  if (!best) return undefined;
  return { label: best.t.label, cost: gaugeDelta(rep, best.r), patch: patchOf(design, best.t.d) };
}

/**
 * The Go / No-Go poll: one vote per seat, lead first. Each seat reports its worst check; a soft
 * condition is accepted when the member's own hardware flies (ISS-style barter), or when nothing on
 * offer would fix it. Pass the risk assessment the player sees; without one it is simulated here.
 */
export function readinessReview(design: MissionDesign, catalog: Catalog, risk?: Forecast): ReadinessVoteDetail[] {
  const issues = validateDesign(design, catalog);
  const rep = computeResources(design, catalog);
  let ctx: ReviewContext | undefined;
  const review = (): ReviewContext => (ctx ??= { design, catalog, issues, rep, storage: storageOf(design, catalog), tried: tryMoves(design, catalog) });
  const c: ReadyContext = { design, catalog, issues, rep, risk: risk ?? forecast(design, catalog, RISK_RUNS), review };
  // what each member gets from this design: its open design adopted, or its hardware flying
  const stake = new Map<string, string>();
  for (const id of design.moduleIds) {
    const m = moduleOf(catalog, id);
    if (m?.providerId && !stake.has(m.providerId)) stake.set(m.providerId, `our ${m.name} flies`);
  }
  for (const id of design.blueprintIds) {
    const b = catalog.blueprints.find((x) => x.id === id);
    if (b && !stake.has(b.authorId)) stake.set(b.authorId, `our ${b.name} design is used`);
  }

  return readinessSeats(design.coalition, catalog).map(({ actorId, checks }, seat) => {
    const who = getActor(catalog, actorId);
    const outcomes = checks.map((k) => CHECKS[k]!(c));
    const o = outcomes.reduce((a, b) => (RANK[b.verdict] < RANK[a.verdict] ? b : a));
    const vote: ReadinessVoteDetail = { actorId, verdict: o.verdict, check: o.check, reason: o.reason, numbers: o.numbers, metric: o.metric, ...(o.source ? { source: o.source } : {}) };
    if (o.verdict === "go") return vote;
    const own = seat > 0 && !o.hard ? stake.get(actorId) : undefined;
    if (own) return { ...vote, verdict: "go", reason: `Accepted: ${own}`, acceptedFor: own, source: READINESS_SOURCES.barter };
    const fix = fixFor(o, review(), who);
    const concession = seat > 0 ? concessionFor(o, review(), who) : undefined;
    if (o.verdict === "go-with-condition" && !fix && !concession) return { ...vote, verdict: "go", reason: `${o.reason}, accepted: nothing on offer fixes it` };
    return { ...vote, ...(fix ? { fix } : {}), ...(concession ? { concession } : {}) };
  });
}

/** True when every seat says a clean GO: the signatures unlock. */
export const readinessAllGo = (votes: ReadinessVote[]) => votes.length > 0 && votes.every((v) => v.verdict === "go");

/** One line per seat whose verdict changed: "JAXA: NO-GO to GO, mass margin rose from 4% to 18%". */
export function readinessChanges(before: ReadinessVoteDetail[], after: ReadinessVoteDetail[], catalog: Catalog): string[] {
  return after.flatMap((a) => {
    const b = before.find((x) => x.actorId === a.actorId);
    if (!b || b.verdict === a.verdict) return [];
    const head = `${getActor(catalog, a.actorId).shortName}: ${VERDICT_LABEL[b.verdict]} to ${VERDICT_LABEL[a.verdict]}`;
    const m0 = b.metric;
    const m1 = a.metric;
    if (m0.label === m1.label && m0.value !== m1.value)
      return [`${head}, ${m1.label} ${m1.value > m0.value ? "rose" : "fell"} from ${m0.value}${m0.unit} to ${m1.value}${m1.unit}`];
    return [`${head}, ${lowerFirst(a.reason)}`];
  });
}

/* ------------------------------------------------------------------ */
/* Team play: players take seats and call GO or NO-GO themselves (C9)  */
/* ------------------------------------------------------------------ */

export type SeatCall = "go" | "no-go";

/** What a player at a seat may call: the numbers' NO-GO can only be held; anything else is the player's call. */
export const allowedCalls = (vote: ReadinessVote): SeatCall[] => (vote.verdict === "no-go" ? ["no-go"] : ["go", "no-go"]);

/** A seat's verdict in the poll: its player's call when a player sits there, else the console's. */
export function seatVerdict(vote: ReadinessVote, players: string[], calls: Partial<Record<string, SeatCall>>): ReadinessVerdict | undefined {
  if (!players.includes(vote.actorId)) return vote.verdict;
  const call = calls[vote.actorId];
  return call && allowedCalls(vote).includes(call) ? call : undefined;
}

/** True when every seat says GO: players by their own call, the other seats by their console. */
export function pollAllGo(votes: ReadinessVote[], players: string[] = [], calls: Partial<Record<string, SeatCall>> = {}): boolean {
  return votes.length > 0 && votes.every((v) => seatVerdict(v, players, calls) === "go");
}
