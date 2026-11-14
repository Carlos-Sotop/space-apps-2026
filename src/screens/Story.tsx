import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Button, Icon } from "@/components/ui";
import { ConceptVisual, useLearn } from "@/components/learn/Primer";
import { CONCEPTS, CONCEPT_ORDER } from "@/components/learn/concepts";
import { useGame } from "@/store/game";

const rocket = (x: number, fill: number) => (
  <g key={x} transform={`translate(${x} 20)`}>
    <path d="M30 0c14 14 20 36 20 60l-8 18H18L10 60C10 36 16 14 30 0Z" fill="none" stroke="#a78bfa" strokeWidth="2" opacity="0.9" />
    <rect x="14" y={78 - fill * 70} width="32" height={fill * 70} rx="3" fill="#8b5cf6" opacity="0.45" />
    <circle cx="30" cy="36" r="6" fill="none" stroke="#60a5fa" strokeWidth="2" />
  </g>
);

function VisualAlone() {
  return (
    <svg viewBox="0 0 400 140" className="w-full max-w-md" role="img" aria-label="Three rockets flying half empty">
      {[40, 170, 300].map((x, i) => (
        <motion.g key={x} initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 * i, duration: 0.5 }}>{rocket(x, 0.45)}</motion.g>
      ))}
    </svg>
  );
}

function VisualLinked() {
  const pts: [number, number][] = [[60, 40], [340, 40], [60, 110], [340, 110], [200, 20], [200, 125]];
  return (
    <svg viewBox="0 0 400 140" className="w-full max-w-md" role="img" aria-label="Agencies linked in a network">
      {pts.map(([x, y], i) => (
        <motion.line key={i} x1={x} y1={y} x2={200} y2={70} stroke="#8b5cf6" strokeWidth="1.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.1 * i, duration: 0.6 }} />
      ))}
      {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="8" fill="#60a5fa" opacity="0.85" />)}
      <circle cx="200" cy="70" r="18" fill="none" stroke="#a78bfa" strokeWidth="2" />
      <circle cx="200" cy="70" r="6" fill="#a78bfa" />
    </svg>
  );
}

function VisualSigned() {
  return (
    <svg viewBox="0 0 400 140" className="w-full max-w-md" role="img" aria-label="Council signature and open science">
      <motion.path d="M200 12 150 32v38c0 30 20 50 50 60 30-10 50-30 50-60V32z" fill="rgba(139,92,246,0.12)" stroke="#a78bfa" strokeWidth="2" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8 }} />
      <motion.path d="m178 72 16 16 30-34" fill="none" stroke="#34d399" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.6, duration: 0.5 }} />
      {[60, 90, 120].map((y) => <rect key={y} x="290" y={y - 40} width={60 + (y % 30)} height="6" rx="3" fill="#60a5fa" opacity="0.5" />)}
      {[60, 90, 120].map((y) => <rect key={y} x="50" y={y - 40} width={60 + (y % 20)} height="6" rx="3" fill="#60a5fa" opacity="0.5" />)}
    </svg>
  );
}

function TechInside() {
  const open = useLearn((s) => s.open);
  return (
    <div className="grid w-full max-w-xl grid-cols-2 gap-2 sm:grid-cols-4">
      {CONCEPT_ORDER.map((id) => (
        <button
          key={id}
          type="button"
          onClick={(e) => { e.stopPropagation(); open(id); }}
          onPointerDown={(e) => e.stopPropagation()}
          className="flex flex-col items-center gap-1 rounded-[var(--radius-card)] border border-line bg-white/[0.03] p-2 text-xs text-muted transition hover:border-violet-bright/60 hover:text-fg"
        >
          <ConceptVisual id={id} size={64} />
          {CONCEPTS[id].short}
        </button>
      ))}
    </div>
  );
}

const PANELS: { text: string; visual: ReactNode }[] = [
  { text: "Every nation builds alone. Rockets fly half empty.", visual: <VisualAlone /> },
  { text: "SpaceDAO links agencies and companies to plan, fund and share missions together.", visual: <VisualLinked /> },
  { text: "Decisions are signed by the council and the science is open to everyone.", visual: <VisualSigned /> },
  { text: "Real tech runs under the hood. Tap any idea to see it work.", visual: <TechInside /> },
];

export default function Story() {
  const go = useGame((s) => s.go);
  const [i, setI] = useState(0);
  const last = i === PANELS.length - 1;
  const next = () => (last ? go("missions") : setI(i + 1));
  const prev = () => setI(Math.max(0, i - 1));

  return (
    <section className="relative mx-auto flex min-h-[100dvh] max-w-3xl flex-col px-4 py-5 sm:px-6">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => go("missions")}><Icon name="skip" size={14} /> Skip</Button>
      </div>
      <div className="flex flex-1 items-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={i}
            drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.25}
            onDragEnd={(_, info) => (info.offset.x < -60 ? next() : info.offset.x > 60 && prev())}
            initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.28 }}
            className="flex w-full cursor-grab flex-col items-center gap-10 text-center active:cursor-grabbing"
          >
            {PANELS[i].visual}
            <p className="font-display max-w-xl text-base leading-relaxed sm:text-xl">{PANELS[i].text}</p>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="flex items-center justify-between pb-4">
        <div className="flex gap-2" role="tablist" aria-label="Story panels">
          {PANELS.map((_, k) => (
            <button key={k} type="button" role="tab" aria-selected={k === i} aria-label={`Panel ${k + 1}`} onClick={() => setI(k)} className={`h-2 rounded-full transition-all duration-300 ${k === i ? "w-7 bg-brand" : "w-2 bg-white/20"}`} />
          ))}
        </div>
        <div className="flex gap-2">
          {i > 0 && <Button onClick={prev}>Back</Button>}
          <Button variant="primary" onClick={next}>{last ? "Choose a mission" : "Next"} <Icon name="arrow" size={16} /></Button>
        </div>
      </div>
    </section>
  );
}
