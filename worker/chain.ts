// /api/chain/*: the relayer for the optional Solana devnet record of a council-ratified mission.
// Play only, test network only, never real funds. The Worker checks the record, builds one Memo transaction and signs it
// as the fee payer; the browser broadcasts it. Devnet's public RPC answers 403 "Your IP or provider is blocked" to any
// request carrying the CF-Worker header that Cloudflare adds to Worker subrequests (measured 2026-11-14), so the Worker
// itself never calls devnet. A missing key, a bad record or the rate limit is a quick "not recorded" answer and the
// game carries on.
// Runs on Cloudflare Workers with Web Crypto (native Ed25519) and @noble/hashes: no Node APIs, no network calls.
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, concatBytes, hexToBytes, utf8ToBytes } from "@noble/hashes/utils.js";
import type { CouncilSignature } from "../src/engine/types.ts";
import type { AnchorFailure, AnchorNotRecorded, AnchorTicket, AnchorTicketAnswer } from "../src/chain/types.ts";
import { ANCHOR_MESSAGES } from "../src/chain/messages.ts";

export interface ChainEnv {
  /** devnet keypair of the relayer: base58 (64-byte keypair or 32-byte seed) or the solana-keygen JSON array */
  SOLANA_RELAYER_SECRET?: string;
}

export const MEMO_PROGRAM_ID = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";
export const MAX_BODY_BYTES = 128 * 1024;
/** A repeated request for the same signing gets the same transaction for this long (a devnet blockhash lives about 37 s). */
export const TICKET_REUSE_MS = 15_000;

export const explorerTxUrl = (signature: string) => `https://explorer.solana.com/tx/${signature}?cluster=devnet`;

const fail = (reason: AnchorFailure, message = ANCHOR_MESSAGES[reason]): AnchorNotRecorded => ({ recorded: false, reason, message });

/* ------------------------------------------------------------------ */
/* Encoding                                                            */
/* ------------------------------------------------------------------ */

const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export function base58Encode(bytes: Uint8Array): string {
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) zeros++;
  const digits: number[] = []; // little-endian base-58 digits
  for (let i = zeros; i < bytes.length; i++) {
    let carry = bytes[i];
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = Math.floor(carry / 58);
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }
  return "1".repeat(zeros) + digits.reverse().map((d) => B58[d]).join("");
}

