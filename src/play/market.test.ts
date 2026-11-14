import { describe, expect, it } from "vitest";
import type { Bet } from "../types";
import { pickFunded, settle } from "./market";

const bets: Bet[] = [
  { playerId: "ana", proposalId: "a", tokens: 100 },
  { playerId: "ben", proposalId: "b", tokens: 100 },
  { playerId: "cai", proposalId: "c", tokens: 50 },
  { playerId: "dee", proposalId: "a", tokens: 100 },
];

describe("pickFunded", () => {
  it("backs the proposals with the most tokens", () => {
    expect(pickFunded(bets, ["a", "b", "c"], 2)).toEqual(["a", "b"]);
  });
});

describe("settle", () => {
  it("refunds bets on proposals that were not funded", () => {
    const payouts = settle(bets, ["a", "b"], { a: 10, b: 10 });
    expect(payouts.cai).toBe(50);
  });

  it("pays more for backing the proposal that scored higher", () => {
    const payouts = settle(bets, ["a", "b"], { a: 30, b: 10 });
    // pool 300: a gets 3/4 = 225 split between ana and dee, b gets 75
    expect(payouts.ana).toBeCloseTo(112.5);
    expect(payouts.dee).toBeCloseTo(112.5);
    expect(payouts.ben).toBeCloseTo(75);
  });

  it("never creates or destroys tokens", () => {
    const payouts = settle(bets, ["a", "b"], { a: 7, b: 3 });
    const paid = Object.values(payouts).reduce((x, y) => x + y, 0);
    expect(paid).toBeCloseTo(350);
  });

  it("gives everyone their tokens back when every funded flight scored zero", () => {
    const payouts = settle(bets, ["a", "b"], { a: 0, b: 0 });
    expect(payouts).toEqual({ ana: 100, ben: 100, cai: 50, dee: 100 });
  });
});
