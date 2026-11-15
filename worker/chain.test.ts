import { describe, expect, it } from "vitest";
import { ed25519 } from "@noble/curves/ed25519.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { utf8ToBytes } from "@noble/hashes/utils.js";
import { canonicalJson as browserCanonicalJson, manifestHash, signManifest } from "../src/crypto/index.ts";
import type { MissionDesign, Ratification } from "../src/engine/types.ts";
import { anchorRatification, ANCHOR_PATH, DEVNET_RPC, type AnchorClientOptions } from "../src/chain/client.ts";
import type { AnchorTicketAnswer } from "../src/chain/types.ts";
import {
  base58Decode,
  base58Encode,
  canonicalJson,
  checkAnchorRequest,
  councilDigestOf,
  createChainRoutes,
  explorerTxUrl,
  manifestHashOf,
  MEMO_PROGRAM_ID,
  memoMessage,
  memoText,
  parseRelayerSecret,
  shortVec,
  signedTransaction,
  TICKET_REUSE_MS,
  type ChainOptions,
} from "./chain.ts";

// Test-only relayer, derived from a public phrase. Never funded; no test touches a network.
const SEED = sha256(utf8ToBytes("spacedao test relayer, devnet only, never funded"));
const RELAYER_PUBLIC = ed25519.getPublicKey(SEED);
const SECRET = base58Encode(new Uint8Array([...SEED, ...RELAYER_PUBLIC]));
const BLOCKHASH = base58Encode(sha256(utf8ToBytes("a devnet blockhash")));
const env = { SOLANA_RELAYER_SECRET: SECRET };

function makeDesign(moduleIds = ["bus-a", "solar-b", "drill"]): MissionDesign {
  return {
    missionId: "moon-base-zero",
    coalition: { leadId: "nasa", partnerIds: ["esa", "jaxa", "isro"] },
    values: { science: 1 / 3, safety: 1 / 3, cost: 1 / 3 },
    secondaryObjectiveIds: ["ice-map"],
    destinationId: "shackleton-ridge",
    launchVehicleId: "falcon-heavy",
    moduleIds,
    blueprintIds: [],
    rideshareIds: [],
  };
}

function ratify(design: MissionDesign): Ratification {
  const hash = manifestHash(design);
  const ids = [design.coalition.leadId, ...design.coalition.partnerIds];
  return { manifestHash: hash, signatures: ids.map((id) => signManifest(hash, id)) };
}

const design = makeDesign();
const ratification = ratify(design);

const anchorBody = (d: MissionDesign = design, r: Ratification = ratification, blockhash = BLOCKHASH) => ({ design: d, ratification: r, blockhash });

describe("base58", () => {
  it("round-trips Solana addresses", () => {
    const memo = base58Decode(MEMO_PROGRAM_ID);
    expect(memo.length).toBe(32);
    expect(base58Encode(memo)).toBe(MEMO_PROGRAM_ID);
    expect(base58Decode("11111111111111111111111111111111")).toEqual(new Uint8Array(32));
    expect(base58Encode(new Uint8Array(32))).toBe("11111111111111111111111111111111");
  });
  it("matches the reference vector and keeps leading zeros", () => {
    expect(base58Encode(utf8ToBytes("hello world"))).toBe("StV1DL6CwTryKyV");
    expect(base58Encode(Uint8Array.of(0, 0, 1))).toBe("112");
    const bytes = sha256(utf8ToBytes("round trip"));
    expect(base58Decode(base58Encode(bytes))).toEqual(bytes);
  });
  it("rejects characters outside the alphabet", () => {
    expect(() => base58Decode("0OIl")).toThrow();
  });
});

describe("compact-u16", () => {
  it("encodes Solana length prefixes", () => {
    expect([...shortVec(0)]).toEqual([0]);
    expect([...shortVec(127)]).toEqual([0x7f]);
    expect([...shortVec(128)]).toEqual([0x80, 0x01]);
    expect([...shortVec(16_383)]).toEqual([0xff, 0x7f]);
    expect([...shortVec(16_384)]).toEqual([0x80, 0x80, 0x01]);
  });
});

