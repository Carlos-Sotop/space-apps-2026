import { describe, expect, it } from "vitest";
import { canonicalJson, manifestHash, signManifest, verifyRatification } from "./index";
import type { Ratification } from "@/engine/types";

const design = { b: [3, 2, { y: 1, x: 2 }], a: "moon", c: undefined };

describe("manifest", () => {
  it("sorts keys at every level", () => {
    expect(canonicalJson(design)).toBe('{"a":"moon","b":[3,2,{"x":2,"y":1}]}');
  });
  it("hashes equal designs equally and different designs differently", () => {
    expect(manifestHash(design)).toBe(manifestHash({ a: "moon", b: [3, 2, { x: 2, y: 1 }] }));
    expect(manifestHash(design)).not.toBe(manifestHash({ ...design, a: "mars" }));
    expect(manifestHash(design)).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("council signatures", () => {
  const hash = manifestHash(design);
  const make = (): Ratification => ({ manifestHash: hash, signatures: ["nasa", "esa"].map((id) => signManifest(hash, id)) });

  it("round-trips with both schemes", () => {
    const r = make();
    expect(r.signatures[0].postQuantum?.scheme).toBe("ml-dsa-65");
    expect(verifyRatification(r)).toBe(true);
  });
  it("is deterministic per actor", () => {
    expect(signManifest(hash, "nasa").classical.publicKey).toBe(signManifest(hash, "nasa").classical.publicKey);
    expect(signManifest(hash, "nasa").classical.publicKey).not.toBe(signManifest(hash, "esa").classical.publicKey);
  });
  it("detects a tampered manifest", () => {
    const r = make();
    r.manifestHash = manifestHash({ ...design, a: "mars" });
    expect(verifyRatification(r)).toBe(false);
  });
  it("detects a tampered signature", () => {
    const r = make();
    const sig = r.signatures[1].postQuantum!;
    sig.signature = (sig.signature[0] === "0" ? "1" : "0") + sig.signature.slice(1);
    expect(verifyRatification(r)).toBe(false);
    const r2 = make();
    const c = r2.signatures[0].classical;
    c.signature = (c.signature[0] === "0" ? "1" : "0") + c.signature.slice(1);
    expect(verifyRatification(r2)).toBe(false);
  });
  it("rejects an empty ratification", () => {
    expect(verifyRatification({ manifestHash: hash, signatures: [] })).toBe(false);
  });
});
