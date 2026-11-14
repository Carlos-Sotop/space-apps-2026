import type { Bet } from "../types";

/** Tokens staked on each proposal. */
export function stakesByProposal(bets: Bet[]): Map<string, number> {
  const stakes = new Map<string, number>();
  for (const b of bets) stakes.set(b.proposalId, (stakes.get(b.proposalId) ?? 0) + b.tokens);
  return stakes;
}

/** The fund backs the proposals with the most tokens on them. Ties go to the one listed first. */
export function pickFunded(bets: Bet[], proposalIds: string[], slots: number): string[] {
  const stakes = stakesByProposal(bets);
  return proposalIds
    .map((id, order) => ({ id, order, staked: stakes.get(id) ?? 0 }))
    .sort((a, b) => b.staked - a.staked || a.order - b.order)
    .slice(0, slots)
    .map((p) => p.id);
}

/**
 * Settles a round after the funded proposals have flown.
 * Bets on proposals that were not funded are refunded.
 * Tokens on funded proposals go into one pool, which is paid out by each proposal's flight score,
 * then by each player's share of the tokens on that proposal.
 * If every funded proposal scored zero, everyone gets their tokens back.
 * Returns the tokens each player gets back.
 */
export function settle(bets: Bet[], funded: string[], scores: Record<string, number>): Record<string, number> {
  const payouts: Record<string, number> = {};
  const pay = (playerId: string, tokens: number) => {
    payouts[playerId] = (payouts[playerId] ?? 0) + tokens;
  };
  const fundedSet = new Set(funded);
  const fundedBets = bets.filter((b) => fundedSet.has(b.proposalId));
  for (const b of bets) if (!fundedSet.has(b.proposalId)) pay(b.playerId, b.tokens);

  const stakes = stakesByProposal(fundedBets);
  const pool = fundedBets.reduce((a, b) => a + b.tokens, 0);
  const scoreOf = (id: string) => Math.max(0, scores[id] ?? 0);
  const totalScore = [...stakes.keys()].reduce((a, id) => a + scoreOf(id), 0);

  for (const b of fundedBets) {
    const staked = stakes.get(b.proposalId) ?? 0;
    const proposalShare = totalScore > 0 ? scoreOf(b.proposalId) / totalScore : staked / pool;
    pay(b.playerId, pool * proposalShare * (b.tokens / staked));
  }
  return payouts;
}
