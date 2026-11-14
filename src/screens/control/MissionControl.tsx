import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CoalitionBar } from "@/components/hud/CoalitionBar";
import { IssueChips, ResourceHud, useIssues } from "@/components/hud/ResourceHud";
import { StepRail } from "@/components/hud/StepRail";
import { TopBar } from "@/components/hud/TopBar";
import { Button, Icon } from "@/components/ui";
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
    <div className="pb-10">
      <div className="lg:sticky lg:top-0 lg:z-30">
        <div className="border-b border-line bg-bg/80 backdrop-blur-xl">
          <TopBar title={mission.name} onBack={() => go("coalition")} backLabel="Back to coalition" right={<CoalitionBar coalition={design.coalition} />} />
          <div className="mx-auto max-w-7xl space-y-3 px-4 pb-3 sm:px-6">
            <ResourceHud design={design} />
            <IssueChips issues={issues} />
          </div>
        </div>
      </div>
      <div className="mx-auto mt-6 grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[210px_1fr]">
        <aside><StepRail steps={STEPS} current={step} onSelect={setStep} flagged={blockerSteps} /></aside>
        <section className="min-w-0">
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
              {STEP_CONCEPTS[step] && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {STEP_CONCEPTS[step]!.map((c) => <LearnChip key={c} id={c} />)}
                </div>
              )}
              <View />
            </motion.div>
          </AnimatePresence>
          <div className="mt-8 flex items-center justify-between">
            <Button disabled={idx === 0} onClick={() => setStep(STEPS[idx - 1].id)}><Icon name="back" size={16} /> Back</Button>
            {idx < STEPS.length - 1 && <Button variant="primary" onClick={() => setStep(STEPS[idx + 1].id)}>Next: {STEPS[idx + 1].label} <Icon name="arrow" size={16} /></Button>}
          </div>
        </section>
      </div>
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
