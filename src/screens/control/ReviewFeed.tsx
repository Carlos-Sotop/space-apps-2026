import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { sfx } from "@/components/audio";
import { Button, Icon, InfoButton, MonogramBadge, type IconName } from "@/components/ui";
import { READINESS_SOURCES, VERDICT_LABEL, type ReadinessCheck, type ReadinessVerdict, type ReadinessVoteDetail } from "@/engine";
import type { Source } from "@/engine/types";
import { getActor } from "@/lib/catalog";

const STAMP: Record<ReadinessVerdict, string> = { go: "var(--ok)", "go-with-condition": "var(--tight)", "no-go": "var(--over)" };

export const CHECK_LABEL: Record<ReadinessCheck, string> = {
  mass: "Mass", power: "Power", comms: "Comms", budget: "Budget", reliability: "Reliability", objectives: "Objectives", values: "Charter",
};
const CHECK_ICON: Record<ReadinessCheck, IconName> = {
  mass: "mass", power: "power", comms: "comms", budget: "budget", reliability: "shield", objectives: "science", values: "sparkle",
};

/** The rubber stamp: slams in whenever the verdict changes. */
function Stamp({ verdict }: { verdict: ReadinessVerdict }) {
  const color = STAMP[verdict];
  return (
    <motion.span
      key={verdict}
      initial={{ scale: 1.9, opacity: 0, rotate: -16 }}
      animate={{ scale: 1, opacity: 1, rotate: -6 }}
      transition={{ type: "spring", stiffness: 420, damping: 17 }}
      className="font-display inline-block rounded-lg border-[3px] px-3 py-0.5 text-2xl tracking-[0.14em] sm:text-3xl"
      style={{ color, borderColor: color, boxShadow: `0 0 26px color-mix(in srgb, ${color} 30%, transparent)` }}
    >
      {VERDICT_LABEL[verdict]}
    </motion.span>
  );
}

function VoteInfo({ vote, checks }: { vote: ReadinessVoteDetail; checks: ReadinessCheck[] }) {
  return (
    <div className="space-y-3 text-sm text-fg/90">
      <p>{vote.reason}. <span className="num text-muted">{vote.numbers}</span></p>
      <p className="text-muted">This seat checks {checks.map((c) => CHECK_LABEL[c].toLowerCase()).join(" and ")} and reports the worst one.</p>
      {vote.fix && <p><span className="text-faint">Fix it:</span> {vote.fix.label}</p>}
      {vote.concession && <p><span className="text-faint">Negotiate:</span> {vote.concession.label} ({vote.concession.cost})</p>}
    </div>
  );
}

function VoteCard({ vote, checks, revealed, onFix, onNegotiate }: {
  vote: ReadinessVoteDetail; checks: ReadinessCheck[]; revealed: boolean;
  onFix: (v: ReadinessVoteDetail) => void; onNegotiate: (v: ReadinessVoteDetail) => void;
}) {
  const a = getActor(vote.actorId);
  const sources: Source[] = vote.source ? [vote.source] : [];
  const tone = revealed ? STAMP[vote.verdict] : "var(--line)";
  return (
    <li className="glass relative min-w-0 rounded-2xl p-4 transition-colors" style={{ borderColor: `color-mix(in srgb, ${tone} 45%, transparent)` }}>
      <div className="flex min-w-0 items-center gap-2">
        <MonogramBadge actor={a} fallbackName={vote.actorId} size={30} showName />
        <span className="ml-auto flex shrink-0 items-center gap-1 text-[11px] uppercase tracking-wider text-faint">
          <Icon name={CHECK_ICON[vote.check]} size={13} /> {CHECK_LABEL[vote.check]}
        </span>
        <InfoButton title={`${a?.shortName ?? vote.actorId}: ${CHECK_LABEL[vote.check]}`} body={<VoteInfo vote={vote} checks={checks} />} sources={sources} />
      </div>
      <div className="my-3 flex h-12 items-center">
        {revealed ? <Stamp verdict={vote.verdict} /> : (
          <span className="flex gap-1.5" aria-label="Polling">
            {[0, 1, 2].map((i) => <span key={i} className="typing-dot h-2 w-2 rounded-full bg-muted" style={{ animationDelay: `${i * 0.18}s` }} />)}
          </span>
        )}
      </div>
      <p className={`truncate text-sm ${revealed ? "text-fg" : "text-transparent"}`} title={vote.reason}>{vote.reason}</p>
      <p className={`num truncate text-xs ${revealed ? "text-muted" : "text-transparent"}`} title={vote.numbers}>{vote.numbers}</p>
      {revealed && vote.verdict !== "go" && (vote.fix || vote.concession) && (
        <div className="mt-3 flex min-w-0 items-center gap-2">
          {vote.fix && (
            <Button size="sm" variant="primary" title={vote.fix.label} onClick={() => onFix(vote)}>
              <Icon name="build" size={14} /> Fix it
            </Button>
          )}
          {vote.concession && (
            <Button size="sm" title={`${vote.concession.label} (${vote.concession.cost})`} onClick={() => onNegotiate(vote)}>
              <Icon name="link" size={14} /> Negotiate
            </Button>
          )}
          <span className="min-w-0 truncate text-[11px] text-faint" title={vote.fix?.label ?? vote.concession?.label}>{vote.fix?.label ?? `${vote.concession!.label}: ${vote.concession!.cost}`}</span>
        </div>
      )}
    </li>
  );
}

