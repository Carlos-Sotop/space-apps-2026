import { useState } from "react";
import { motion } from "motion/react";
import { Badge, Button, Icon, MonogramBadge } from "@/components/ui";
import type { CouncilSignature } from "@/engine/types";
import { getActor } from "@/lib/catalog";
import { useGame } from "@/store/game";
import { useIssues } from "@/components/hud/ResourceHud";
import { useDesign } from "./useDesign";

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
const short = (h: string) => `${h.slice(0, 8)}…${h.slice(-4)}`;

/** The 4-of-4 hybrid signature. It opens only when every seat of the Go / No-Go poll says GO. */
export function SignPanel({ allGo }: { allGo: boolean }) {
  const { design } = useDesign();
  const ratification = useGame((s) => s.ratification);
  const setRatification = useGame((s) => s.setRatification);
  const fly = useGame((s) => s.fly);
  const blockers = useIssues(design).filter((i) => i.severity === "blocker");
  const ids = [design.coalition.leadId, ...design.coalition.partnerIds];
  const [busy, setBusy] = useState(false);
  const [partial, setPartial] = useState<CouncilSignature[]>([]);
  const [hash, setHash] = useState<string>("");

  const sigs = ratification?.signatures ?? partial;
  const done = !!ratification;
  const pq = done && ratification.signatures.every((s) => s.postQuantum);

  const sign = async () => {
    setBusy(true);
    setPartial([]);
    const { manifestHash, signManifest, verifyRatification } = await import("@/crypto");
    const h = manifestHash(design);
    setHash(h);
    const out: CouncilSignature[] = [];
    for (const id of ids) {
      await pause(650);
      out.push(signManifest(h, id));
      setPartial([...out]);
    }
    const r = { manifestHash: h, signatures: out };
    if (verifyRatification(r)) setRatification(r);
    setBusy(false);
  };

  const locked = !allGo && !done;

  return (
    <div className={`glass space-y-5 p-5 transition-opacity ${locked ? "opacity-70" : ""}`} data-coach="council.sign">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-base">Sign &amp; launch</h3>
        {locked && <span className="flex items-center gap-1.5 text-xs text-muted"><Icon name="lock" size={13} /> Opens when all 4 say GO</span>}
        {done && pq && <Badge tone="violet"><Icon name="shield" size={12} /> Quantum-safe</Badge>}
      </div>
      <p className="num text-xs text-muted">Manifest SHA-256 <span className="text-fg">{ratification?.manifestHash ? short(ratification.manifestHash) : hash ? short(hash) : "computed when signing"}</span></p>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ids.map((id) => {
          const s = sigs.find((x) => x.actorId === id);
          const a = getActor(id);
          return (
            <li key={id} className={`rounded-2xl border p-3 transition ${s ? "border-ok/50 bg-ok/5" : "border-dashed border-line"}`}>
              <div className="flex items-center gap-2">
                <MonogramBadge actor={a} fallbackName={id} size={32} showFlag={false} />
                <span className="min-w-0 flex-1 truncate text-sm">{a?.shortName ?? id}</span>
                {s && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-ok"><Icon name="check" size={16} /></motion.span>}
              </div>
              <div className="num mt-2 space-y-0.5 text-[10.5px] text-muted">
                <div>ed25519 {s ? short(s.classical.signature) : "..."}</div>
                <div>ML-DSA-65 {s?.postQuantum ? short(s.postQuantum.signature) : "..."}</div>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center gap-3">
        {!done && <Button variant="primary" disabled={busy || locked} onClick={sign}>{busy ? "Signing…" : locked ? <><Icon name="lock" size={16} /> Sign with the council</> : "Sign with the council"}</Button>}
        <Button variant="primary" size="lg" disabled={!done || blockers.length > 0} onClick={fly}><Icon name="launch" size={18} /> Launch</Button>
      </div>
      {blockers.length > 0 && <p className="text-sm text-over">Launch is locked: {blockers.length} blocker{blockers.length > 1 ? "s" : ""} to fix in the earlier steps.</p>}
    </div>
  );
}