describe("manifest hash", () => {
  it("is the same hash the council signs in the browser", () => {
    expect(manifestHashOf(design)).toBe(manifestHash(design));
    expect(manifestHashOf(design)).toMatch(/^[0-9a-f]{64}$/);
    const nested = { b: [3, 2, { y: 1, x: 2 }], a: "moon", c: undefined, d: [undefined, null, -0] };
    expect(canonicalJson(nested)).toBe(browserCanonicalJson(nested));
  });
  it("survives the JSON trip from the browser and ignores key order", () => {
    expect(manifestHashOf(JSON.parse(JSON.stringify(design)))).toBe(manifestHash(design));
    const reordered = Object.fromEntries(Object.entries(design).reverse());
    expect(manifestHashOf(reordered)).toBe(manifestHash(design));
  });
  it("changes when the design changes", () => {
    expect(manifestHashOf(makeDesign(["bus-a", "solar-b"]))).not.toBe(manifestHashOf(design));
  });
});

describe("council digest", () => {
  it("covers both schemes of every signature", () => {
    const digest = councilDigestOf(ratification.signatures);
    expect(digest).toMatch(/^[0-9a-f]{64}$/);
    expect(councilDigestOf(structuredClone(ratification.signatures))).toBe(digest);
    const tampered = structuredClone(ratification.signatures);
    const pq = tampered[2].postQuantum!;
    pq.signature = (pq.signature[0] === "0" ? "1" : "0") + pq.signature.slice(1);
    expect(councilDigestOf(tampered)).not.toBe(digest);
  });
  it("ignores fields that are not part of a signature", () => {
    const extra = ratification.signatures.map((s) => ({ ...s, note: "not signed" }));
    expect(councilDigestOf(extra)).toBe(councilDigestOf(ratification.signatures));
  });
});

describe("memo text", () => {
  const fields = { missionId: "moon-base-zero", manifestHash: "a".repeat(64), councilDigest: "b".repeat(64), signed: 4, seats: 4, postQuantum: true };
  it("names the mission, both hashes and the signers", () => {
    expect(memoText(fields)).toBe(
      `SpaceDAO mission record v1 mission=moon-base-zero manifest=${"a".repeat(64)} council=${"b".repeat(64)} signed=4/4 schemes=ed25519+ml-dsa-65`,
    );
    expect(memoText({ ...fields, postQuantum: false })).toMatch(/schemes=ed25519$/);
  });
  it("is short plain ASCII with no money words", () => {
    const memo = memoText(fields);
    expect(memo).toMatch(/^[\x20-\x7e]+$/);
    expect(memo.length).toBeLessThan(300);
    expect(memo).not.toMatch(/token|coin|price|invest|usd|\$|lamport/i);
  });
});

describe("memo transaction", () => {
  it("is one Memo instruction paid and signed by the relayer", () => {
    const memo = memoText({ missionId: "orbital-lab", manifestHash: "c".repeat(64), councilDigest: "d".repeat(64), signed: 4, seats: 4, postQuantum: true });
    const blockhash = base58Decode(BLOCKHASH);
    const message = memoMessage(RELAYER_PUBLIC, blockhash, memo);
    expect([...message.slice(0, 4)]).toEqual([1, 0, 1, 2]); // header, then 2 account keys
    expect(message.slice(4, 36)).toEqual(RELAYER_PUBLIC);
    expect(base58Encode(message.slice(36, 68))).toBe(MEMO_PROGRAM_ID);
    expect(message.slice(68, 100)).toEqual(blockhash);
    expect([...message.slice(100, 103)]).toEqual([1, 1, 0]); // 1 instruction, program index 1, no accounts
    expect([...message.slice(103, 105)]).toEqual([...shortVec(memo.length)]); // memo is over 127 bytes: 2-byte length
    expect(new TextDecoder().decode(message.slice(105))).toBe(memo);
    const signature = ed25519.sign(message, SEED);
    const tx = signedTransaction(message, signature);
    expect(tx[0]).toBe(1);
    expect(tx.slice(1, 65)).toEqual(signature);
    expect(tx.length).toBeLessThan(1232); // Solana's packet limit
  });
});

