import { motion } from "motion/react";
import type { OpsEventCard } from "@/ops";
import { LiveEventBadge } from "./LiveEventBadge";

/** Decision card for a pending event. Shows the real-event badge when it comes from a NASA record. */
export function EventCard({ card, turnLabel, turn, onChoose }: { card: OpsEventCard; turnLabel: string; turn: number; onChoose: (optionId: string) => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center">
      <motion.div className="absolute inset-0 bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.div role="dialog" aria-modal="true" aria-label={card.title} data-coach="ops.event" className="glass-strong relative w-full max-w-md bg-[#0b0d24]/95 p-5" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-[11px] uppercase tracking-wider text-tight">{turnLabel} {turn} · Decision</div>
          {card.liveSource && <LiveEventBadge source={card.liveSource} />}
        </div>
        <h2 className="font-display mt-1 text-lg">{card.title}</h2>
        <p className="text-sm text-fg/90">{card.text}</p>
        <div className="mt-4 grid gap-2">
          {card.options.map((o) => (
            <button key={o.id} type="button" onClick={() => onChoose(o.id)} className="rounded-xl border border-line bg-white/[0.04] p-3 text-left transition hover:border-cyan/70">
              <div className="text-sm font-medium">{o.label}</div>
              <div className="text-xs text-muted">{o.hint}</div>
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
