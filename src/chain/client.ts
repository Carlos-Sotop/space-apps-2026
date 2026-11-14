// Browser side of the optional Solana devnet record. Never throws: every failure is a "not recorded" answer.
// 1. read a recent blockhash from devnet, 2. the Worker relayer checks the record and signs one Memo transaction,
// 3. broadcast it to devnet, 4. wait for "confirmed". The whole thing stops at ANCHOR_DEADLINE_MS.
import type { MissionDesign, Ratification } from "@/engine/types";
import { ANCHOR_MESSAGES } from "./messages";
import type { AnchorFailure, AnchorNotRecorded, AnchorRequest, AnchorResult, AnchorTicket } from "./types";

/** Devnet only. The public endpoint answers browsers (CORS) and refuses Cloudflare Workers (measured 2026-11-14). */
export const DEVNET_RPC = "https://api.devnet.solana.com";
export const ANCHOR_PATH = "/api/chain/anchor";
export const ANCHOR_DEADLINE_MS = 12_000;

export interface AnchorClientOptions {
  fetch: (url: string, init: RequestInit) => Promise<Response>;
  now: () => number;
  sleep: (ms: number) => Promise<void>;
  rpcUrl: string;
  deadlineMs: number;
  /** one request to devnet or to the Worker */
  callTimeoutMs: number;
  pollMs: number;
}

const DEFAULTS: AnchorClientOptions = {
  fetch: (url, init) => fetch(url, init),
  now: () => Date.now(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  rpcUrl: DEVNET_RPC,
  deadlineMs: ANCHOR_DEADLINE_MS,
  callTimeoutMs: 5000,
  pollMs: 700,
};

class Stop extends Error {
  readonly reason: AnchorFailure;
  constructor(reason: AnchorFailure) {
    super(reason);
    this.reason = reason;
  }
}

const REASONS = new Set(Object.keys(ANCHOR_MESSAGES));
const EXPLORER_TX = "https://explorer.solana.com/tx/";

function isFailure(v: unknown): v is AnchorNotRecorded {
  const r = v as Record<string, unknown> | null;
  return typeof r === "object" && r !== null && r.recorded === false && typeof r.reason === "string" && REASONS.has(r.reason) && typeof r.message === "string";
}

function ticketOf(v: unknown, manifestHash: string): AnchorTicket | null {
  const t = (v as { ticket?: Record<string, unknown> } | null)?.ticket;
  if (typeof t !== "object" || t === null) return null;
  const strings = ["transaction", "txSignature", "explorerUrl", "memo", "manifestHash", "councilDigest", "relayer"] as const;
  if (t.network !== "solana-devnet" || !strings.every((k) => typeof t[k] === "string")) return null;
  const explorerUrl = t.explorerUrl as string;
  if (!explorerUrl.startsWith(EXPLORER_TX) || !explorerUrl.endsWith("?cluster=devnet") || t.manifestHash !== manifestHash) return null;
  return t as unknown as AnchorTicket;
}

const isTimeout = (e: unknown) => {
  const name = (e as { name?: string } | null)?.name;
  return name === "TimeoutError" || name === "AbortError";
};

/** Records the ratified manifest on Solana devnet through the Worker relayer. */
export async function anchorRatification(design: MissionDesign, ratification: Ratification, options: Partial<AnchorClientOptions> = {}): Promise<AnchorResult> {
  const o: AnchorClientOptions = { ...DEFAULTS, ...options };
  const deadline = o.now() + o.deadlineMs;

  /** POSTs JSON and reads JSON back; `offline` is the reason used when the call cannot be made at all. */
  async function postJson(url: string, body: unknown, offline: AnchorFailure): Promise<{ res: Response; data: unknown }> {
    const left = deadline - o.now();
    if (left <= 0) throw new Stop("timeout");
    try {
      const res = await o.fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(Math.min(o.callTimeoutMs, left)),
      });
      if (!(res.headers.get("content-type") ?? "").includes("json")) throw new Stop(offline);
      return { res, data: await res.json() };
    } catch (e) {
      if (e instanceof Stop) throw e;
      throw new Stop(isTimeout(e) ? "timeout" : offline);
    }
  }

  async function rpc<T>(method: string, params: unknown[]): Promise<T> {
    const { res, data } = await postJson(o.rpcUrl, { jsonrpc: "2.0", id: 1, method, params }, "rpc-error");
    const body = data as { result?: T; error?: { message?: string } } | null;
    if (body?.error) {
      // a second tab may have broadcast the same transaction first: that is still one record
      if (method === "sendTransaction" && /already (been )?processed/i.test(body.error.message ?? "")) return undefined as T;
      throw new Stop(method === "sendTransaction" ? "rejected" : "rpc-error");
    }
    if (!res.ok || body?.result === undefined) throw new Stop("rpc-error");
    return body.result;
  }

  try {
    const latest = await rpc<{ value?: { blockhash?: unknown } }>("getLatestBlockhash", [{ commitment: "confirmed" }]);
    const blockhash = latest.value?.blockhash;
    if (typeof blockhash !== "string") throw new Stop("rpc-error");

    const request: AnchorRequest = { design, ratification: { manifestHash: ratification.manifestHash, signatures: ratification.signatures }, blockhash };
    const { data } = await postJson(ANCHOR_PATH, request, "unreachable");
    if (isFailure(data)) return data;
    const ticket = ticketOf(data, ratification.manifestHash);
    if (!ticket) throw new Stop("unreachable");

    await rpc<string>("sendTransaction", [ticket.transaction, { encoding: "base64", preflightCommitment: "confirmed" }]);
    while (o.now() + o.pollMs < deadline) {
      await o.sleep(o.pollMs);
      let status: { err?: unknown; confirmationStatus?: string } | null | undefined;
      try {
        status = (await rpc<{ value?: ({ err?: unknown; confirmationStatus?: string } | null)[] }>("getSignatureStatuses", [[ticket.txSignature]])).value?.[0];
      } catch {
        continue; // a missed poll is not a failure; the deadline decides
      }
      if (status?.err) throw new Stop("rejected");
      if (status?.confirmationStatus === "confirmed" || status?.confirmationStatus === "finalized") {
        const { transaction: _sent, ...receipt } = ticket;
        return { recorded: true, ...receipt };
      }
    }
    throw new Stop("timeout");
  } catch (e) {
    const reason: AnchorFailure = e instanceof Stop ? e.reason : "unreachable";
    return { recorded: false, reason, message: ANCHOR_MESSAGES[reason] };
  }
}
