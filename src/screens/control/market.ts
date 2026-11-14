// Decision market helpers: "vote on values, bet on beliefs".
import { forecast, makeRng } from "@/engine";
import type { Catalog, DecisionMarket, Forecast, LiveContext, Mission, MissionDesign, Stake } from "@/engine/types";

export interface MarketOption { id: string; label: string; design: MissionDesign; forecast: Forecast }
export interface MarketState { market: DecisionMarket; options: MarketOption[]; botStakes: Stake[] }

const hash = (s: string) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);

/** Option A is the current design. Option B drops the most expensive module the mission does not require. */
export function buildMarket(design: MissionDesign, mission: Mission, catalog: Catalog): DecisionMarket {
  const required = new Set(mission.requiredCategories);
  const needed = new Set([...(mission.primaryObjective.requires.moduleIds ?? []), ...mission.secondaryObjectives.filter((o) => design.secondaryObjectiveIds.includes(o.id)).flatMap((o) => o.requires.moduleIds ?? [])]);
  const primaryCats = new Set(mission.primaryObjective.requires.categories ?? []);
  const optional = design.moduleIds
    .map((id) => catalog.modules.find((m) => m.id === id))
    .filter((m) => !!m && !required.has(m.category) && !primaryCats.has(m.category) && !needed.has(m.id))
    .sort((a, b) => b!.costMUsd - a!.costMUsd);
  const options: DecisionMarket["options"] = [{ id: "current", label: "Fly the design as it is", design }];
  const drop = optional[0];
  if (drop) options.push({ id: "lean", label: `Fly without ${drop.name}`, design: { ...design, moduleIds: design.moduleIds.filter((id) => id !== drop.id) } });
  return { id: `market-${mission.id}`, question: "Which design should the council fly?", options };
}

export function runMarket(market: DecisionMarket, partnerIds: string[], catalog: Catalog, live?: LiveContext): MarketState {
  const options = market.options.map((o) => ({ ...o, forecast: forecast(o.design, catalog, 120, live) }));
  const botStakes: Stake[] = partnerIds.map((actorId) => {
    const rng = makeRng(hash(`${market.id}:${actorId}`));
    const guesses = options.map((o) => ({ o, predicted: Math.round(o.forecast.expectedScore + (rng() - 0.5) * 80) }));
    const pick = guesses.sort((a, b) => b.predicted - a.predicted)[0];
    return { marketId: market.id, optionId: pick.o.id, actorId, credits: 40 + Math.round(rng() * 6) * 10, predictedScore: pick.predicted };
  });
  return { market, options, botStakes };
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

export function winner(state: MarketState, prices: Record<string, number>): MarketOption {
  return [...state.options].sort((a, b) => prices[b.id] - prices[a.id] || (a.id === "current" ? -1 : 1))[0];
}
