// Optional Solana devnet record of a ratified mission. Play only, test network only.
// Place <ChainReceipt design={design} ratification={ratification} /> where the debrief shows the signatures.
export { ChainReceipt } from "./ChainReceipt";
export { useChainAnchor, type ChainAnchorState } from "./useChainAnchor";
export { anchorRatification, ANCHOR_DEADLINE_MS, DEVNET_RPC } from "./client";
export type { AnchorFailure, AnchorNotRecorded, AnchorReceipt, AnchorRecorded, AnchorRequest, AnchorResult, AnchorTicket } from "./types";