describe("relayer secret", () => {
  it("reads base58 keypairs, seeds and solana-keygen arrays", () => {
    const fromBase58 = parseRelayerSecret(SECRET);
    expect(fromBase58.seed).toEqual(SEED);
    expect(fromBase58.publicKey).toEqual(RELAYER_PUBLIC);
    expect(parseRelayerSecret(JSON.stringify([...SEED, ...RELAYER_PUBLIC])).seed).toEqual(SEED);
    const seedOnly = parseRelayerSecret(` ${base58Encode(SEED)}\n`);
    expect(seedOnly.seed).toEqual(SEED);
    expect(seedOnly.publicKey).toBeUndefined();
  });
  it("rejects bad input without echoing it", () => {
    expect(() => parseRelayerSecret(base58Encode(SEED.slice(0, 31)))).toThrow(/32 or 64 bytes/);
    let message = "";
    try {
      parseRelayerSecret("[1,2,oops-secret");
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).toMatch(/JSON byte array/);
    expect(message).not.toContain("oops");
  });
});

describe("request check", () => {
  it("accepts a full council and reports both schemes", () => {
    const checked = checkAnchorRequest(anchorBody());
    expect(typeof checked).toBe("object");
    if (typeof checked === "string") return;
    expect(checked.seats).toEqual(["nasa", "esa", "jaxa", "isro"]);
    expect(checked.postQuantum).toBe(true);
    expect(checked.councilDigest).toBe(councilDigestOf(ratification.signatures));
    expect(checked.blockhash).toEqual(base58Decode(BLOCKHASH));
  });
  it("refuses a hash that is not the design's, a missing seat, a stranger and a twice-signed seat", () => {
    expect(checkAnchorRequest(anchorBody(makeDesign(["bus-a"])))).toMatch(/does not match/);
    expect(checkAnchorRequest(anchorBody(design, { ...ratification, signatures: ratification.signatures.slice(0, 3) }))).toMatch(/must sign/);
    const stranger = { ...ratification.signatures[3], actorId: "kasa" };
    expect(checkAnchorRequest(anchorBody(design, { ...ratification, signatures: [...ratification.signatures.slice(0, 3), stranger] }))).toMatch(/once/);
    const twice = [...ratification.signatures.slice(0, 3), ratification.signatures[0]];
    expect(checkAnchorRequest(anchorBody(design, { ...ratification, signatures: twice }))).toMatch(/once/);
  });
  it("refuses malformed signatures, mission ids and blockhashes", () => {
    const shortPq = structuredClone(ratification.signatures);
    shortPq[1].postQuantum!.signature = shortPq[1].postQuantum!.signature.slice(2);
    expect(checkAnchorRequest(anchorBody(design, { ...ratification, signatures: shortPq }))).toMatch(/post-quantum/);
    const odd = { ...design, missionId: "Moon Base; drop" } as unknown as MissionDesign;
    expect(checkAnchorRequest(anchorBody(odd, { ...ratification, manifestHash: manifestHash(odd) }))).toMatch(/mission/);
    expect(checkAnchorRequest(anchorBody(design, ratification, "not-base58-0OIl"))).toMatch(/blockhash/);
    expect(checkAnchorRequest(anchorBody(design, ratification, base58Encode(new Uint8Array(31).fill(7))))).toMatch(/blockhash/);
    expect(checkAnchorRequest(null)).toMatch(/incomplete/);
  });
});

/* ------------------------- the Worker relayer ------------------------- */

const routes = (extra: Partial<ChainOptions> = {}) => createChainRoutes({ log: () => {}, ...extra });

const post = (body: unknown, headers: Record<string, string> = {}) =>
  new Request("https://spacedao.test/api/chain/anchor", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

async function call(r: ReturnType<typeof createChainRoutes>, request: Request, e: Record<string, string> = env) {
  const res = await r.handle(request, e);
  return { status: res.status, body: (await res.json()) as AnchorTicketAnswer };
}

function decodeTx(base64: string) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return { count: bytes[0], signature: bytes.slice(1, 65), message: bytes.slice(65) };
}

