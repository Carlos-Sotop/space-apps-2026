import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { sfx } from "@/components/audio";
import { Icon, InfoButton } from "@/components/ui";
import { forecast, readinessAllGo, readinessChanges, readinessReview, readinessSeats, READINESS_SOURCES, RISK_RUNS, type ReadinessVoteDetail } from "@/engine";
import type { Catalog, DesignStep, Forecast, LiveContext, MissionDesign } from "@/engine/types";
import { fmtPct } from "@/lib/format";
import { useGame } from "@/store/game";
import type { StepId } from "@/store/steps";
import { StepTitle, useDesign } from "./useDesign";
import { ReviewFeed } from "./ReviewFeed";
import { SignPanel } from "./SignPanel";

/** Green from 70% success, amber from 50%, red below: the same lines the reliability seat uses. */
const riskColor = (p: number) => (p >= 0.7 ? "var(--ok)" : p >= 0.5 ? "var(--tight)" : "var(--over)");

const STEP_OF: Record<DesignStep, StepId> = { charter: "values", objectives: "objectives", launch: "launch", build: "build", opentech: "opentech", rideshare: "rideshare" };

/** The latest risk assessment: simulated after the first paint, kept while the next one runs. */
function useRisk(design: MissionDesign, catalog: Catalog, live: LiveContext | null): { risk: Forecast | null; fresh: boolean } {
  const [done, setDone] = useState<{ design: MissionDesign; risk: Forecast } | null>(null);
  useEffect(() => {
    const t = window.setTimeout(() => setDone({ design, risk: forecast(design, catalog, RISK_RUNS, live ?? undefined) }), 30);
    return () => window.clearTimeout(t);
  }, [design, catalog, live]);
  return { risk: done?.risk ?? null, fresh: done?.design === design };
}

function RiskInfo({ risk }: { risk: Forecast | null }) {
  return (
    <div className="space-y-3 text-sm text-fg/90">
      <p>NASA estimates the odds of losing a mission with probabilistic risk assessment (PRA): model what can go wrong, run it many times, count the failures.</p>
      <p>Here the game engine flies this exact design {RISK_RUNS} times, each with different luck: launch, part failures, space weather.</p>
      {risk && (
        <p className="num">Success in {Math.round(risk.successProbability * risk.runs)} of {risk.runs} flights. Most scores land between {Math.round(risk.p10)} and {Math.round(risk.p90)} points (10th to 90th percentile).</p>
      )}
    </div>
  );
}

/** Monte Carlo over the flight engine, shown as the chance of success. */
function RiskAssessment({ risk, fresh }: { risk: Forecast | null; fresh: boolean }) {
  const color = risk ? riskColor(risk.successProbability) : "var(--muted)";
  return (
    <div className="glass flex flex-wrap items-center gap-x-4 gap-y-2 p-4" data-coach="council.risk">
      <div className="flex items-baseline gap-2">
        <span className="font-display text-sm">Risk assessment</span>
        <span className="num font-display text-3xl leading-none transition-colors" style={{ color, opacity: fresh ? 1 : 0.6 }} aria-live="polite">{risk ? fmtPct(risk.successProbability) : "..."}</span>
        <span className="text-xs text-muted">success</span>
      </div>
      <div className="h-2.5 min-w-32 flex-1 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${(risk?.successProbability ?? 0) * 100}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
      <span className="num text-[11px] text-faint">{RISK_RUNS} flights</span>
      <InfoButton title="Risk assessment" body={<RiskInfo risk={risk} />} sources={[READINESS_SOURCES.risk]} />
    </div>
  );
}

export function CouncilStep() {
  const { design, catalog } = useDesign();
  const live = useGame((s) => s.live);
  const patchDesign = useGame((s) => s.patchDesign);
  const setStep = useGame((s) => s.setStep);
  const { risk, fresh } = useRisk(design, catalog, live);
  const votes = useMemo(() => (risk ? readinessReview(design, catalog, risk) : null), [design, catalog, risk]);
  const seats = useMemo(() => Object.fromEntries(readinessSeats(design.coalition, catalog).map((s) => [s.actorId, s.checks])), [design.coalition, catalog]);

  // When a vote changes, say which number moved it.
  const [last, setLast] = useState<ReadinessVoteDetail[] | null>(votes);
  const [changes, setChanges] = useState<string[]>([]);
  if (votes && votes !== last) {
    setLast(votes);
    // a refreshed risk assessment with no new verdict keeps the last explanation on screen
    const next = last ? readinessChanges(last, votes, catalog) : [];
    if (next.length) setChanges(next);
  }
  const [goTo, setGoTo] = useState<DesignStep | null>(null);

  const onFix = (v: ReadinessVoteDetail) => {
    if (!v.fix) return;
    sfx("confirm");
    patchDesign(v.fix.patch);
    setGoTo(v.fix.goTo ?? null);
  };
  const onNegotiate = (v: ReadinessVoteDetail) => {
    if (!v.concession) return;
    sfx("confirm");
    patchDesign(v.concession.patch);
    setGoTo(null);
  };

  const allGo = !!votes && fresh && readinessAllGo(votes);

  return (
    <div className="space-y-5">
      <StepTitle title="Go / No-Go review" chip="All 4 must say GO" />
      <RiskAssessment risk={risk} fresh={fresh} />
      <ReviewFeed votes={votes} seats={seats} changes={changes} onFix={onFix} onNegotiate={onNegotiate} />
      {goTo && changes.length > 0 && (
        <button type="button" className="inline-flex items-center gap-1.5 text-xs underline-offset-2 hover:underline" style={{ color: "var(--cyan)" }} onClick={() => setStep(STEP_OF[goTo])}>
          See the change in {STEP_OF[goTo] === "values" ? "Values" : goTo.charAt(0).toUpperCase() + goTo.slice(1)} <Icon name="arrow" size={13} />
        </button>
      )}
      <SignPanel allGo={allGo} />
    </div>
  );
}
