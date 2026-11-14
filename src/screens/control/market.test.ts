import { describe, expect, it } from "vitest";
import type { Forecast, MissionDesign, Stake } from "@/engine/types";
import { marketPrices, winner, type MarketState } from "./market";

const fc = (expectedScore: number): Forecast => ({ successProbability: 0.6, expectedScore, p10: 0, p90: 0, runs: 100 });
const design = {} as MissionDesign;
const state = (botStakes: Stake[]): MarketState => ({
  market: { id: "m", question: "q", options: [] },
  options: [
    { id: "current", label: "A", design, forecast: fc(466) },
    { id: "lean", label: "B", design, forecast: fc(418) },
  ],
  botStakes,
});
const stake = (optionId: string, credits: number, predictedScore: number, actorId = "bot"): Stake => ({ marketId: "m", optionId, actorId, credits, predictedScore });

describe("decision market", () => {
  it("one optimistic bet cannot flip a clear forecast difference", () => {
    const s = state([stake("current", 60, 450, "a"), stake("current", 80, 470, "b"), stake("lean", 70, 484, "c")]);
    const prices = marketPrices(s, stake("current", 100, 466, "player"));
    expect(winner(s, prices).id).toBe("current");
  });

  it("enough conviction on the other option moves the decision", () => {
    const s = state([stake("lean", 300, 560, "a"), stake("lean", 300, 560, "b")]);
    const prices = marketPrices(s, stake("lean", 100, 560, "player"));
    expect(winner(s, prices).id).toBe("lean");
  });

  it("an option nobody backed is priced at its forecast", () => {
    const s = state([]);
    const prices = marketPrices(s, stake("current", 0, 0, "player"));
    expect(prices.lean).toBeCloseTo(418);
  });
});
