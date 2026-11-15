import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CoalitionBar } from "@/components/hud/CoalitionBar";
import { ResourceHud, useIssues } from "@/components/hud/ResourceHud";
import { StepRail } from "@/components/hud/StepRail";
import { TopBar } from "@/components/hud/TopBar";
import { WarningsPanel } from "@/components/hud/WarningsPanel";
import { ActionBar, Button, Icon, StepHeader } from "@/components/ui";
import { LearnChip } from "@/components/learn/Primer";
import { STEP_CONCEPTS } from "@/components/learn/concepts";
import { useGame } from "@/store/game";
import { STEPS, type StepId } from "@/store/steps";
import { BuildStep } from "./BuildStep";
import { CouncilStep } from "./CouncilStep";
import { LaunchStep } from "./LaunchStep";
import { ObjectivesStep } from "./ObjectivesStep";
import { OpenTechStep } from "./OpenTechStep";
import { RideshareStep } from "./RideshareStep";
import { ValuesStep } from "./ValuesStep";
import { useDesign } from "./useDesign";

const VIEW: Record<StepId, () => React.JSX.Element> = {
  values: ValuesStep, objectives: ObjectivesStep, launch: LaunchStep, build: BuildStep, opentech: OpenTechStep, rideshare: RideshareStep, council: CouncilStep,
};

function Inner() {
  const { design, mission } = useDesign();
  const step = useGame((s) => s.step);
  const setStep = useGame((s) => s.setStep);
  const go = useGame((s) => s.go);
  const issues = useIssues(design);
  const idx = STEPS.findIndex((s) => s.id === step);
  const View = VIEW[step];

  const blockerSteps: StepId[] = [];
  if (issues.some((i) => i.severity === "blocker")) blockerSteps.push("council");

  return (
    <div>
      <div className="lg:sticky lg:top-0 lg:z-30">
        <div className="border-b border-line bg-bg/80 backdrop-blur-xl">
          <TopBar title={mission.name} onBack={() => go("coalition")} backLabel="Back to coalition" right={<CoalitionBar coalition={design.coalition} />} />
          <div className="mx-auto max-w-7xl space-y-3 px-4 pb-3 sm:px-6">
            <ResourceHud design={design} />
          </div>
        </div>
      </div>
      <div className="mx-auto mt-6 grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[210px_1fr]">
        <aside><StepRail steps={STEPS} current={step} onSelect={setStep} flagged={blockerSteps} /></aside>
        <section className="min-w-0">
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
              <StepHeader eyebrow={`Step ${idx + 1} of ${STEPS.length}`} title={STEPS[idx].title} subtitle={STEPS[idx].hint} />
              <div className="mb-5" data-coach="control.issues-panel"><WarningsPanel issues={issues} /></div>
              {STEP_CONCEPTS[step] && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {STEP_CONCEPTS[step]!.map((c) => <LearnChip key={c} id={c} />)}
                </div>
              )}
              <View />
            </motion.div>
          </AnimatePresence>
        </section>
      </div>
      <ActionBar
        className="mt-8"
        left={<Button disabled={idx === 0} onClick={() => setStep(STEPS[idx - 1].id)}><Icon name="back" size={16} /> <span className="hidden sm:inline">Back</span></Button>}
      >
        {idx < STEPS.length - 1 && <Button variant="primary" data-coach="control.next" onClick={() => setStep(STEPS[idx + 1].id)}>Next: {STEPS[idx + 1].label} <Icon name="arrow" size={16} /></Button>}
      </ActionBar>
    </div>
  );
}

export default function MissionControl() {
  const design = useGame((s) => s.design);
  const go = useGame((s) => s.go);
  useEffect(() => { if (!design) go("coalition"); }, [design, go]);
  if (!design) return null;
  return <Inner />;
}