export function base58Decode(text: string): Uint8Array {
  let zeros = 0;
  while (zeros < text.length && text[zeros] === "1") zeros++;
  const bytes: number[] = []; // little-endian
  for (let i = zeros; i < text.length; i++) {
    let carry = B58.indexOf(text[i]);
    if (carry < 0) throw new Error("not base58");
    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j] * 58;
      bytes[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  const out = new Uint8Array(zeros + bytes.length);
  out.set(bytes.reverse(), zeros);
  return out;
}

/** Solana's compact-u16 length prefix. */
export function shortVec(n: number): Uint8Array {
  const out: number[] = [];
  let rest = n;
  for (;;) {
    const low = rest & 0x7f;
    rest >>= 7;
    if (rest === 0) {
      out.push(low);
      return Uint8Array.from(out);
    }
    out.push(low | 0x80);
  }
}

function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function fromBase64Url(text: string): Uint8Array {
  const b64 = text.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(text.length / 4) * 4, "=");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

const sameBytes = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((x, i) => x === b[i]);

/* ------------------------------------------------------------------ */
/* What gets recorded                                                  */
/* ------------------------------------------------------------------ */

/** JSON with object keys sorted at every level. Same rule as canonicalJson in src/crypto; a test keeps them equal. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).filter((k) => obj[k] !== undefined).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`).join(",")}}`;
}

const sha256Hex = (text: string) => bytesToHex(sha256(utf8ToBytes(text)));

/** SHA-256 of the canonical JSON of the flown design, hex: the value every council member signs. */
export const manifestHashOf = (design: unknown) => sha256Hex(canonicalJson(design));

/** SHA-256 of the canonical JSON of the council signatures (both schemes, in council order), hex. */
export function councilDigestOf(signatures: CouncilSignature[]): string {
  const clean = signatures.map((s) => ({
    actorId: s.actorId,
    classical: { scheme: s.classical.scheme, publicKey: s.classical.publicKey, signature: s.classical.signature },
    postQuantum: s.postQuantum ? { scheme: s.postQuantum.scheme, publicKey: s.postQuantum.publicKey, signature: s.postQuantum.signature } : undefined,
  }));
  return sha256Hex(canonicalJson(clean));
}

export interface MemoFields {
  missionId: string;
  manifestHash: string;
  councilDigest: string;
  signed: number;
  seats: number;
  postQuantum: boolean;
}

/** The one line the Memo program writes on devnet. */
export function memoText(f: MemoFields): string {
  const schemes = f.postQuantum ? "ed25519+ml-dsa-65" : "ed25519";
  return `SpaceDAO mission record v1 mission=${f.missionId} manifest=${f.manifestHash} council=${f.councilDigest} signed=${f.signed}/${f.seats} schemes=${schemes}`;
}

/** Legacy Solana message with one Memo instruction, paid and signed by the relayer. */
export function memoMessage(relayer: Uint8Array, recentBlockhash: Uint8Array, memo: string): Uint8Array {
  const data = utf8ToBytes(memo);
  return concatBytes(
    Uint8Array.of(1, 0, 1), // header: 1 signature (relayer), 0 read-only signed, 1 read-only unsigned (Memo program)
    shortVec(2),
    relayer,
    base58Decode(MEMO_PROGRAM_ID),
    recentBlockhash,
    shortVec(1), // one instruction
    Uint8Array.of(1), // program index: the Memo program
    shortVec(0), // no accounts
    shortVec(data.length),
    data,
  );
}

export const signedTransaction = (message: Uint8Array, signature: Uint8Array) => concatBytes(shortVec(1), signature, message);

/* ------------------------------------------------------------------ */
/* Request check                                                       */
/* ------------------------------------------------------------------ */

const MISSION_ID = /^[a-z0-9][a-z0-9-]{0,39}$/;
const ACTOR_ID = /^[a-z0-9][a-z0-9._-]{0,63}$/i;
// NIST FIPS 204, ML-DSA-65: public key 1952 bytes, signature 3309 bytes
const MLDSA65_PUBLIC_KEY_HEX = 1952 * 2;
const MLDSA65_SIGNATURE_HEX = 3309 * 2;

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isHex = (v: unknown, chars: number): v is string => typeof v === "string" && v.length === chars && /^[0-9a-f]+$/.test(v);

export interface CheckedAnchor {
  blockhash: Uint8Array;
  missionId: string;
  seats: string[];
  manifestHash: string;
  signatures: CouncilSignature[];
  councilDigest: string;
  postQuantum: boolean;
}

/** Checks the shape, the manifest hash against the design and that every council seat signed once. A string is the reason it fails. */
export function checkAnchorRequest(body: unknown): CheckedAnchor | string {
  if (!isObject(body) || !isObject(body.design) || !isObject(body.ratification)) return "The flight record is incomplete.";
  const { design, ratification } = body;
  let blockhash: Uint8Array = new Uint8Array();
  try {
    if (typeof body.blockhash === "string" && body.blockhash.length <= 44) blockhash = base58Decode(body.blockhash);
  } catch {
    // reported just below
  }
  if (blockhash.length !== 32) return "The devnet blockhash is missing.";
  if (typeof design.missionId !== "string" || !MISSION_ID.test(design.missionId)) return "The design names no valid mission.";
  const coalition = design.coalition;
  if (!isObject(coalition) || !Array.isArray(coalition.partnerIds)) return "The design has no council.";
  const seats: unknown[] = [coalition.leadId, ...coalition.partnerIds];
  if (seats.length < 2 || seats.length > 8 || !seats.every((id) => typeof id === "string" && ACTOR_ID.test(id)) || new Set(seats).size !== seats.length) return "The council seats are not valid.";
  if (!isHex(ratification.manifestHash, 64)) return "The manifest hash is missing.";
  if (manifestHashOf(design) !== ratification.manifestHash) return "The manifest hash does not match the design.";
  const sigs = ratification.signatures;
  if (!Array.isArray(sigs) || sigs.length !== seats.length) return "Every council seat must sign.";
  const signers = new Set<string>();
  for (const s of sigs) {
    if (!isObject(s) || typeof s.actorId !== "string" || !seats.includes(s.actorId) || signers.has(s.actorId)) return "Every council seat must sign once.";
    signers.add(s.actorId);
    const c = s.classical;
    if (!isObject(c) || c.scheme !== "ed25519" || !isHex(c.publicKey, 64) || !isHex(c.signature, 128)) return "A classical signature is malformed.";
    const pq = s.postQuantum;
    if (pq !== undefined && (!isObject(pq) || pq.scheme !== "ml-dsa-65" || !isHex(pq.publicKey, MLDSA65_PUBLIC_KEY_HEX) || !isHex(pq.signature, MLDSA65_SIGNATURE_HEX))) return "A post-quantum signature is malformed.";
  }
  const signatures = sigs as CouncilSignature[];
  return {
    blockhash,
    missionId: design.missionId,
    seats: seats as string[],
    manifestHash: ratification.manifestHash,
    signatures,
    councilDigest: councilDigestOf(signatures),
    postQuantum: signatures.every((s) => !!s.postQuantum),
  };
}

/** Native Ed25519 check of one classical council signature over the manifest digest. */
async function verifyClassical(s: CouncilSignature, manifestHash: string): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey("raw", hexToBytes(s.classical.publicKey), { name: "Ed25519" }, false, ["verify"]);
    return await crypto.subtle.verify({ name: "Ed25519" }, key, hexToBytes(s.classical.signature), hexToBytes(manifestHash));
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Relayer key                                                         */
/* ------------------------------------------------------------------ */

export interface Relayer {
  publicKey: Uint8Array;
  address: string;
  sign: (message: Uint8Array) => Promise<Uint8Array>;
}

/** Reads the relayer secret: base58 of the 64-byte keypair (or 32-byte seed), or the solana-keygen JSON array. */
export function parseRelayerSecret(secret: string): { seed: Uint8Array; publicKey?: Uint8Array } {
  const text = secret.trim();
  let bytes: Uint8Array;
  if (text.startsWith("[")) {
    let arr: unknown;
    try {
      arr = JSON.parse(text);
    } catch {
      throw new Error("relayer secret is not a JSON byte array"); // never echo the secret
    }
    if (!Array.isArray(arr) || !arr.every((n) => Number.isInteger(n) && n >= 0 && n <= 255)) throw new Error("relayer secret is not a JSON byte array");
    bytes = Uint8Array.from(arr as number[]);
  } else {
    bytes = base58Decode(text);
  }
  if (bytes.length !== 64 && bytes.length !== 32) throw new Error("relayer secret must be 32 or 64 bytes");
  return { seed: bytes.slice(0, 32), publicKey: bytes.length === 64 ? bytes.slice(32) : undefined };
}

const PKCS8_ED25519_PREFIX = hexToBytes("302e020100300506032b657004220420");

/** Imports the relayer key into Web Crypto. Native Ed25519 keeps the route far under the Workers CPU limit. */
export async function loadRelayer(secret: string): Promise<Relayer> {
  const { seed, publicKey } = parseRelayerSecret(secret);
  const key = await crypto.subtle.importKey("pkcs8", concatBytes(PKCS8_ED25519_PREFIX, seed), { name: "Ed25519" }, true, ["sign"]);
  const jwk = (await crypto.subtle.exportKey("jwk", key)) as JsonWebKey;
  if (!jwk.x) throw new Error("relayer secret gave no public key");
  const derived = fromBase64Url(jwk.x);
  if (publicKey && !sameBytes(publicKey, derived)) throw new Error("relayer secret halves do not match");
  return {
    publicKey: derived,
    address: base58Encode(derived),
    sign: async (message) => new Uint8Array(await crypto.subtle.sign({ name: "Ed25519" }, key, message)),
  };
}

/* ------------------------------------------------------------------ */
/* Routes                                                              */
/* ------------------------------------------------------------------ */

export interface ChainOptions {
  now: () => number;
  log: (...args: unknown[]) => void;
  perIpPerMinute: number;
  perIsolatePerMinute: number;
}

const DEFAULTS: ChainOptions = {
  now: () => Date.now(),
  log: (...args) => console.warn(...args),
  perIpPerMinute: 6,
  perIsolatePerMinute: 30,
};

/** Fixed one-minute windows. The returned function gives 0 when a hit is allowed, else the seconds to wait. */
function minuteLimiter(limit: number) {
  const windows = new Map<string, { start: number; count: number }>();
  return (key: string, now: number): number => {
    const w = windows.get(key);
    if (!w || now - w.start >= 60_000) {
      if (windows.size > 5000) for (const [k, v] of windows) if (now - v.start >= 60_000) windows.delete(k);
      windows.set(key, { start: now, count: 1 });
      return 0;
    }
    if (w.count >= limit) return Math.max(1, Math.ceil((w.start + 60_000 - now) / 1000));
    w.count++;
    return 0;
  };
}

const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra } });

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // curl and other non-browser callers; the rate limit still applies
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

