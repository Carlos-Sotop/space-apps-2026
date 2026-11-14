// Decision market helpers: "vote on values, bet on beliefs". Play credits only, never money.
import { create } from "zustand";
import { computeResources, designMoves, forecast, makeRng, validateDesign, type DesignMove } from "@/engine";
import type { Actor, Catalog, DecisionMarket, FlightResult, Forecast, LiveContext, MissionDesign, Module, Stake } from "@/engine/types";

export type OptionKind = "current" | "cheaper" | "upgrade";

export interface MarketOption {
  id: string;
  kind: OptionKind;
  label: string;
  /** what changes against the current design, e.g. "-$22M · -60 kg" */
  delta: string;
  design: MissionDesign;
  forecast: Forecast;
}

export interface MarketState {
  market: DecisionMarket;
  options: MarketOption[];
  botStakes: Stake[];
}

/** Flights simulated per option for the price, and per candidate when picking the alternatives. */
export const FORECAST_RUNS = 120;
export const SCREEN_RUNS = 24;
/** Candidates screened per side; the rest are ranked out by a cheap rule first. */
const SCREENED = 6;

const hash = (s: string) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);

/** Same hardware, same goals, same council and values: the market's subject is still the design that flies. */
export function designKey(d: MissionDesign): string {
  const sorted = (xs: string[]) => [...xs].sort().join(",");
  const v = d.values;
  return [
    d.missionId, d.destinationId, d.launchVehicleId, sorted(d.moduleIds), sorted(d.blueprintIds), sorted(d.rideshareIds),
    sorted(d.secondaryObjectiveIds), d.coalition.leadId, d.coalition.partnerIds.join(","),
    [v.science, v.safety, v.cost].map((x) => x.toFixed(3)).join(","),
  ].join("|");
}

const signed = (x: number, unit: string, money = false) => {
  const n = Math.abs(x);
  const s = n >= 100 ? Math.round(n).toLocaleString("en-US") : String(Math.round(n * 10) / 10);
  return `${x >= 0 ? "+" : "-"}${money ? "$" : ""}${s}${unit}`;
};

interface Candidate {
  move: DesignMove;
  cost: number;
  mass: number;
  /** issues the move adds that the current design does not have */
  added: number;
  /** science points the move adds (negative when it removes science) */
  science: number;
}

function candidates(design: MissionDesign, catalog: Catalog): { cheaper: Candidate[]; upgrade: Candidate[]; cost: number; mass: number } {
  const now = computeResources(design, catalog);
  const known = new Set(validateDesign(design, catalog).map((i) => i.id));
  const mod = (id?: string): Module | undefined => (id ? catalog.modules.find((m) => m.id === id) : undefined);
  const out: Candidate[] = [];
  for (const move of designMoves(design, catalog)) {
    const issues = validateDesign(move.design, catalog);
    if (issues.some((i) => i.severity === "blocker")) continue;
    const rep = computeResources(move.design, catalog);
    const gained = move.kind === "add" || move.kind === "swap" ? (mod(move.inId)?.scienceValue ?? 0) : 0;
    const lost = move.kind === "drop" || move.kind === "swap" ? (mod(move.outId)?.scienceValue ?? 0) : 0;
    out.push({
      move,
      cost: rep.budget.used - now.budget.used,
      mass: rep.mass.used - now.mass.used,
      added: issues.filter((i) => !known.has(i.id)).length,
      science: gained - lost,
    });
  }
  const cheaper = out
    .filter((c) => c.cost < -0.05)
    .sort((a, b) => a.added - b.added || b.science - a.science || a.cost - b.cost || a.move.id.localeCompare(b.move.id));
  const upgrade = out
    .filter((c) => c.cost > 0.05)
    .sort((a, b) => a.added - b.added || b.science - a.science || a.cost - b.cost || a.move.id.localeCompare(b.move.id));
  return { cheaper, upgrade, cost: now.budget.used, mass: now.mass.used };
}

function deltaText(c: Candidate): string {
  const parts = [signed(c.cost, "M", true)];
  if (Math.abs(c.mass) >= 0.5) parts.push(signed(c.mass, " kg"));
  return parts.join(" · ");
}

/** The council's question and its options: the design as it is, a cheaper one and an upgrade. */
export interface MarketPlan {
  market: DecisionMarket;
  /** candidates per side, best first by the cheap rule, still to be screened by simulation */
  sides: { kind: Exclude<OptionKind, "current">; candidates: Candidate[] }[];
}

