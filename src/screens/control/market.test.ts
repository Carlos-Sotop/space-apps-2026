import { describe, expect, it } from "vitest";
import { catalog as game } from "@/data";
import { computeResources, defaultDesign, validateDesign } from "@/engine";
import type { Actor, Coalition, Forecast, MissionDesign, Stake } from "@/engine/types";
import { botStakes, designKey, marketPrices, runMarket, settle, SETTLE_SCALE, useLedger, winner, type MarketOption, type MarketState } from "./market";

const fc = (expectedScore: number, successProbability = 0.6): Forecast => ({ successProbability, expectedScore, p10: 0, p90: 0, runs: 100 });
const design = {} as MissionDesign;
const option = (id: "current" | "cheaper" | "upgrade", score: number, success = 0.6): MarketOption => ({ id, kind: id, label: id, delta: "", design, forecast: fc(score, success) });
const state = (botStakes: Stake[]): MarketState => ({
  market: { id: "m", question: "q", options: [] },
  options: [option("current", 466), option("cheaper", 418)],
  botStakes,
});
const stake = (optionId: string, credits: number, predictedScore: number, actorId = "bot"): Stake => ({ marketId: "m", optionId, actorId, credits, predictedScore });
const actor = (id: string) => game.actors.find((a) => a.id === id) as Actor;
const quick = { screen: 6, price: 12 };

describe("decision market prices", () => {
  it("one optimistic bet cannot flip a clear forecast difference", () => {
    const s = state([stake("current", 60, 450, "a"), stake("current", 80, 470, "b"), stake("cheaper", 70, 484, "c")]);
    const prices = marketPrices(s, stake("current", 100, 466, "player"));
    expect(winner(s, prices).id).toBe("current");
  });

  it("enough conviction on the other option moves the decision", () => {
    const s = state([stake("cheaper", 300, 560, "a"), stake("cheaper", 300, 560, "b")]);
    const prices = marketPrices(s, stake("cheaper", 100, 560, "player"));
    expect(winner(s, prices).id).toBe("cheaper");
  });

  it("an option nobody backed is priced at its forecast", () => {
    const s = state([]);
    const prices = marketPrices(s, stake("current", 0, 0, "player"));
    expect(prices.cheaper).toBeCloseTo(418);
  });
});

describe("alternatives", () => {
  const councils: Coalition["partnerIds"][] = [["esa", "jaxa", "csa"], ["northrop-grumman", "airbus-defence-space", "spacex"]];

  it("always offers a cheaper design and an upgrade that both fly, on every mission", () => {
    for (const m of game.missions)
      for (const partnerIds of councils) {
        const d = defaultDesign(m.id, { leadId: "nasa", partnerIds }, game);
        const s = runMarket(d, partnerIds.map(actor), game, undefined, quick);
        expect(s.options.map((o) => o.kind), m.id).toEqual(["current", "cheaper", "upgrade"]);
        const cost = (x: MissionDesign) => computeResources(x, game).budget.used;
        const [current, cheaper, upgrade] = s.options;
        expect(cost(cheaper.design), m.id).toBeLessThan(cost(current.design));
        expect(cost(upgrade.design), m.id).toBeGreaterThan(cost(current.design));
        for (const o of s.options) expect(validateDesign(o.design, game).filter((i) => i.severity === "blocker"), `${m.id} ${o.label}`).toEqual([]);
        expect(s.market.options).toHaveLength(3);
      }
  });

  it("a bare minimum design still gets both alternatives", () => {
    const d = defaultDesign("orbital-lab", { leadId: "nasa", partnerIds: ["esa", "jaxa", "csa"] }, game);
    const s = runMarket(d, ["esa", "jaxa", "csa"].map(actor), game, undefined, quick);
    expect(s.options.length).toBeGreaterThanOrEqual(3);
    expect(s.options.find((o) => o.kind === "upgrade")?.label).toMatch(/^(Add|Swap to|Launch on) /);
  });
});

describe("bot stakes", () => {
  const options = [option("current", 500, 0.7), option("cheaper", 480, 0.72), option("upgrade", 520, 0.6)];

  it("every partner stakes play credits on the option it believes in", () => {
    const stakes = botStakes(["isro", "nasa", "ula"].map(actor), options, "market-x");
    expect(stakes).toHaveLength(3);
    for (const s of stakes) {
      expect(s.credits).toBeGreaterThanOrEqual(30);
      expect(s.credits).toBeLessThanOrEqual(150);
      expect(options.map((o) => o.id)).toContain(s.optionId);
    }
    expect(botStakes(["isro", "nasa", "ula"].map(actor), options, "market-x")).toEqual(stakes);
  });

  it("leans follow priorities: a frugal agency backs the cheaper option more often than a science-first one", () => {
    let frugal = 0;
    let curious = 0;
    for (let i = 0; i < 60; i++) {
      const [isro, nasa] = botStakes([actor("isro"), actor("nasa")], options, `m${i}`);
      if (isro.optionId === "cheaper") frugal++;
      if (nasa.optionId === "cheaper") curious++;
    }
    expect(frugal).toBeGreaterThan(curious);
  });
});

describe("settlement after the flight", () => {
  const stakes = [stake("upgrade", 100, 600, "player"), stake("upgrade", 50, 600 + SETTLE_SCALE, "far"), stake("current", 80, 500, "other")];

  it("pays stakes on the adopted option by accuracy and refunds the rest", () => {
    const s = settle(stakes, "upgrade", { seed: 7, score: { total: 600 } as never });
    const by = (id: string) => s.payouts.find((p) => p.actorId === id)!;
    expect(by("player")).toMatchObject({ returned: 200, net: 100, refunded: false, accuracy: 1 });
    expect(by("far")).toMatchObject({ returned: 50, net: 0, refunded: false });
    expect(by("other")).toMatchObject({ returned: 80, net: 0, refunded: true });
  });

  it("a crash far from every forecast loses the stakes on the adopted design", () => {
    const s = settle(stakes, "upgrade", { seed: 7, score: { total: 120 } as never });
    expect(s.payouts.find((p) => p.actorId === "player")?.returned).toBe(0);
  });

  it("the ledger settles once, and only against the design the market adopted", () => {
    const d = defaultDesign("orbital-lab", { leadId: "nasa", partnerIds: ["esa", "jaxa", "csa"] }, game);
    const ledger = useLedger.getState();
    ledger.close({ marketId: "m1", missionId: d.missionId, designKey: designKey(d), adoptedId: "current", adoptedLabel: "Fly as designed", price: 600, stakes: [stake("current", 100, 650, "nasa")], playerId: "nasa" });
    const changed = { ...d, launchVehicleId: "falcon-heavy" };
    const first = useLedger.getState().settleLatest({ seed: 1, score: { total: 650 } as never }, changed);
    expect(first?.settlement?.sameDesign).toBe(false);
    expect(first?.settlement?.payouts[0]).toMatchObject({ refunded: true, net: 0 });
    expect(useLedger.getState().settleLatest({ seed: 2, score: { total: 650 } as never }, d)).toBeUndefined();

    ledger.close({ marketId: "m2", missionId: d.missionId, designKey: designKey(d), adoptedId: "current", adoptedLabel: "Fly as designed", price: 600, stakes: [stake("current", 100, 650, "nasa")], playerId: "nasa" });
    const second = useLedger.getState().settleLatest({ seed: 3, score: { total: 650 } as never }, { ...d, moduleIds: [...d.moduleIds].reverse() });
    expect(second?.settlement?.payouts[0]).toMatchObject({ refunded: false, net: 100 });
  });
});
