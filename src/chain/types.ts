// The optional Solana devnet record of a ratified mission, shared by the Worker (worker/chain.ts) and the browser.
// Play only, test network only. The Worker relayer signs and pays for one Memo transaction; the browser broadcasts it,
// because devnet's public RPC refuses requests that come from Cloudflare Workers.
import type { CouncilSignature, MissionDesign } from "@/engine/types";

/** Body of POST /api/chain/anchor. */
export interface AnchorRequest {
  /** the flown design; the Worker recomputes its manifest hash */
  design: MissionDesign;
  ratification: { manifestHash: string; signatures: CouncilSignature[] };
  /** a recent devnet blockhash, base58, read by the browser */
  blockhash: string;
}

export type AnchorFailure =
  /** no SOLANA_RELAYER_SECRET on this server */
  | "not-configured"
  | "rate-limited"
  /** Solana devnet did not answer, or did not confirm, in time */
  | "timeout"
  /** Solana devnet answered with an error */
  | "rpc-error"
  /** Solana devnet refused the transaction */
  | "rejected"
  /** missing fields, a hash that does not match the design, or an incomplete council */
  | "bad-request"
  /** the Worker did not answer (offline, or the app runs without its Worker) */
  | "unreachable";

export interface AnchorReceipt {
  network: "solana-devnet";
  /** base58 transaction signature */
  txSignature: string;
  /** Solana Explorer link with ?cluster=devnet */
  explorerUrl: string;
  /** the exact text the Memo program writes */
  memo: string;
  /** SHA-256 of the canonical design JSON, hex */
  manifestHash: string;
  /** SHA-256 of the canonical JSON of the council signatures, hex */
  councilDigest: string;
  /** base58 address of the relayer that signs and pays for the transaction */
  relayer: string;
}

/** The Worker's answer: one Memo transaction, signed by the relayer, ready for sendTransaction. */
export interface AnchorTicket extends AnchorReceipt {
  /** base64 wire transaction */
  transaction: string;
}

export interface AnchorNotRecorded {
  recorded: false;
  reason: AnchorFailure;
  /** one plain line for the UI */
  message: string;
  retryAfterS?: number;
}

/** What POST /api/chain/anchor answers. */
export type AnchorTicketAnswer = { ticket: AnchorTicket } | AnchorNotRecorded;

export interface AnchorRecorded extends AnchorReceipt {
  recorded: true;
}

/** The end result the debrief shows. */
export type AnchorResult = AnchorRecorded | AnchorNotRecorded;
