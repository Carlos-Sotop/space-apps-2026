import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Button, Icon, InfoButton } from "@/components/ui";
import type { Source } from "@/engine/types";
import { ConceptVisual, useLearn } from "@/components/learn/Primer";
import { CONCEPTS, CONCEPT_ORDER } from "@/components/learn/concepts";
import { useGame } from "@/store/game";

function VisualTeam() {
  const stats: [string, string][] = [["5", "agencies"], ["15", "nations"], ["70+", "Artemis Accords nations"]];
  return (
    <div className="flex w-full max-w-md justify-between gap-2" role="img" aria-label="5 agencies, 15 nations, more than 70 Artemis Accords nations">
      {stats.map(([n, label], i) => (
        <motion.div key={n} initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 * i, duration: 0.5 }} className="flex flex-1 flex-col items-center gap-2">
          <span className="font-display bg-brand bg-clip-text text-4xl text-transparent sm:text-5xl">{n}</span>
          <span className="text-xs text-muted sm:text-sm">{label}</span>
        </motion.div>
      ))}
    </div>
  );
}

function VisualApart() {
  const pts: [number, number][] = [[50, 40], [200, 30], [350, 45], [60, 110], [200, 115], [345, 108]];
  return (
    <svg viewBox="0 0 400 140" className="w-full max-w-md" role="img" aria-label="Separate partners, locked apart by rules">
      {pts.map(([x, y], i) => (
        <motion.g key={i} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 * i }} style={{ originX: `${x}px`, originY: `${y}px`, transformBox: "view-box" }}>
          <circle cx={x} cy={y} r="14" fill="#1a1740" stroke="#60a5fa" strokeWidth="2" />
          <circle cx={x} cy={y} r="4" fill="#60a5fa" />
        </motion.g>
      ))}
      {[0, 1, 3, 4].map((i) => {
        const [x1, y1] = pts[i];
        const [x2, y2] = pts[i + 1];
        return <line key={i} x1={x1 + 16} y1={y1} x2={x2 - 16} y2={y2} stroke="#5d6390" strokeWidth="1.5" strokeDasharray="4 6" />;
      })}
      {[0, 1, 3, 4].map((i) => {
        const [x1, y1] = pts[i];
        const [x2, y2] = pts[i + 1];
        return <Icon key={i} name="lock" x={(x1 + x2) / 2 - 9} y={(y1 + y2) / 2 - 9} width={18} height={18} className="text-tight" />;
      })}
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

const FACT_SOURCES: Source[] = [
  { title: "NASA: International Space Station cooperation", url: "https://www.nasa.gov/international-space-station/space-station-international-cooperation/" },
  { title: "ESA: ISS legal framework", url: "https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/International_Space_Station/International_Space_Station_legal_framework" },
  { title: "NASA: Artemis Accords", url: "https://www.nasa.gov/artemis-accords/" },
];

interface Panel { text: string; visual: ReactNode; infoTitle: string; info: ReactNode; sources?: Source[] }

const PANELS: Panel[] = [
  {
    text: "Space is already a team sport: 5 agencies from 15 nations run one station, and more than 70 nations signed the Artemis Accords.",
    visual: <VisualTeam />,
    infoTitle: "Space is already a team sport",
    info: <p>Five space agencies from 15 nations operate the International Space Station together, and more than 70 nations have signed the Artemis Accords, shared principles for peaceful exploration.</p>,
    sources: FACT_SOURCES,
  },
  {
    text: "But every partnership is negotiated one treaty at a time. Designs stay behind export rules, data sits in separate archives, and most of the world watches from outside.",
    visual: <VisualApart />,
    infoTitle: "One treaty at a time",
    info: <p>The station runs under an intergovernmental agreement and the Artemis Accords are signed country by country. Each partnership is its own negotiation.</p>,
    sources: FACT_SOURCES,
  },
  {
    text: "SpaceDAO is a shared mission table: agencies, companies and people plan, fund and fly missions together on one open network.",
    visual: <VisualLinked />,
    infoTitle: "A shared mission table",
    info: <p>This is our proposal, not an existing fact: one open network where partners plan, fund and fly missions together. In this game you try it with play credits only.</p>,
  },
  {
    text: "Partners review every decision and sign it together, and the science comes back open to everyone.",
    visual: <VisualSigned />,
    infoTitle: "Review, sign, share",
    info: <p>In the game, a mission needs a Go from every partner and a shared signature before launch. Results go to an open registry. This is how we propose it could work.</p>,
  },
  {
    text: "Real tech runs under the hood. Tap any idea to see it work.",
    visual: <TechInside />,
    infoTitle: "Real tech under the hood",
    info: <p>Each tile opens a short explainer with a live demo and its sources.</p>,
  },
];

export default function Story() {
  const begin = useGame((s) => s.beginOnboarding);
  const [i, setI] = useState(0);
  const last = i === PANELS.length - 1;
  const next = () => (last ? begin() : setI(i + 1));
  const prev = () => setI(Math.max(0, i - 1));

  return (
    <section className="relative mx-auto flex min-h-[100dvh] max-w-3xl flex-col px-4 py-5 sm:px-6">
      <div className="flex justify-end">
        <Button size="sm" onClick={begin}><Icon name="skip" size={14} /> Skip</Button>
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
            <div className="flex max-w-xl items-start gap-3">
              <p className="font-display text-base leading-relaxed sm:text-xl">{PANELS[i].text}</p>
              <InfoButton title={PANELS[i].infoTitle} body={PANELS[i].info} sources={PANELS[i].sources} className="mt-1 shrink-0" />
            </div>
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
          <Button variant="primary" onClick={next}>{last ? "Begin mission" : "Next"} <Icon name="arrow" size={16} /></Button>
        </div>
      </div>
    </section>
  );
}