export function planMarket(design: MissionDesign, catalog: Catalog): MarketPlan {
  const { cheaper, upgrade } = candidates(design, catalog);
  return {
    market: { id: `market-${design.missionId}-${hash(designKey(design)).toString(36)}`, question: "Which design should the council fly?", options: [{ id: "current", label: "Fly as designed", design }] },
    sides: [
      { kind: "cheaper", candidates: cheaper.slice(0, SCREENED) },
      { kind: "upgrade", candidates: upgrade.slice(0, SCREENED) },
    ],
  };
}

/* ------------------------------------------------------------------ */
/* Bots: each partner believes the forecast plus its own bias and noise */
/* ------------------------------------------------------------------ */

/** What a bot predicts for each option: the simulated forecast, bent by what it cares about and blurred by how little it knows. */
export function botBeliefs(actor: Actor, options: MarketOption[], marketId: string): number[] {
  const rng = makeRng(hash(`${marketId}:${actor.id}`));
  const p = actor.priorities;
  const meanSuccess = options.reduce((s, o) => s + o.forecast.successProbability, 0) / Math.max(1, options.length);
  return options.map((o) => {
    const lean = o.kind === "cheaper" ? 120 * (p.cost - 0.3) : o.kind === "upgrade" ? 120 * (p.science - 0.3) : 0;
    const caution = 250 * p.safety * (o.forecast.successProbability - meanSuccess);
    const noise = (rng() - 0.5) * 90;
    return Math.round(o.forecast.expectedScore + lean + caution + noise);
  });
}

export function botStakes(partners: Actor[], options: MarketOption[], marketId: string): Stake[] {
  return partners.map((actor) => {
    const beliefs = botBeliefs(actor, options, marketId);
    const order = beliefs.map((b, i) => ({ b, i })).sort((a, b) => b.b - a.b || a.i - b.i);
    const top = order[0];
    const conviction = top.b - (order[1]?.b ?? top.b - 60);
    const credits = Math.max(30, Math.min(150, Math.round((40 + conviction) / 10) * 10));
    return { marketId, optionId: options[top.i].id, actorId: actor.id, credits, predictedScore: top.b };
  });
}

/**
 * Builds the market one simulation at a time so the page stays responsive: each `next()` runs one
 * forecast and yields the share of the work done. The final value is the market with bot stakes.
 */
export function* runMarketSteps(
  design: MissionDesign,
  partners: Actor[],
  catalog: Catalog,
  live?: LiveContext,
  runs = { screen: SCREEN_RUNS, price: FORECAST_RUNS },
): Generator<number, MarketState> {
  const plan = planMarket(design, catalog);
  const screens = plan.sides.reduce((n, s) => n + s.candidates.length, 0);
  const total = screens * runs.screen + 3 * runs.price;
  let done = 0;

  const picked: { kind: OptionKind; candidate?: Candidate }[] = [{ kind: "current" }];
  for (const side of plan.sides) {
    let best: { c: Candidate; score: number } | undefined;
    for (const c of side.candidates) {
      const f = forecast(c.move.design, catalog, runs.screen, live);
      done += runs.screen;
      yield done / total;
      if (!best || f.expectedScore > best.score) best = { c, score: f.expectedScore };
    }
    if (best) picked.push({ kind: side.kind, candidate: best.c });
  }

  const options: MarketOption[] = [];
  for (const p of picked) {
    const d = p.candidate?.move.design ?? design;
    const f = forecast(d, catalog, runs.price, live);
    done += runs.price;
    yield Math.min(1, done / total);
    options.push({
      id: p.kind,
      kind: p.kind,
      label: p.candidate?.move.label ?? "Fly as designed",
      delta: p.candidate ? deltaText(p.candidate) : "No change",
      design: d,
      forecast: f,
    });
  }
  const market: DecisionMarket = { ...plan.market, options: options.map(({ id, label, design: d }) => ({ id, label, design: d })) };
  return { market, options, botStakes: botStakes(partners, options, market.id) };
}

/** The same market, computed in one go (tests, and callers that don't mind the wait). */
export function runMarket(design: MissionDesign, partners: Actor[], catalog: Catalog, live?: LiveContext, runs?: { screen: number; price: number }): MarketState {
  const it = runMarketSteps(design, partners, catalog, live, runs);
  for (;;) {
    const r = it.next();
    if (r.done) return r.value;
  }
}

/**
 * Credits of "liquidity" the market maker seeds each option with, priced at the simulated forecast.
 * Stakes move the price away from the forecast in proportion to their size, so one optimistic bet
 * can't flip a clear difference on its own (thin markets otherwise reward the wildest guess).
 */
export const MARKET_LIQUIDITY = 200;

