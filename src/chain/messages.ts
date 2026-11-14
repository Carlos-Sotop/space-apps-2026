import type { AnchorFailure } from "./types";

/** One plain line per reason a mission was not recorded. Shared by the Worker and the browser. */
export const ANCHOR_MESSAGES: Record<AnchorFailure, string> = {
  "not-configured": "The chain relayer is not set up on this server.",
  "rate-limited": "Too many records in a short time. Try again in a minute.",
  timeout: "Solana devnet did not answer in time.",
  "rpc-error": "Solana devnet could not take the record right now.",
  rejected: "Solana devnet refused the record.",
  "bad-request": "The flight record is incomplete.",
  unreachable: "The chain record service did not answer.",
};
