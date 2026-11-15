import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Button, Icon, Modal, type IconName } from "@/components/ui";
import { useGame } from "@/store/game";
import { Rocky } from "./Rocky";

function FrameNetwork() {
  const nodes: { x: number; y: number; icon: IconName }[] = [
    { x: 40, y: 50, icon: "globe" }, { x: 280, y: 50, icon: "science" }, { x: 30, y: 150, icon: "antenna" },
    { x: 290, y: 150, icon: "rover" }, { x: 160, y: 14, icon: "moon" },
  ];
  return (
    <svg viewBox="0 0 320 200" className="w-full max-w-sm" role="img" aria-label="Agencies, companies and people connected around one mission">
      {nodes.map((n, i) => (
        <motion.line key={i} x1={n.x} y1={n.y} x2={160} y2={105} stroke="#8b5cf6" strokeWidth="2" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.15 * i, duration: 0.6 }} />
      ))}
      {nodes.map((n, i) => (
        <motion.g key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.15 * i + 0.2, type: "spring" }} style={{ originX: `${n.x}px`, originY: `${n.y}px`, transformBox: "view-box" }}>
          <circle cx={n.x} cy={n.y} r="20" fill="#1a1740" stroke="#60a5fa" strokeWidth="2" />
          <Icon name={n.icon} x={n.x - 10} y={n.y - 10} width={20} height={20} className="text-blue-bright" />
        </motion.g>
      ))}
      <motion.circle cx="160" cy="105" r="34" fill="none" stroke="#22d3ee" strokeWidth="2" animate={{ r: [34, 40, 34], opacity: [1, 0.5, 1] }} transition={{ duration: 2.4, repeat: Infinity }} />
      <circle cx="160" cy="105" r="28" fill="#2a2063" stroke="#a78bfa" strokeWidth="2" />
      <Icon name="rocket" x={146} y={91} width={28} height={28} className="text-violet-bright" />
    </svg>
  );
}

function FramePath() {
  const items: { icon: IconName; label: string }[] = [
    { icon: "moon", label: "Mission" }, { icon: "globe", label: "Team" }, { icon: "build", label: "Design" },
    { icon: "launch", label: "Launch" }, { icon: "rover", label: "Operate" },
  ];
  return (
    <ol className="m-0 flex list-none items-start justify-center gap-1 p-0 sm:gap-3">
      {items.map((it, i) => (
        <motion.li key={it.label} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 * i }} className="flex w-[3.7rem] flex-col items-center gap-2 sm:w-20">
          <span className="grid h-12 w-12 place-items-center rounded-full border border-cyan/60 bg-glass-strong text-cyan sm:h-16 sm:w-16"><Icon name={it.icon} size={26} /></span>
          <span className="text-[11px] text-muted sm:text-sm">{it.label}</span>
        </motion.li>
      ))}
    </ol>
  );
}

function FrameGauges() {
  const g: { icon: IconName; label: string; v: number }[] = [
    { icon: "mass", label: "Mass", v: 0.7 }, { icon: "power", label: "Power", v: 0.5 }, { icon: "budget", label: "Budget", v: 0.8 },
    { icon: "data", label: "Data", v: 0.4 }, { icon: "comms", label: "Comms", v: 0.6 }, { icon: "lifetime", label: "Lifetime", v: 0.9 },
  ];
  return (
    <div className="flex items-center gap-3 sm:gap-6">
      <Rocky pose="wave" size={96} />
      <ul className="m-0 grid w-48 list-none gap-2 p-0 sm:w-64">
        {g.map((x, i) => (
          <li key={x.label} className="flex items-center gap-2 text-xs text-muted">
            <Icon name={x.icon} size={16} className="shrink-0 text-violet-bright" />
            <span className="w-14 shrink-0">{x.label}</span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
              <motion.span className="block h-full rounded-full bg-ok" initial={{ width: 0 }} animate={{ width: `${x.v * 100}%` }} transition={{ delay: 0.1 * i, duration: 0.7 }} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const FRAMES: { text: string; visual: ReactNode }[] = [
  { text: "SpaceDAO is a shared mission table where agencies, companies and people build space missions together.", visual: <FrameNetwork /> },
  { text: "You will pick a mission, choose partners, design the spacecraft, then launch and run it.", visual: <FramePath /> },
  { text: "Every choice moves six gauges. Keep them healthy and your mission flies.", visual: <FrameGauges /> },
];

function Frames() {
  const setOnboarding = useGame((s) => s.setOnboarding);
  const [i, setI] = useState(0);
  const last = i === FRAMES.length - 1;
  const done = () => setOnboarding("mode");
  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col bg-[#04050d]/90 px-4 py-5 backdrop-blur-xl sm:px-8"
      role="dialog" aria-modal="true" aria-label="Welcome to SpaceDAO"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <div className="flex justify-end"><Button size="sm" onClick={done}><Icon name="skip" size={14} /> Skip</Button></div>
      <div className="mx-auto flex w-full max-w-2xl flex-1 items-center">
        <AnimatePresence mode="wait">
          <motion.div key={i} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.28 }} className="flex w-full flex-col items-center gap-10 text-center">
            {FRAMES[i].visual}
            <p className="font-display max-w-xl text-base leading-relaxed sm:text-xl">{FRAMES[i].text}</p>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between pb-4">
        <div className="flex gap-2" role="tablist" aria-label="Intro frames">
          {FRAMES.map((_, k) => (
            <button key={k} type="button" role="tab" aria-selected={k === i} aria-label={`Frame ${k + 1}`} onClick={() => setI(k)} className={`h-2 rounded-full transition-all duration-300 ${k === i ? "w-7 bg-cyan" : "w-2 bg-white/25"}`} />
          ))}
        </div>
        <div className="flex gap-2">
          {i > 0 && <Button onClick={() => setI(i - 1)}>Back</Button>}
          <Button variant="primary" onClick={last ? done : () => setI(i + 1)}>{last ? "Let's go" : "Next"} <Icon name="arrow" size={16} /></Button>
        </div>
      </div>
    </motion.div>
  );
}

function ModeModal() {
  const open = useGame((s) => s.onboarding === "mode");
  const setOnboarding = useGame((s) => s.setOnboarding);
  const choose = useGame((s) => s.choosePlayMode);
  return (
    <Modal open={open} onClose={() => setOnboarding(null)} title="How do you want to play?">
      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={() => choose("guided")} className="glass flex flex-col items-center gap-2 p-4 text-center transition hover:border-cyan hover:shadow-select">
          <Rocky pose="wave" size={72} />
          <span className="font-display text-sm">Guided by Rocky</span>
          <span className="text-sm text-muted">Tips on every screen.</span>
        </button>
        <button type="button" onClick={() => choose("quick")} className="glass flex flex-col items-center gap-2 p-4 text-center transition hover:border-cyan hover:shadow-select">
          <span className="grid h-[90px] place-items-center text-cyan"><Icon name="power" size={56} /></span>
          <span className="font-display text-sm">Quick play</span>
          <span className="text-sm text-muted">Pre-filled picks, about 3 minutes.</span>
        </button>
      </div>
    </Modal>
  );
}

/** Mounted once in App: the 3-frame intro, then the Guided / Quick choice. */
export function OnboardingHost() {
  const frames = useGame((s) => s.onboarding === "frames");
  return (
    <>
      <AnimatePresence>{frames && <Frames key="frames" />}</AnimatePresence>
      <ModeModal />
    </>
  );
}