export function createChainRoutes(options: Partial<ChainOptions> = {}) {
  const o: ChainOptions = { ...DEFAULTS, ...options };
  const perIp = minuteLimiter(o.perIpPerMinute);
  const perIsolate = minuteLimiter(o.perIsolatePerMinute);
  const tickets = new Map<string, { at: number; ticket: AnchorTicket }>();
  const inflight = new Map<string, Promise<{ status: number; body: AnchorTicketAnswer }>>();
  let relayerCache: { secret: string; relayer: Promise<Relayer> } | null = null;

  const relayerFor = (secret: string) => {
    if (relayerCache?.secret !== secret) relayerCache = { secret, relayer: loadRelayer(secret) };
    return relayerCache.relayer;
  };

  async function sign(c: CheckedAnchor & { ip: string }, secret: string): Promise<{ status: number; body: AnchorTicketAnswer }> {
    const valid = await Promise.all(c.signatures.map((s) => verifyClassical(s, c.manifestHash)));
    if (!valid.every(Boolean)) return { status: 400, body: fail("bad-request", "A council signature does not match the manifest.") };
    let relayer: Relayer;
    try {
      relayer = await relayerFor(secret);
    } catch (e) {
      o.log("chain: relayer key unreadable:", e instanceof Error ? e.message : "unknown");
      return { status: 200, body: fail("not-configured", "The chain relayer key on this server is unreadable.") };
    }
    const now = o.now();
    const wait = perIp(c.ip, now) || perIsolate("all", now);
    if (wait > 0) return { status: 200, body: { ...fail("rate-limited"), retryAfterS: wait } };
    const memo = memoText({ missionId: c.missionId, manifestHash: c.manifestHash, councilDigest: c.councilDigest, signed: c.signatures.length, seats: c.seats.length, postQuantum: c.postQuantum });
    const message = memoMessage(relayer.publicKey, c.blockhash, memo);
    const signature = await relayer.sign(message);
    const txSignature = base58Encode(signature);
    const ticket: AnchorTicket = {
      network: "solana-devnet",
      transaction: toBase64(signedTransaction(message, signature)),
      txSignature,
      explorerUrl: explorerTxUrl(txSignature),
      memo,
      manifestHash: c.manifestHash,
      councilDigest: c.councilDigest,
      relayer: relayer.address,
    };
    return { status: 200, body: { ticket } };
  }

  async function anchor(request: Request, env: ChainEnv): Promise<Response> {
    if (!sameOrigin(request)) return json(fail("bad-request", "Cross-site requests are not accepted."), 403);
    const secret = env.SOLANA_RELAYER_SECRET?.trim();
    if (!secret) return json(fail("not-configured"));
    if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return json(fail("bad-request", "The flight record is too large."), 413);
    let body: unknown;
    try {
      const text = await request.text();
      if (text.length > MAX_BODY_BYTES) return json(fail("bad-request", "The flight record is too large."), 413);
      body = JSON.parse(text);
    } catch {
      return json(fail("bad-request", "The flight record is not valid JSON."), 400);
    }
    const checked = checkAnchorRequest(body);
    if (typeof checked === "string") return json(fail("bad-request", checked), 400);

    // The same signing (manifest + council digest) gets the same transaction for a short while, so a repeat
    // or a second tab broadcasts one record instead of two.
    const key = `${checked.manifestHash}:${checked.councilDigest}`;
    const now = o.now();
    const recent = tickets.get(key);
    if (recent && now - recent.at < TICKET_REUSE_MS) return json({ ticket: recent.ticket });
    let job = inflight.get(key);
    if (!job) {
      job = sign({ ...checked, ip: request.headers.get("cf-connecting-ip") ?? "local" }, secret)
        .then((out) => {
          if ("ticket" in out.body) {
            if (tickets.size >= 256) for (const [k, v] of tickets) if (o.now() - v.at >= TICKET_REUSE_MS) tickets.delete(k);
            tickets.set(key, { at: o.now(), ticket: out.body.ticket });
          }
          return out;
        })
        .finally(() => inflight.delete(key));
      inflight.set(key, job);
    }
    const out = await job;
    return json(out.body, out.status);
  }

  async function status(env: ChainEnv): Promise<Response> {
    const secret = env.SOLANA_RELAYER_SECRET?.trim();
    if (!secret) return json({ network: "solana-devnet", configured: false });
    try {
      const relayer = await relayerFor(secret);
      return json({ network: "solana-devnet", configured: true, relayer: relayer.address });
    } catch {
      return json({ network: "solana-devnet", configured: false, error: "relayer key unreadable" });
    }
  }

  return {
    /** Answers every /api/chain/* path. */
    async handle(request: Request, env: ChainEnv): Promise<Response> {
      const path = new URL(request.url).pathname.replace(/\/$/, "");
      if (path === "/api/chain/anchor") return request.method === "POST" ? anchor(request, env) : json({ error: "method not allowed" }, 405, { allow: "POST" });
      if (path === "/api/chain/status") return request.method === "GET" ? status(env) : json({ error: "method not allowed" }, 405, { allow: "GET" });
      return json({ error: "not found" }, 404);
    },
  };
}

export const chainRoutes = createChainRoutes();
