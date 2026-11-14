import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Badge, MonogramBadge, type Tone } from "@/components/ui";
import type { Review, Verdict } from "@/engine/types";
import { getActor } from "@/lib/catalog";

const TONE: Record<Verdict, Tone> = { approve: "ok", concern: "tight", veto: "over" };
const LABEL: Record<Verdict, string> = { approve: "Approve", concern: "Concern", veto: "Veto" };

export function ReviewFeed({ reviews, onDone }: { reviews: Review[]; onDone: () => void }) {
  const [shown, setShown] = useState(0);
  const calm = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (shown >= reviews.length) { onDone(); return; }
    const t = setTimeout(() => setShown((n) => n + 1), calm ? 120 : 1100);
    return () => clearTimeout(t);
  }, [shown, reviews.length, onDone, calm]);

  return (
    <ul className="space-y-3" aria-live="polite">
      {reviews.slice(0, shown).map((r) => {
        const a = getActor(r.actorId);
        return (
          <motion.li key={r.actorId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24 }} className="flex items-start gap-3">
            <MonogramBadge actor={a} fallbackName={r.actorId} size={36} />
            <div className="glass min-w-0 flex-1 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="mb-1 flex items-center gap-2"><span className="text-sm font-medium">{a?.shortName ?? r.actorId}</span><Badge tone={TONE[r.verdict]}>{LABEL[r.verdict]}</Badge></div>
              <p className="text-sm text-fg/90">{r.message}</p>
            </div>
          </motion.li>
        );
      })}
      {shown < reviews.length && (
        <li className="flex items-center gap-3">
          <MonogramBadge actor={getActor(reviews[shown].actorId)} fallbackName={reviews[shown].actorId} size={36} />
          <div className="glass flex gap-1 rounded-2xl rounded-tl-sm px-4 py-3" aria-label="Typing">
            {[0, 1, 2].map((i) => <span key={i} className="typing-dot h-1.5 w-1.5 rounded-full bg-muted" style={{ animationDelay: `${i * 0.18}s` }} />)}
          </div>
        </li>
      )}
    </ul>
  );
}
