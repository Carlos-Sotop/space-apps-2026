import { describe, expect, it } from "vitest";
import { allowedCalls, pollAllGo, seatVerdict, type ReadinessVote } from "./index";

const vote = (actorId: string, verdict: ReadinessVote["verdict"]): ReadinessVote => ({ actorId, verdict, check: "mass", reason: "r", numbers: "1 kg" });

describe("team play on one screen", () => {
  it("a player can hold any seat, but cannot call GO over the numbers' NO-GO", () => {
    expect(allowedCalls(vote("a", "go"))).toEqual(["go", "no-go"]);
    expect(allowedCalls(vote("a", "go-with-condition"))).toEqual(["go", "no-go"]);
    expect(allowedCalls(vote("a", "no-go"))).toEqual(["no-go"]);
    expect(seatVerdict(vote("a", "no-go"), ["a"], { a: "go" })).toBeUndefined();
  });

  it("a seat with a player counts its player's call; the others count their console", () => {
    const votes = [vote("lead", "go"), vote("p1", "go-with-condition"), vote("p2", "go"), vote("p3", "go")];
    expect(pollAllGo(votes)).toBe(false);
    expect(pollAllGo(votes, ["lead", "p1"], { lead: "go" })).toBe(false);
    expect(pollAllGo(votes, ["lead", "p1"], { lead: "go", p1: "go" })).toBe(true);
    expect(pollAllGo(votes, ["lead", "p1"], { lead: "no-go", p1: "go" })).toBe(false);
    expect(seatVerdict(votes[2], ["lead"], {})).toBe("go");
    expect(seatVerdict(votes[0], ["lead"], {})).toBeUndefined();
  });
});
