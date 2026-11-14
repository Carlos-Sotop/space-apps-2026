// Council signatures: ed25519 + ML-DSA-65 (FIPS 204) hybrid over a SHA-256 manifest digest.
// Keys are derived from a public seed on purpose: this is a play demo, not custody of real keys.
import { ed25519 } from "@noble/curves/ed25519.js";
import { ml_dsa65 } from "@noble/post-quantum/ml-dsa.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes, utf8ToBytes } from "@noble/hashes/utils.js";
import type { CouncilSignature, Ratification } from "@/engine/types";

/** JSON with object keys sorted at every level, so equal designs always hash equally. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).filter((k) => obj[k] !== undefined).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`).join(",")}}`;
}

export function manifestHash(design: unknown): string {
  return bytesToHex(sha256(utf8ToBytes(canonicalJson(design))));
}

export interface CouncilKeys {
  ed: { secretKey: Uint8Array; publicKey: Uint8Array };
  pq: { secretKey: Uint8Array; publicKey: Uint8Array };
}

const keyCache = new Map<string, CouncilKeys>();

/** Deterministic keypairs for one actor, generated on first use (ML-DSA keygen takes tens of ms). */
export function councilKeys(actorId: string): CouncilKeys {
  const hit = keyCache.get(actorId);
  if (hit) return hit;
  const seed = sha256(utf8ToBytes(`spacedao:${actorId}`));
  const keys: CouncilKeys = { ed: ed25519.keygen(seed), pq: ml_dsa65.keygen(seed) };
  keyCache.set(actorId, keys);
  return keys;
}

export function signManifest(hash: string, actorId: string): CouncilSignature {
  const keys = councilKeys(actorId);
  const msg = hexToBytes(hash);
  return {
    actorId,
    classical: { scheme: "ed25519", publicKey: bytesToHex(keys.ed.publicKey), signature: bytesToHex(ed25519.sign(msg, keys.ed.secretKey)) },
    postQuantum: { scheme: "ml-dsa-65", publicKey: bytesToHex(keys.pq.publicKey), signature: bytesToHex(ml_dsa65.sign(msg, keys.pq.secretKey)) },
  };
}

function verifySignature(hash: string, s: CouncilSignature): boolean {
  try {
    const msg = hexToBytes(hash);
    const okClassic = ed25519.verify(hexToBytes(s.classical.signature), msg, hexToBytes(s.classical.publicKey));
    if (!okClassic) return false;
    if (!s.postQuantum) return true;
    return ml_dsa65.verify(hexToBytes(s.postQuantum.signature), msg, hexToBytes(s.postQuantum.publicKey));
  } catch {
    return false;
  }
}

/** True when every signature (both schemes) verifies against the manifest hash and at least one exists. */
export function verifyRatification(r: Ratification): boolean {
  return r.signatures.length > 0 && r.signatures.every((s) => verifySignature(r.manifestHash, s));
}

export const shortHash = (hex: string, n = 8) => (hex.length > n * 2 ? `${hex.slice(0, n)}…${hex.slice(-4)}` : hex);