/** Price per option: forecast-seeded liquidity blended with stake-weighted predicted scores. */
export function marketPrices(state: MarketState, playerStake: Stake): Record<string, number> {
  const stakes = [...state.botStakes, playerStake];
  const out: Record<string, number> = {};
  for (const o of state.options) {
    const on = stakes.filter((s) => s.optionId === o.id && s.credits > 0);
    const credits = on.reduce((a, s) => a + s.credits, 0);
    const staked = on.reduce((a, s) => a + s.credits * s.predictedScore, 0);
    out[o.id] = (MARKET_LIQUIDITY * o.forecast.expectedScore + staked) / (MARKET_LIQUIDITY + credits);
  }
  return out;
}

/** The council adopts the option with the higher market forecast; a tie keeps the current design. */
export function winner(state: MarketState, prices: Record<string, number>): MarketOption {
  return [...state.options].sort((a, b) => prices[b.id] - prices[a.id] || (a.id === "current" ? -1 : b.id === "current" ? 1 : 0))[0];
}

/* ------------------------------------------------------------------ */
/* Settlement after the flight                                         */
/* ------------------------------------------------------------------ */

/** Points of error at which a stake comes back unchanged; a perfect call doubles it, twice the error loses it. */
export const SETTLE_SCALE = 200;

export interface Payout {
  actorId: string;
  optionId: string;
  credits: number;
  predictedScore: number;
  /** credits handed back after the flight */
  returned: number;
  /** returned minus staked */
  net: number;
  /** the option was not adopted (or the design changed), so the stake comes back untouched */
  refunded: boolean;
  /** 1 for a perfect call, 0 at SETTLE_SCALE points off, -1 at twice that */
  accuracy: number;
}

export interface Settlement {
  seed: number;
  actualScore: number;
  /** false when the design that flew is not the one the market adopted */
  sameDesign: boolean;
  payouts: Payout[];
}

/**
 * Stakes on the adopted option settle against the score the flight actually got. Stakes on options
 * the council did not adopt are refunded: their condition never happened (how decision markets work).
 */
export function settle(stakes: Stake[], adoptedId: string, result: Pick<FlightResult, "seed" | "score">, sameDesign = true): Settlement {
  const actual = result.score.total;
  const payouts = stakes
    .filter((s) => s.credits > 0)
    .map((s): Payout => {
      if (!sameDesign || s.optionId !== adoptedId)
        return { actorId: s.actorId, optionId: s.optionId, credits: s.credits, predictedScore: s.predictedScore, returned: s.credits, net: 0, refunded: true, accuracy: 0 };
      const accuracy = Math.max(-1, Math.min(1, 1 - Math.abs(s.predictedScore - actual) / SETTLE_SCALE));
      const returned = Math.round(s.credits * (1 + accuracy));
      return { actorId: s.actorId, optionId: s.optionId, credits: s.credits, predictedScore: s.predictedScore, returned, net: returned - s.credits, refunded: false, accuracy };
    });
  return { seed: result.seed, actualScore: actual, sameDesign, payouts };
}

/* ------------------------------------------------------------------ */
/* Ledger: closed markets wait here for their flight                    */
/* ------------------------------------------------------------------ */

export interface MarketRecord {
  marketId: string;
  missionId: string;
  /** designKey of the adopted design: the flight settles the market only if this design flew */
  designKey: string;
  adoptedId: string;
  adoptedLabel: string;
  /** market price of the adopted option when the market closed */
  price: number;
  stakes: Stake[];
  playerId: string;
  settlement?: Settlement;
  /** the player has been told how it settled */
  announced?: boolean;
}

interface Ledger {
  records: MarketRecord[];
  close: (r: MarketRecord) => void;
  /** settles the latest open market against a flight; returns the settled record */
  settleLatest: (result: Pick<FlightResult, "seed" | "score">, flown: MissionDesign) => MarketRecord | undefined;
  markAnnounced: (marketId: string) => void;
}

export const useLedger = create<Ledger>((set, get) => ({
  records: [],
  // A market closed again before any flight replaces the open one: nothing flew, so nothing settles.
  close: (r) => set((s) => ({ records: [...s.records.filter((x) => !!x.settlement), r] })),
  settleLatest: (result, flown) => {
    const open = get().records.at(-1);
    if (!open || open.settlement) return undefined;
    const settled = { ...open, settlement: settle(open.stakes, open.adoptedId, result, designKey(flown) === open.designKey) };
    set((s) => ({ records: s.records.map((x) => (x === open ? settled : x)) }));
    return settled;
  },
  markAnnounced: (marketId) => set((s) => ({ records: s.records.map((x) => (x.marketId === marketId ? { ...x, announced: true } : x)) })),
}));
