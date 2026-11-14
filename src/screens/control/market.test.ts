import { describe, expect, it } from "vitest";
import { catalog as game } from "@/data";
import { computeResources, defaultDesign, validateDesign } from "@/engine";
import type { Actor, Coalition, Forecast, MissionDesign } from "@/engine/types";
import { botTrades, designKey, lmsrTrade, openBook, reputationWeight, runMarket, settle, trade, useLedger, winner, LMSR_B, type MarketOption } from "./market";

const fc = (expectedScore: number, successProbability = 0.6): Forecast => ({ successProbability, expectedScore, p10: 0, p90: 0, runs: 100 });
const design = {} as MissionDesign;
const option = (id: "current" | "cheaper" | "upgrade", score: number, success = 0.6): MarketOption => ({ id, kind: id, label: id, delta: "", design, forecast: fc(score, success) });
const actor = (id: string) => game.actors.find((a) => a.id === id) as Actor;
const quick = { screen: 6, price: 12 };
const logit = (p: number) => Math.log(p / (1 - p));

describe("LMSR market maker", () => {
  it("buying higher costs what the scoring rule says and moves the price to the trader's belief", () => {
    const t = lmsrTrade(466, 600, 1000)!;
    expect(t.side).toBe("higher");
    expect(t.to).toBeCloseTo(600, 6);
    expect(t.credits).toBeCloseTo(LMSR_B * Math.log((1 - 0.466) / (1 - 0.6)), 6);
    expect(t.shares).toBeCloseTo(LMSR_B * (logit(0.6) - logit(0.466)), 6);
  });

  it("a small budget is spent in full and stops short of the belief", () => {
    const t = lmsrTrade(466, 600, 50)!;
    expect(t.credits).toBe(50);
    expect(t.to).toBeGreaterThan(466);
    expect(t.to).toBeLessThan(600);
  });

  it("lower moves the price down; no budget or no disagreement means no trade", () => {
    const t = lmsrTrade(466, 400, 1000)!;
    expect(t.side).toBe("lower");
    expect(t.to).toBeCloseTo(400, 6);
    expect(lmsrTrade(466, 600, 0)).toBeUndefined();
    expect(lmsrTrade(466, 466, 100)).toBeUndefined();
  });
});

describe("decision", () => {
  const options = [option("current", 466), option("cheaper", 418)];

  it("an untraded option is priced at its forecast", () => {
    expect(openBook(options).prices.cheaper).toBeCloseTo(418);
  });

  it("one optimistic trade cannot overturn a clear forecast gap", () => {
    let book = openBook(options);
    book = trade(book, "a", "current", 450, 60);
    book = trade(book, "b", "current", 470, 80);
    book = trade(book, "c", "cheaper", 484, 70);
    book = trade(book, "player", "current", 1000, 100);
    expect(winner(options, book.prices).id).toBe("current");
  });

  it("enough conviction on the other option moves the decision", () => {
    let book = openBook(options);
    book = trade(book, "a", "cheaper", 560, 300);
    book = trade(book, "b", "cheaper", 1000, 100);
    expect(winner(options, book.prices).id).toBe("cheaper");
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

  it("a bare minimum design still gets an upgrade", () => {
    const d = defaultDesign("orbital-lab", { leadId: "nasa", partnerIds: ["esa", "jaxa", "csa"] }, game);
    const s = runMarket(d, ["esa", "jaxa", "csa"].map(actor), game, undefined, quick);
    expect(s.options.find((o) => o.kind === "upgrade")?.label).toMatch(/^(Add|Swap to|Launch on) /);
  });
});

describe("bot trades", () => {
  const options = [option("current", 500, 0.7), option("cheaper", 480, 0.72), option("upgrade", 520, 0.6)];

  it("each partner spends play credits where it disagrees most with the market, the same way every time", () => {
    const book = botTrades(["isro", "nasa", "ula"].map(actor), options, "market-x", openBook(options));
    expect(book.trades.length).toBeGreaterThan(0);
    for (const t of book.trades) {
      expect(t.credits).toBeGreaterThan(0);
      expect(t.credits).toBeLessThanOrEqual(150);
    }
    expect(botTrades(["isro", "nasa", "ula"].map(actor), options, "market-x", openBook(options))).toEqual(book);
  });

  it("leans follow priorities: a frugal agency backs the cheaper option more often than a science-first one", () => {
    let frugal = 0;
    let curious = 0;
    for (let i = 0; i < 60; i++) {
      const backs = (id: string) => botTrades([actor(id)], options, `m${i}`, openBook(options)).trades.some((t) => t.optionId === "cheaper" && t.side === "higher");
      if (backs("isro")) frugal++;
      if (backs("nasa")) curious++;
    }
    expect(frugal).toBeGreaterThan(curious);
  });

  it("a better record means a bigger budget, from half to double", () => {
    expect(reputationWeight(0)).toBe(1);
    expect(reputationWeight(500)).toBe(2);
    expect(reputationWeight(5000)).toBe(2);
    expect(reputationWeight(-5000)).toBe(0.5);
  });
});

describe("settlement after the flight", () => {
  const options = [option("current", 466), option("upgrade", 500)];
  const book = trade(trade(openBook(options), "player", "upgrade", 1000, 100), "rival", "current", 0, 80);

  it("higher shares pay score/1000, and trades in options the council did not adopt come back", () => {
    const s = settle(book.trades, "upgrade", { seed: 7, score: { total: 900 } as never });
    const player = s.payouts.find((p) => p.actorId === "player")!;
    const rival = s.payouts.find((p) => p.actorId === "rival")!;
    expect(player.refunded).toBe(false);
    expect(player.returned).toBeCloseTo(book.trades[0].shares * 0.9, 6);
    expect(player.net).toBeGreaterThan(0);
    expect(rival).toMatchObject({ refunded: true, net: 0, returned: 80 });
  });

  it("a crash far below the price loses the higher bets", () => {
    const s = settle(book.trades, "upgrade", { seed: 7, score: { total: 120 } as never });
    expect(s.payouts.find((p) => p.actorId === "player")!.net).toBeLessThan(-50);
  });

  it("the ledger settles once, only against the adopted design, and keeps each forecaster's record", () => {
    const d = defaultDesign("orbital-lab", { leadId: "nasa", partnerIds: ["esa", "jaxa", "csa"] }, game);
    const close = (id: string) => useLedger.getState().close({
      marketId: id, missionId: d.missionId, designKey: designKey(d), adoptedId: "upgrade", adoptedLabel: "upgrade",
      prices: book.prices, trades: book.trades, playerId: "player",
    });
    close("m1");
    const changed = useLedger.getState().settleLatest({ seed: 1, score: { total: 900 } as never }, { ...d, launchVehicleId: "falcon-heavy" });
    expect(changed?.settlement?.sameDesign).toBe(false);
    expect(changed?.settlement?.payouts.every((p) => p.refunded)).toBe(true);
    expect(useLedger.getState().settleLatest({ seed: 2, score: { total: 900 } as never }, d)).toBeUndefined();
    expect(useLedger.getState().reputation.player).toBeUndefined();

    close("m2");
    const flown = useLedger.getState().settleLatest({ seed: 3, score: { total: 900 } as never }, { ...d, moduleIds: [...d.moduleIds].reverse() });
    const net = flown!.settlement!.payouts.find((p) => p.actorId === "player")!.net;
    expect(net).toBeGreaterThan(0);
    expect(useLedger.getState().reputation.player).toEqual({ net, markets: 1 });
    expect(useLedger.getState().reputation.rival).toBeUndefined();
  });
});