describe("/api/chain/anchor", () => {
  it("signs one Memo transaction that the relayer pays for", async () => {
    const { status, body } = await call(routes(), post(anchorBody()));
    expect(status).toBe(200);
    expect("ticket" in body).toBe(true);
    if (!("ticket" in body)) return;
    const t = body.ticket;
    expect(t.network).toBe("solana-devnet");
    expect(t.explorerUrl).toBe(`https://explorer.solana.com/tx/${t.txSignature}?cluster=devnet`);
    expect(t.explorerUrl).toBe(explorerTxUrl(t.txSignature));
    expect(t.manifestHash).toBe(ratification.manifestHash);
    expect(t.councilDigest).toBe(councilDigestOf(ratification.signatures));
    expect(t.memo).toBe(memoText({ missionId: "moon-base-zero", manifestHash: t.manifestHash, councilDigest: t.councilDigest, signed: 4, seats: 4, postQuantum: true }));
    expect(t.relayer).toBe(base58Encode(RELAYER_PUBLIC));

    const tx = decodeTx(t.transaction);
    expect(tx.count).toBe(1);
    expect(base58Encode(tx.signature)).toBe(t.txSignature);
    expect(ed25519.verify(tx.signature, tx.message, RELAYER_PUBLIC)).toBe(true);
    expect(tx.message.slice(4, 36)).toEqual(RELAYER_PUBLIC);
    expect(base58Encode(tx.message.slice(36, 68))).toBe(MEMO_PROGRAM_ID);
    expect(base58Encode(tx.message.slice(68, 100))).toBe(BLOCKHASH);
    expect(new TextDecoder().decode(tx.message.slice(105))).toBe(t.memo);
  });

  it("answers not recorded at once when the relayer key is missing", async () => {
    const started = Date.now();
    const { status, body } = await call(routes(), post(anchorBody()), {});
    expect(Date.now() - started).toBeLessThan(1000);
    expect(status).toBe(200);
    expect(body).toMatchObject({ recorded: false, reason: "not-configured" });
  });

  it("rate-limits each client address", async () => {
    const r = routes({ perIpPerMinute: 2 });
    const ip = { "cf-connecting-ip": "203.0.113.7" };
    const designs = [["a"], ["b"], ["c"]].map((ids) => makeDesign(ids));
    for (const d of designs.slice(0, 2)) expect("ticket" in (await call(r, post(anchorBody(d, ratify(d)), ip))).body).toBe(true);
    const third = designs[2];
    const limited = await call(r, post(anchorBody(third, ratify(third)), ip));
    expect(limited.status).toBe(200);
    expect(limited.body).toMatchObject({ recorded: false, reason: "rate-limited" });
    expect("retryAfterS" in limited.body && limited.body.retryAfterS).toBeGreaterThan(0);
    const other = await call(r, post(anchorBody(third, ratify(third)), { "cf-connecting-ip": "203.0.113.8" }));
    expect("ticket" in other.body).toBe(true);
  });

  it("gives a repeat of the same signing the same transaction for a short while", async () => {
    let clock = 1_000_000;
    const r = routes({ now: () => clock });
    const [a, b] = await Promise.all([call(r, post(anchorBody())), call(r, post(anchorBody()))]);
    const later = await call(r, post(anchorBody(design, ratification, base58Encode(sha256(utf8ToBytes("newer blockhash"))))));
    clock += TICKET_REUSE_MS + 1;
    const fresh = await call(r, post(anchorBody(design, ratification, base58Encode(sha256(utf8ToBytes("newest blockhash"))))));
    if (!("ticket" in a.body) || !("ticket" in b.body) || !("ticket" in later.body) || !("ticket" in fresh.body)) throw new Error("expected tickets");
    expect(b.body.ticket.txSignature).toBe(a.body.ticket.txSignature);
    expect(later.body.ticket.txSignature).toBe(a.body.ticket.txSignature);
    expect(fresh.body.ticket.txSignature).not.toBe(a.body.ticket.txSignature);
  });

  it("refuses bad records", async () => {
    const r = routes();
    const mismatch = await call(r, post(anchorBody(makeDesign(["bus-a"]))));
    expect(mismatch.status).toBe(400);
    expect(mismatch.body).toMatchObject({ recorded: false, reason: "bad-request" });

    const forged = structuredClone(ratification);
    const c = forged.signatures[0].classical;
    c.signature = (c.signature[0] === "0" ? "1" : "0") + c.signature.slice(1);
    const bad = await call(r, post(anchorBody(design, forged)));
    expect(bad.status).toBe(400);
    expect("message" in bad.body && bad.body.message).toMatch(/signature/);

    expect((await call(r, post("{not json"))).status).toBe(400);
    expect((await call(r, post({ design, ratification }))).status).toBe(400); // no blockhash
  });

  it("refuses other sites, other methods and unknown paths", async () => {
    const r = routes();
    expect((await call(r, post(anchorBody(), { origin: "https://elsewhere.example" }))).status).toBe(403);
    expect((await call(r, post(anchorBody(), { origin: "https://spacedao.test" }))).status).toBe(200);
    expect((await r.handle(new Request("https://spacedao.test/api/chain/anchor"), env)).status).toBe(405);
    expect((await r.handle(new Request("https://spacedao.test/api/chain/other"), env)).status).toBe(404);
  });

  it("reports an unreadable relayer key as not configured", async () => {
    const wrongHalves = base58Encode(new Uint8Array([...SEED, ...new Uint8Array(32)]));
    const { body } = await call(routes(), post(anchorBody()), { SOLANA_RELAYER_SECRET: wrongHalves });
    expect(body).toMatchObject({ recorded: false, reason: "not-configured" });
  });
});

