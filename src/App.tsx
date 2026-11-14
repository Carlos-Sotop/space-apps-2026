import { lazy, Suspense, useEffect } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { InfoDrawerHost, Starfield, ToastHost } from "@/components/ui";
import { PrimerHost } from "@/components/learn/Primer";
import { useLive } from "@/live/useLive";
import { useGame } from "@/store/game";
import type { Screen } from "@/store/steps";
import Intro from "@/screens/Intro";
import Story from "@/screens/Story";
import MissionSelect from "@/screens/MissionSelect";
import Coalition from "@/screens/Coalition";
import Debrief from "@/screens/Debrief";

const MissionControl = lazy(() => import("@/screens/control/MissionControl"));
const Flight = lazy(() => import("@/screens/Flight"));

function ScreenView({ screen }: { screen: Screen }) {
  switch (screen) {
    case "intro": return <Intro />;
    case "story": return <Story />;
    case "missions": return <MissionSelect />;
    case "coalition": return <Coalition />;
    case "control": return <MissionControl />;
    case "flight": return <Flight />;
    case "debrief": return <Debrief />;
  }
}

export default function App() {
  useLive();
  const screen = useGame((s) => s.screen);

  useEffect(() => {
    useGame.getState().devJump(new URLSearchParams(window.location.search));
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <Starfield />
      <main className="relative z-10 min-h-[100dvh]">
        <AnimatePresence mode="wait">
          <motion.div
            key={screen}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
          >
            <Suspense fallback={<div className="grid min-h-[100dvh] place-items-center text-muted">Loading…</div>}>
              <ScreenView screen={screen} />
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>
      <InfoDrawerHost />
      <PrimerHost />
      <ToastHost />
    </MotionConfig>
  );
}
