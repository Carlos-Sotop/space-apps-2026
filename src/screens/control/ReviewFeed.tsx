import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Badge, MonogramBadge, type Tone } from "@/components/ui";
import type { Issue, ResourceGauge, ResourceReport, Review, Verdict } from "@/engine/types";
import { getActor } from "@/lib/catalog";
import { RESOURCE_LABEL, fmtPct } from "@/lib/format";

const TONE: Record<Verdict, Tone> = { approve: "ok", concern: "tight", veto: "over" };
const LABEL: Record<Verdict, string> = { approve: "Approve", concern: "Concern", veto: "Veto" };
const BAR: Record<ResourceGauge["status"], string> = { ok: "var(--ok)", tight: "var(--tight)", over: "var(--over)" };

/** Share of the limit a gauge uses (for comms: the link the mission needs over the link it gets). */
const usedShare = (g: ResourceGauge) => (g.capacity > 0 ? g.used / g.capacity : g.used > 0 ? 2 : 0);

/** The number a member is talking about, as a small meter: green under 90%, amber to 100%, red over. */
function Meter({ gauge }: { gauge: ResourceGauge }) {
  const share = usedShare(gauge);
  return (
    <span className="flex items-center gap-2" title={`${RESOURCE_LABEL[gauge.key]}: ${fmtPct(share)} of the limit`}>
      <span className="text-[11px] uppercase tracking-wider text-faint">{RESOURCE_LABEL[gauge.key]}</span>
      <span className="relative h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
        <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.min(1, share) * 100}%`, background: BAR[gauge.status] }} />
      </span>
      <span className="num text-[11px]" style={{ color: BAR[gauge.status] }}>{fmtPct(Math.min(share, 9.99))}</span>
    </span>
  );
}

export function ReviewFeed({ reviews, issues, report, onDone }: { reviews: Review[]; issues: Issue[]; report: ResourceReport; onDone: () => void }) {
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
        const cited = issues.find((i) => i.id === r.issueIds[0]);
        // the battery issue is about stored energy, which no gauge shows, so it gets no meter
        const gauge = cited?.resource && cited.id !== "battery-small" ? report[cited.resource] : undefined;
        const more = r.issueIds.length - 1;
        return (
          <motion.li key={r.actorId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24 }} className="flex items-start gap-3">
            <MonogramBadge actor={a} fallbackName={r.actorId} size={36} />
            <div className="glass min-w-0 flex-1 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-sm font-medium">{a?.shortName ?? r.actorId}</span>
                <Badge tone={TONE[r.verdict]}>{LABEL[r.verdict]}</Badge>
                {more > 0 && <span className="text-[11px] text-faint" title={r.issueIds.slice(1).join(", ")}>+{more} more</span>}
                {gauge && <span className="ml-auto"><Meter gauge={gauge} /></span>}
              </div>
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