describe("/api/chain/status", () => {
  it("says whether the relayer is set, with its public address only", async () => {
    const r = routes();
    const off = await (await r.handle(new Request("https://spacedao.test/api/chain/status"), {})).json();
    expect(off).toEqual({ network: "solana-devnet", configured: false });
    const on = (await (await r.handle(new Request("https://spacedao.test/api/chain/status"), env)).json()) as Record<string, unknown>;
    expect(on).toMatchObject({ network: "solana-devnet", configured: true, relayer: base58Encode(RELAYER_PUBLIC) });
    expect(JSON.stringify(on)).not.toContain(SECRET);
  });
});

/* -------------- the browser record, against a fake devnet -------------- */

type Answer = { result: unknown } | { error: { code: number; message: string } };
type Fetch = AnchorClientOptions["fetch"];

/** Answers devnet JSON-RPC by method. No network. */
function fakeDevnet(over: Record<string, (params: unknown[]) => Answer> = {}, httpStatus = 200) {
  const calls: { method: string; params: unknown[] }[] = [];
  const handlers: Record<string, (params: unknown[]) => Answer> = {
    getLatestBlockhash: () => ({ result: { context: { slot: 1 }, value: { blockhash: BLOCKHASH, lastValidBlockHeight: 150 } } }),
    sendTransaction: (params) => ({ result: base58Encode(decodeTx(params[0] as string).signature) }),
    getSignatureStatuses: () => ({ result: { context: { slot: 2 }, value: [{ slot: 2, confirmations: 0, err: null, confirmationStatus: "confirmed" }] } }),
    ...over,
  };
  const fetch: Fetch = async (_url, init) => {
    const { method, params } = JSON.parse(init.body as string) as { method: string; params: unknown[] };
    calls.push({ method, params });
    const answer = handlers[method]?.(params) ?? { error: { code: -32601, message: "Method not found" } };
    return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, ...answer }), { status: httpStatus, headers: { "content-type": "application/json" } });
  };
  return { fetch, calls, methods: () => calls.map((c) => c.method) };
}

/** A devnet that never answers: each call only ends when its timeout aborts it. */
const hanging: Fetch = (_url, init) => new Promise((_resolve, reject) => init.signal?.addEventListener("abort", () => reject(init.signal?.reason)));

/** Sends /api/chain/anchor to the real Worker routes and everything else to the given devnet. */
function wire(devnet: Fetch, worker = routes(), e: Record<string, string> = env): Fetch {
  return async (url, init) => (url === ANCHOR_PATH ? worker.handle(new Request(`https://spacedao.test${url}`, init), e) : devnet(url, init));
}

const quick = (fetch: Fetch, extra: Partial<AnchorClientOptions> = {}): Partial<AnchorClientOptions> => ({ fetch, pollMs: 5, callTimeoutMs: 100, deadlineMs: 400, ...extra });

