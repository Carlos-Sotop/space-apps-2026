import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { InfoButton } from "@/components/ui";
import { computeResources, councilReview, forecast, validateDesign } from "@/engine";
import type { Forecast, MissionDesign, Source } from "@/engine/types";
import { fmtPct } from "@/lib/format";
import { useGame } from "@/store/game";
import { StepTitle, useDesign } from "./useDesign";
import { ReviewFeed } from "./ReviewFeed";
import { SignPanel } from "./SignPanel";

/** Flights the risk assessment simulates: 15 to 45 ms per mission on a laptop. */
const RISK_RUNS = 200;

const RISK_SOURCES: Source[] = [
  { title: "NASA/SP-2011-3421: Probabilistic Risk Assessment Procedures Guide for NASA Managers and Practitioners", url: "https://ntrs.nasa.gov/citations/20120001369" },
];

/** Green from 70% success, amber from 50%, red below. */
const riskColor = (p: number) => (p >= 0.7 ? "var(--ok)" : p >= 0.5 ? "var(--tight)" : "var(--over)");

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

/** Monte Carlo over the flight engine, shown as the chance of success. Runs after the first paint. */
function RiskAssessment() {
  const { design, catalog } = useDesign();
  const live = useGame((s) => s.live);
  const [done, setDone] = useState<{ design: MissionDesign; risk: Forecast } | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDone({ design, risk: forecast(design, catalog, RISK_RUNS, live ?? undefined) }), 30);
    return () => window.clearTimeout(t);
  }, [design, catalog, live]);

  const risk = done?.design === design ? done.risk : null;
  const color = risk ? riskColor(risk.successProbability) : "var(--muted)";

  return (
    <div className="glass space-y-3 p-5" data-coach="council.risk">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-base">Risk assessment</h3>
        <InfoButton title="Risk assessment" body={<RiskInfo risk={risk} />} sources={RISK_SOURCES} />
      </div>
      <div className="flex items-baseline gap-2" aria-live="polite">
        <span className="num font-display text-4xl leading-none" style={{ color }}>{risk ? fmtPct(risk.successProbability) : "..."}</span>
        <span className="text-sm text-muted">{risk ? "chance of success" : "Simulating flights"}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
        <motion.div
          key={risk ? "done" : "pending"}
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${(risk?.successProbability ?? 0.15) * 100}%`, opacity: risk ? 1 : [0.3, 0.8, 0.3] }}
          transition={risk ? { duration: 0.8, ease: "easeOut" } : { duration: 1.2, repeat: Infinity }}
        />
      </div>
      <p className="num text-xs text-faint">{RISK_RUNS} simulated flights</p>
    </div>
  );
}

export function CouncilStep() {
  const { design, catalog } = useDesign();
  const reviews = useMemo(() => councilReview(design, catalog), [design, catalog]);
  const issues = useMemo(() => validateDesign(design, catalog), [design, catalog]);
  const report = useMemo(() => computeResources(design, catalog), [design, catalog]);
  const [feedDone, setFeedDone] = useState(false);
  const onDone = useCallback(() => setFeedDone(true), []);

  return (
    <div className="space-y-6">
      <StepTitle title="Council review" chip="Review and sign" />
      <ReviewFeed reviews={reviews} issues={issues} report={report} onDone={onDone} />
      {feedDone && <RiskAssessment />}
      {feedDone && <SignPanel />}
    </div>
  );
}