const POLL_INFO = (
  <div className="space-y-3 text-sm text-fg/90">
    <p>Before a NASA launch, every team reviews its system and answers GO or NO-GO. One NO-GO holds the launch.</p>
    <p>Here each council seat runs checks on the real numbers of your design. GO IF means a condition: fix it, or negotiate a trade with that partner, the way ISS partners barter.</p>
    <p>The 4 signatures open only when all 4 say GO.</p>
  </div>
);

/** The Go / No-Go poll: four seats answer one after the other, then each stamp follows the design. */
export function ReviewFeed({ votes, seats, changes, onFix, onNegotiate }: {
  votes: ReadinessVoteDetail[] | null;
  seats: Record<string, ReadinessCheck[]>;
  changes: string[];
  onFix: (v: ReadinessVoteDetail) => void;
  onNegotiate: (v: ReadinessVoteDetail) => void;
}) {
  const [shown, setShown] = useState(0);
  const calm = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const total = votes?.length ?? 0;

  useEffect(() => {
    if (!total || shown >= total) return;
    const t = window.setTimeout(() => {
      const next = votes?.[shown];
      if (next) sfx(next.verdict === "no-go" ? "warning" : "select");
      setShown((n) => n + 1);
    }, calm ? 80 : 650);
    return () => window.clearTimeout(t);
  }, [shown, total, votes, calm]);

  const go = votes?.filter((v) => v.verdict === "go").length ?? 0;
  const done = total > 0 && shown >= total;

  return (
    <div className="space-y-3" data-coach="council.vote">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-base">Go / No-Go poll</h3>
        <span className="flex items-center gap-2">
          {done && <span className="num text-sm" style={{ color: go === total ? "var(--ok)" : "var(--muted)" }} aria-live="polite">{go} of {total} GO</span>}
          <InfoButton title="Go / No-Go poll" body={POLL_INFO} sources={[READINESS_SOURCES.poll, READINESS_SOURCES.barter]} />
        </span>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {(votes ?? []).map((v, i) => (
          <VoteCard key={v.actorId} vote={v} checks={seats[v.actorId] ?? [v.check]} revealed={i < shown} onFix={onFix} onNegotiate={onNegotiate} />
        ))}
      </ul>
      <AnimatePresence>
        {done && changes.length > 0 && (
          <motion.ul key={changes.join("|")} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-1 rounded-2xl border border-cyan/30 bg-cyan/5 px-4 py-3 text-sm" aria-live="polite">
            {changes.map((c) => <li key={c} className="flex items-start gap-2"><Icon name="arrow" size={14} className="mt-0.5 shrink-0 text-cyan" /><span className="min-w-0">{c}</span></li>)}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