describe("browser record", () => {
  it("broadcasts the relayer's transaction and returns the explorer link once confirmed", async () => {
    const devnet = fakeDevnet();
    const seen: string[] = [];
    const result = await anchorRatification(design, ratification, quick(async (url, init) => (seen.push(url), wire(devnet.fetch)(url, init))));
    expect(result.recorded).toBe(true);
    if (!result.recorded) return;
    expect(result.explorerUrl).toBe(`https://explorer.solana.com/tx/${result.txSignature}?cluster=devnet`);
    expect(result.memo).toMatch(/^SpaceDAO mission record v1 mission=moon-base-zero /);
    expect("transaction" in result).toBe(false);
    expect(devnet.methods()).toEqual(["getLatestBlockhash", "sendTransaction", "getSignatureStatuses"]);
    expect(seen).toEqual([DEVNET_RPC, ANCHOR_PATH, DEVNET_RPC, DEVNET_RPC]);
    const sent = decodeTx(devnet.calls[1].params[0] as string);
    expect(base58Encode(sent.signature)).toBe(result.txSignature);
    expect(ed25519.verify(sent.signature, sent.message, RELAYER_PUBLIC)).toBe(true);
    expect(new TextDecoder().decode(sent.message.slice(105))).toBe(result.memo);
  });

  it("stops before any broadcast when the relayer is off", async () => {
    const devnet = fakeDevnet();
    const result = await anchorRatification(design, ratification, quick(wire(devnet.fetch, routes(), {})));
    expect(result).toMatchObject({ recorded: false, reason: "not-configured" });
    expect(devnet.methods()).toEqual(["getLatestBlockhash"]);
  });

  it("passes the Worker's refusal of a bad record through", async () => {
    const result = await anchorRatification(makeDesign(["bus-a"]), ratification, quick(wire(fakeDevnet().fetch)));
    expect(result).toMatchObject({ recorded: false, reason: "bad-request" });
  });

  it("answers timeout quickly when devnet hangs", async () => {
    const started = Date.now();
    const result = await anchorRatification(design, ratification, quick(wire(hanging)));
    expect(result).toMatchObject({ recorded: false, reason: "timeout" });
    expect(Date.now() - started).toBeLessThan(1000);
  });

  it("answers rpc-error when devnet errors, is busy or drops the connection", async () => {
    const behind = fakeDevnet({ getLatestBlockhash: () => ({ error: { code: -32005, message: "Node is behind" } }) });
    expect(await anchorRatification(design, ratification, quick(wire(behind.fetch)))).toMatchObject({ recorded: false, reason: "rpc-error" });
    const busy = fakeDevnet({}, 429);
    expect(await anchorRatification(design, ratification, quick(wire(busy.fetch)))).toMatchObject({ recorded: false, reason: "rpc-error" });
    const dropped: Fetch = async () => {
      throw new TypeError("Failed to fetch");
    };
    expect(await anchorRatification(design, ratification, quick(wire(dropped)))).toMatchObject({ recorded: false, reason: "rpc-error" });
  });

  it("answers rejected when devnet refuses or fails the transaction", async () => {
    const unfunded = fakeDevnet({ sendTransaction: () => ({ error: { code: -32002, message: "Transaction simulation failed: Attempt to debit an account but found no record of a prior credit." } }) });
    expect(await anchorRatification(design, ratification, quick(wire(unfunded.fetch)))).toMatchObject({ recorded: false, reason: "rejected" });
    const failed = fakeDevnet({ getSignatureStatuses: () => ({ result: { context: { slot: 2 }, value: [{ err: { InstructionError: [0, "InvalidInstructionData"] }, confirmationStatus: "confirmed" }] } }) });
    expect(await anchorRatification(design, ratification, quick(wire(failed.fetch)))).toMatchObject({ recorded: false, reason: "rejected" });
  });

  it("counts a transaction another tab already broadcast as recorded", async () => {
    const twice = fakeDevnet({ sendTransaction: () => ({ error: { code: -32002, message: "Transaction simulation failed: This transaction has already been processed" } }) });
    expect((await anchorRatification(design, ratification, quick(wire(twice.fetch)))).recorded).toBe(true);
  });

  it("answers timeout when the record never confirms", async () => {
    const stuck = fakeDevnet({ getSignatureStatuses: () => ({ result: { context: { slot: 2 }, value: [null] } }) });
    expect(await anchorRatification(design, ratification, quick(wire(stuck.fetch)))).toMatchObject({ recorded: false, reason: "timeout" });
  });

  it("answers unreachable when the app runs without its Worker", async () => {
    const devnet = fakeDevnet();
    const staticHost: Fetch = async (url, init) => (url === ANCHOR_PATH ? new Response("<!doctype html>", { status: 404, headers: { "content-type": "text/html" } }) : devnet.fetch(url, init));
    expect(await anchorRatification(design, ratification, quick(staticHost))).toMatchObject({ recorded: false, reason: "unreachable" });
    const offline: Fetch = async (url, init) => {
      if (url === ANCHOR_PATH) throw new TypeError("Failed to fetch");
      return devnet.fetch(url, init);
    };
    expect(await anchorRatification(design, ratification, quick(offline))).toMatchObject({ recorded: false, reason: "unreachable" });
  });
});
