// Decision market helpers: "vote on values, bet on beliefs". Play credits only, never money.
//
// Each option gets its own conditional market on the score it will reach (0-1000). An LMSR market
// maker (Hanson's logarithmic market scoring rule) quotes the price, seeded at the simulated
// forecast. Members buy "higher" (pays score/1000 per share) or "lower" (pays 1 - score/1000), the
// council adopts the option with the highest price, and only the adopted option's market settles:
// trades in the others are refunded, because their condition never happened.
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { computeResources, designMoves, forecast, makeRng, validateDesign, type DesignMove } from "@/engine";
import type { Actor, Catalog, DecisionMarket, FlightResult, Forecast, LiveContext, MissionDesign, Module } from "@/engine/types";

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

export type Side = "higher" | "lower";

/** One member's trade in one option's market. Play credits only. */
export interface Trade {
  actorId: string;
  optionId: string;
  side: Side;
  /** play credits paid to the market maker */
  credits: number;
  /** shares bought; each pays up to one credit at settlement */
  shares: number;
  /** price before and after the trade, in score points */
  from: number;
  to: number;
}

/** Prices per option (score points) and every trade so far. */
export interface Book {
  prices: Record<string, number>;
  trades: Trade[];
}

export interface MarketState {
  market: DecisionMarket;
  options: MarketOption[];
  /** the book after the bots traded; the player trades last, when the market closes */
  book: Book;
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

/* ------------------------------------------------------------------ */
/* Alternatives: the best cheaper design and the best upgrade           */
/* ------------------------------------------------------------------ */

interface Candidate {
  move: DesignMove;
  cost: number;
  mass: number;
  /** issues the move adds that the current design does not have */
  added: number;
  /** science points the move adds (negative when it removes science) */
  science: number;
}

function candidates(design: MissionDesign, catalog: Catalog): { cheaper: Candidate[]; upgrade: Candidate[] } {
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
  const rank = (a: Candidate, b: Candidate) => a.added - b.added || b.science - a.science || a.cost - b.cost || a.move.id.localeCompare(b.move.id);
  return {
    cheaper: out.filter((c) => c.cost < -0.05).sort(rank),
    upgrade: out.filter((c) => c.cost > 0.05).sort(rank),
  };
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
/* LMSR market maker                                                    */
/* ------------------------------------------------------------------ */

/**
 * Liquidity in play credits. Near the middle of the scale, moving an option 50 points costs about 100 credits,
 * so one bet can't overturn 200 simulated flights, but a few confident members can.
 */
export const LMSR_B = 1000;

const clampP = (p: number) => Math.min(0.99, Math.max(0.01, p));
const logit = (p: number) => Math.log(p / (1 - p));
const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

/**
 * Buys "higher" or "lower" shares with up to `budget` credits, moving the price toward `target`
 * (score points). Returns undefined when there is nothing to buy.
 */
export function lmsrTrade(price: number, target: number, budget: number, b = LMSR_B): Omit<Trade, "actorId" | "optionId"> | undefined {
  const p = clampP(price / 1000);
  const t = clampP(target / 1000);
  if (budget <= 0 || Math.abs(t - p) < 1e-6) return undefined;
  const x = b * logit(p);
  if (t > p) {
    const full = b * Math.log((1 - p) / (1 - t));
    const x2 = full <= budget ? b * logit(t) : b * Math.log((1 + Math.exp(x / b)) * Math.exp(budget / b) - 1);
    return { side: "higher", credits: Math.min(full, budget), shares: x2 - x, from: price, to: 1000 * sigmoid(x2 / b) };
  }
  const full = b * Math.log(p / t);
  const x2 = full <= budget ? b * logit(t) : -b * Math.log((1 + Math.exp(-x / b)) * Math.exp(budget / b) - 1);
  return { side: "lower", credits: Math.min(full, budget), shares: x - x2, from: price, to: 1000 * sigmoid(x2 / b) };
}

/** A fresh book: every option priced at its simulated forecast. */
export function openBook(options: MarketOption[]): Book {
  return { prices: Object.fromEntries(options.map((o) => [o.id, clampP(o.forecast.expectedScore / 1000) * 1000])), trades: [] };
}

/** Applies one member's trade; a target of 1000 or 0 spends the whole budget on "higher" or "lower". */
export function trade(book: Book, actorId: string, optionId: string, target: number, budget: number): Book {
  const price = book.prices[optionId];
  if (price === undefined) return book;
  const t = lmsrTrade(price, target, budget);
  if (!t) return book;
  return { prices: { ...book.prices, [optionId]: t.to }, trades: [...book.trades, { actorId, optionId, ...t }] };
}

/** The council adopts the option with the highest market price; a tie keeps the current design. */
export function winner(options: MarketOption[], prices: Record<string, number>): MarketOption {
  return [...options].sort((a, b) => prices[b.id] - prices[a.id] || (a.id === "current" ? -1 : b.id === "current" ? 1 : 0))[0];
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

/** Budget multiplier from a member's record: accurate forecasters get more say, down to half and up to double. */
export const reputationWeight = (net = 0) => Math.min(2, Math.max(0.5, 1 + net / 500));

/**
 * Each bot trades where it disagrees most with the market: "higher" if it believes the option
 * scores above the price, "lower" if below, sized by how much it disagrees and by its record.
 */
export function botTrades(partners: Actor[], options: MarketOption[], marketId: string, book: Book, record: Record<string, ForecasterRecord> = {}): Book {
  let out = book;
  for (const actor of partners) {
    const beliefs = botBeliefs(actor, options, marketId);
    const edges = options.map((o, i) => ({ o, belief: beliefs[i], edge: beliefs[i] - out.prices[o.id] }));
    const best = edges.sort((a, b) => Math.abs(b.edge) - Math.abs(a.edge) || a.o.id.localeCompare(b.o.id))[0];
    if (!best || Math.abs(best.edge) < 1) continue;
    const credits = Math.round(Math.max(30, Math.min(150, 40 + Math.abs(best.edge))) * reputationWeight(record[actor.id]?.net));
    out = trade(out, actor.id, best.o.id, best.belief, credits);
  }
  return out;
}

/**
 * Builds the market one simulation at a time so the page stays responsive: each `next()` runs one
 * forecast and yields the share of the work done. The final value is the market after the bots traded.
 */
export function* runMarketSteps(
  design: MissionDesign,
  partners: Actor[],
  catalog: Catalog,
  live?: LiveContext,
  runs = { screen: SCREEN_RUNS, price: FORECAST_RUNS },
  record: Record<string, ForecasterRecord> = {},
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
  return { market, options, book: botTrades(partners, options, market.id, openBook(options), record) };
}

/** The same market, computed in one go (tests, and callers that don't mind the wait). */
export function runMarket(
  design: MissionDesign, partners: Actor[], catalog: Catalog, live?: LiveContext,
  runs?: { screen: number; price: number }, record?: Record<string, ForecasterRecord>,
): MarketState {
  const it = runMarketSteps(design, partners, catalog, live, runs, record);
  for (;;) {
    const r = it.next();
    if (r.done) return r.value;
  }
}

/* ------------------------------------------------------------------ */
/* Settlement after the flight                                         */
/* ------------------------------------------------------------------ */

export interface Payout {
  actorId: string;
  optionId: string;
  side: Side;
  credits: number;
  /** credits handed back after the flight */
  returned: number;
  /** returned minus paid */
  net: number;
  /** the option was not adopted (or the design changed), so the credits come back untouched */
  refunded: boolean;
}

export interface Settlement {
  seed: number;
  actualScore: number;
  /** false when the design that flew is not the one the market adopted */
  sameDesign: boolean;
  payouts: Payout[];
}

/**
 * Trades in the adopted option settle against the score the flight got: each "higher" share pays
 * score/1000 credits, each "lower" share pays the rest. Trades in other options are refunded.
 */
export function settle(trades: Trade[], adoptedId: string, result: Pick<FlightResult, "seed" | "score">, sameDesign = true): Settlement {
  const actual = result.score.total;
  const s = Math.min(1, Math.max(0, actual / 1000));
  const payouts = trades.map((t): Payout => {
    const refunded = !sameDesign || t.optionId !== adoptedId;
    const returned = refunded ? t.credits : t.shares * (t.side === "higher" ? s : 1 - s);
    return { actorId: t.actorId, optionId: t.optionId, side: t.side, credits: t.credits, returned, net: returned - t.credits, refunded };
  });
  return { seed: result.seed, actualScore: actual, sameDesign, payouts };
}

/* ------------------------------------------------------------------ */
/* Ledger and reputation                                               */
/* ------------------------------------------------------------------ */

/** A member's forecasting record: play credits won or lost over settled markets. */
export interface ForecasterRecord {
  net: number;
  markets: number;
}

export interface MarketRecord {
  marketId: string;
  missionId: string;
  /** designKey of the adopted design: the flight settles the market only if this design flew */
  designKey: string;
  adoptedId: string;
  adoptedLabel: string;
  /** final price of each option when the market closed */
  prices: Record<string, number>;
  trades: Trade[];
  playerId: string;
  settlement?: Settlement;
  /** the player has been told how it settled */
  announced?: boolean;
}

interface Ledger {
  records: MarketRecord[];
  /** per member, kept across sessions */
  reputation: Record<string, ForecasterRecord>;
  close: (r: MarketRecord) => void;
  /** settles the latest open market against a flight; returns the settled record */
  settleLatest: (result: Pick<FlightResult, "seed" | "score">, flown: MissionDesign) => MarketRecord | undefined;
  markAnnounced: (marketId: string) => void;
}

// Browser storage only: outside a page (tests, workers) the record lives in memory.
const local = () => (typeof window === "undefined" ? undefined : window.localStorage);
const safeStorage = {
  getItem: (k: string) => { try { return local()?.getItem(k) ?? null; } catch { return null; } },
  setItem: (k: string, v: string) => { try { local()?.setItem(k, v); } catch { /* storage unavailable */ } },
  removeItem: (k: string) => { try { local()?.removeItem(k); } catch { /* storage unavailable */ } },
};

export const useLedger = create<Ledger>()(
  persist(
    (set, get) => ({
      records: [],
      reputation: {},
      // A market closed again before any flight replaces the open one: nothing flew, so nothing settles.
      close: (r) => set((s) => ({ records: [...s.records.filter((x) => !!x.settlement).slice(-9), r] })),
      settleLatest: (result, flown) => {
        const open = get().records.at(-1);
        if (!open || open.settlement) return undefined;
        const settlement = settle(open.trades, open.adoptedId, result, designKey(flown) === open.designKey);
        const settled = { ...open, settlement };
        const reputation = { ...get().reputation };
        for (const p of settlement.payouts) {
          if (p.refunded) continue;
          const r = reputation[p.actorId] ?? { net: 0, markets: 0 };
          reputation[p.actorId] = { net: r.net + p.net, markets: r.markets + 1 };
        }
        set((s) => ({ records: s.records.map((x) => (x === open ? settled : x)), reputation }));
        return settled;
      },
      markAnnounced: (marketId) => set((s) => ({ records: s.records.map((x) => (x.marketId === marketId ? { ...x, announced: true } : x)) })),
    }),
    {
      name: "spacedao-market-v1",
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      // only the record of each forecaster outlives the page
      partialize: (s) => ({ reputation: s.reputation }),
    },
  ),
);
