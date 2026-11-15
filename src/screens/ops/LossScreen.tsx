import { useEffect } from "react";
import { motion } from "motion/react";
import { Button, Icon } from "@/components/ui";
import { sfx } from "@/components/audio";
import type { OpsState } from "@/ops";

/** Explains why the outpost was lost as a short cause chain, then offers a retry or a redesign. */
export function LossScreen({ ops, onRetry, onRedesign, onDebrief }: { ops: OpsState; onRetry: () => void; onRedesign: () => void; onDebrief: () => void }) {
  useEffect(() => { sfx("error"); }, []);
  const dark = ops.history.filter((h) => h.energyWh <= 0).length;
  const causes = ops.log.filter((l) => l.kind === "warning" || l.kind === "failure").slice(-4);
  const chain = [
    ...causes.filter((l) => l.text !== ops.lostReason).map((l) => ({ turn: l.turn, text: l.text })),
    ...(dark > 0 ? [{ turn: ops.turn, text: `Power hit zero on ${dark} turn${dark === 1 ? "" : "s"}.` }] : []),
    { turn: ops.turn, text: ops.lostReason ?? "The outpost stopped working." },
  ];
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/70 p-4">
      <motion.div role="alertdialog" aria-modal="true" aria-labelledby="loss-title" data-coach="ops.loss" className="glass-strong w-full max-w-md bg-[#0b0d24]/95 p-5" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
        <div className="flex items-center gap-2 text-over"><Icon name="warning" size={20} /><h2 id="loss-title" className="font-display text-lg">Outpost lost</h2></div>
        <p className="mt-1 text-sm text-muted">Here is what led to it:</p>
        <ol className="mt-3 space-y-2">
          {chain.map((c, i) => (
            <motion.li key={i} className="flex items-start gap-2.5 text-sm" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 * i }}>
              <span className={`num mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[11px] ${i === chain.length - 1 ? "border-over text-over" : "border-line text-muted"}`}>{i + 1}</span>
              <span className={i === chain.length - 1 ? "font-medium text-fg" : "text-fg/90"}>{c.text}<span className="num ml-1.5 text-[11px] text-faint">turn {c.turn}</span></span>
            </motion.li>
          ))}
        </ol>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <Button variant="primary" onClick={onRetry}><Icon name="play" size={15} /> Try again</Button>
          <Button onClick={onRedesign}><Icon name="build" size={15} /> Redesign</Button>
        </div>
        <button type="button" onClick={onDebrief} className="mt-3 w-full text-center text-xs text-muted underline hover:text-fg">See the debrief instead</button>
      </motion.div>
    </div>
  );
}
