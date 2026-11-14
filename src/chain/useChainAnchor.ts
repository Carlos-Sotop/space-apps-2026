// Records the council's ratification on Solana devnet once per signing, and reports how it went.
import { useEffect, useState } from "react";
import type { MissionDesign, Ratification } from "@/engine/types";
import { useGame } from "@/store/game";
import { anchorRatification } from "./client";
import type { AnchorFailure, AnchorResult } from "./types";

export type ChainAnchorState =
  /** no ratification: nothing to record */
  | { status: "unsigned" }
  | { status: "recording" }
  | { status: "recorded"; txSignature: string; explorerUrl: string }
  | { status: "not-recorded"; reason: AnchorFailure; message: string };

// One request per signing per session: StrictMode mounts twice and "Fly again" remounts the debrief.
// A failed attempt is forgotten, so the next debrief tries again.
const attempts = new Map<string, Promise<AnchorResult>>();

/** The manifest plus a slice of every signature: re-signing the same design is a new signing. */
const signingKey = (r: Ratification) =>
  `${r.manifestHash}:${r.signatures.map((s) => `${s.classical.signature.slice(0, 16)}${s.postQuantum?.signature.slice(0, 16) ?? ""}`).join("")}`;

function anchorOnce(design: MissionDesign, ratification: Ratification): Promise<AnchorResult> {
  const key = signingKey(ratification);
  let attempt = attempts.get(key);
  if (!attempt) {
    attempt = anchorRatification(design, ratification).then((result) => {
      if (!result.recorded) attempts.delete(key);
      return result;
    });
    attempts.set(key, attempt);
  }
  return attempt;
}

/** Puts the receipt on the ratification in the store (`Ratification.anchor`), so any screen can show it. */
function keepReceipt(key: string, result: AnchorResult) {
  if (!result.recorded) return;
  const { ratification, setRatification } = useGame.getState();
  if (ratification && !ratification.anchor && signingKey(ratification) === key) {
    setRatification({ ...ratification, anchor: { network: "solana-devnet", txSignature: result.txSignature, explorerUrl: result.explorerUrl } });
  }
}

/** Starts the record when a signed design is shown and returns its state. The game never waits on it. */
export function useChainAnchor(design: MissionDesign | null, ratification: Ratification | null): ChainAnchorState {
  const [done, setDone] = useState<{ key: string; result: AnchorResult } | null>(null);

  useEffect(() => {
    if (!design || !ratification || ratification.anchor) return;
    const key = signingKey(ratification);
    let alive = true;
    anchorOnce(design, ratification)
      .then((result) => {
        try {
          keepReceipt(key, result);
        } catch {
          // the receipt is optional: a store hiccup never reaches the game
        }
        if (alive) setDone({ key, result });
      })
      .catch(() => {
        // anchorRatification never rejects; this guard keeps it that way for any future change
      });
    return () => {
      alive = false;
    };
  }, [design, ratification]);

  if (!design || !ratification) return { status: "unsigned" };
  if (ratification.anchor) return { status: "recorded", txSignature: ratification.anchor.txSignature, explorerUrl: ratification.anchor.explorerUrl };
  if (!done || done.key !== signingKey(ratification)) return { status: "recording" };
  const r = done.result;
  return r.recorded ? { status: "recorded", txSignature: r.txSignature, explorerUrl: r.explorerUrl } : { status: "not-recorded", reason: r.reason, message: r.message };
}
