import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { create } from "zustand";
import { Icon, type IconName } from "@/components/ui";
import { CONCEPTS, CONCEPT_ORDER, type ConceptId } from "./concepts";
import { HashDemo, SignDemo } from "./demos";

interface LearnStore {
  id: ConceptId | null;
  open: (id: ConceptId) => void;
  close: () => void;
}

export const useLearn = create<LearnStore>((set) => ({ id: null, open: (id) => set({ id }), close: () => set({ id: null }) }));

const draw = { initial: { pathLength: 0, opacity: 0 }, animate: { pathLength: 1, opacity: 1 } };

/** Small animated picture for each idea; plain shapes, no text to read. */
export function ConceptVisual({ id, size = 160 }: { id: ConceptId; size?: number }) {
  const nodes: [number, number][] = [[40, 40], [120, 40], [40, 120], [120, 120]];
  const body = (() => {
    switch (id) {
      case "dao":
      case "weighted-vote":
        return (
          <>
            <motion.rect x="62" y="62" width="36" height="36" rx="6" fill="rgba(139,92,246,0.18)" stroke="#a78bfa" strokeWidth="2" {...draw} transition={{ duration: 0.6 }} />
            {nodes.map(([x, y], i) => (
              <g key={i}>
                <motion.line x1={x} y1={y} x2={80} y2={80} stroke="#60a5fa" strokeWidth="1.5" {...draw} transition={{ delay: 0.1 * i, duration: 0.5 }} />
                <motion.circle cx={x} cy={y} r={id === "weighted-vote" ? 6 + i * 3 : 10} fill="#60a5fa" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.15 * i, type: "spring" }} />
              </g>
            ))}
            {[0, 1, 2].map((k) => <motion.rect key={k} x="70" y={70 + k * 7} width="20" height="3" rx="1.5" fill="#c4b5fd" initial={{ width: 0 }} animate={{ width: 20 }} transition={{ delay: 0.6 + k * 0.15 }} />)}
          </>
        );
      case "futarchy":
        return (
          <>
            {[{ x: 40, h: 70, c: "#a78bfa" }, { x: 95, h: 100, c: "#34d399" }].map((b, i) => (
              <motion.rect key={i} x={b.x} width="30" rx="4" fill={b.c} opacity="0.75" initial={{ y: 140, height: 0 }} animate={{ y: 140 - b.h, height: b.h }} transition={{ delay: 0.2 * i, duration: 0.7, type: "spring" }} />
            ))}
            <motion.path d="M30 140h105" stroke="#5d6390" strokeWidth="2" />
            <motion.path d="m100 26 10-10 10 10" fill="none" stroke="#34d399" strokeWidth="3" strokeLinecap="round" {...draw} transition={{ delay: 0.9 }} />
          </>
        );
      case "multisig":
        return (
          <>
            <motion.rect x="35" y="35" width="90" height="90" rx="12" fill="rgba(96,165,250,0.08)" stroke="#60a5fa" strokeWidth="2" {...draw} />
            <circle cx="80" cy="80" r="16" fill="none" stroke="#a78bfa" strokeWidth="3" />
            {nodes.map(([x, y], i) => (
              <motion.circle key={i} cx={x * 0.55 + 36} cy={y * 0.55 + 36} r="5" initial={{ fill: "#3b3f52" }} animate={{ fill: "#34d399" }} transition={{ delay: 0.4 + i * 0.35 }} />
            ))}
          </>
        );
      case "post-quantum":
        return (
          <>
            <motion.path d="M80 18 38 36v34c0 30 18 52 42 62 24-10 42-32 42-62V36z" fill="rgba(139,92,246,0.12)" stroke="#a78bfa" strokeWidth="2" {...draw} transition={{ duration: 0.8 }} />
            {[0, 60, 120].map((r) => (
              <motion.ellipse key={r} cx="80" cy="76" rx="26" ry="10" fill="none" stroke="#22d3ee" strokeWidth="1.5" transform={`rotate(${r} 80 76)`} initial={{ opacity: 0 }} animate={{ opacity: 0.8 }} transition={{ delay: 0.5 + r / 200 }} />
            ))}
            <circle cx="80" cy="76" r="5" fill="#22d3ee" />
          </>
        );
      case "fingerprint":
        return (
          <>
            <rect x="24" y="30" width="56" height="74" rx="6" fill="rgba(96,165,250,0.08)" stroke="#60a5fa" strokeWidth="2" />
            {[44, 56, 68, 80].map((y) => <rect key={y} x="34" y={y} width="36" height="4" rx="2" fill="#60a5fa" opacity="0.5" />)}
            <motion.path d="M84 67h18" stroke="#a78bfa" strokeWidth="2" {...draw} transition={{ delay: 0.3 }} />
            {[0, 1, 2, 3].map((k) => (
              <motion.path key={k} d={`M${126 - k * 2} ${52 + k * 4}a${14 + k * 4} ${14 + k * 4} 0 1 1 0 ${30 - k * 8}`} fill="none" stroke="#c4b5fd" strokeWidth="2" {...draw} transition={{ delay: 0.5 + k * 0.12 }} />
            ))}
          </>
        );
      case "desci":
        return (
          <>
            <motion.path d="M80 140V90M80 90 45 55M80 90l35-35M45 55 30 30M45 55l20-25M115 55l-15-25M115 55l20-25" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" {...draw} transition={{ duration: 1 }} />
            {[[30, 30], [65, 30], [100, 30], [135, 30], [80, 90]].map(([x, y], i) => <motion.circle key={i} cx={x} cy={y} r="7" fill="#60a5fa" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.6 + i * 0.1 }} />)}
          </>
        );
      case "rideshare":
        return (
          <>
            <path d="M80 14c22 20 30 50 30 80l-10 22H60L50 94c0-30 8-60 30-80Z" fill="none" stroke="#a78bfa" strokeWidth="2" />
            {[0, 1, 2, 3].map((k) => (
              <motion.rect key={k} x={k % 2 ? 82 : 62} y={k < 2 ? 56 : 80} width="16" height="18" rx="3" initial={{ fill: "rgba(255,255,255,0.06)" }} animate={{ fill: k === 0 ? "#8b5cf6" : "#60a5fa" }} transition={{ delay: 0.3 + k * 0.3 }} />
            ))}
          </>
        );
    }
  })();
  return (
    <svg viewBox="0 0 160 160" width={size} height={size} role="img" aria-label={CONCEPTS[id].title}>
      <defs>
        <radialGradient id={`halo-${id}`}><stop offset="0" stopColor="#8b5cf6" stopOpacity="0.28" /><stop offset="1" stopColor="#8b5cf6" stopOpacity="0" /></radialGradient>
      </defs>
      <circle cx="80" cy="80" r="78" fill={`url(#halo-${id})`} />
      {body}
    </svg>
  );
}

const BEATS: { key: "like" | "inGame" | "inSpace"; label: string; icon: IconName }[] = [
  { key: "like", label: "Think of it like", icon: "sparkle" },
  { key: "inGame", label: "In this game", icon: "spacecraft" },
  { key: "inSpace", label: "Why it matters in space", icon: "globe" },
];

/** Renders the concept in 3 beats plus its live demo. */
export function ConceptBody({ id }: { id: ConceptId }) {
  const c = CONCEPTS[id];
  return (
    <div className="space-y-4">
      <div className="flex justify-center"><ConceptVisual id={id} /></div>
      <ol className="space-y-3">
        {BEATS.map((b, i) => (
          <motion.li key={b.key} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.12 }} className="flex gap-3 rounded-[var(--radius-card)] border border-line bg-white/[0.03] p-3">
            <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-violet/20 text-violet-bright"><Icon name={b.icon} size={15} /></span>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-faint">{b.label}</div>
              <p className="m-0 text-[15px] leading-snug text-fg/90">{c[b.key]}</p>
            </div>
          </motion.li>
        ))}
      </ol>
      {c.demo && (
        <div className="rounded-[var(--radius-card)] border border-violet/30 bg-violet/[0.06] p-4">
          <div className="mb-2 text-[11px] uppercase tracking-wider text-violet-bright">Try it, for real</div>
          {c.demo === "hash" ? <HashDemo /> : <SignDemo />}
        </div>
      )}
      <ul className="space-y-1 text-xs text-faint">
        {c.sources.map((s) => (
          <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-fg"><Icon name="external" size={12} />{s.title}</a></li>
        ))}
      </ul>
    </div>
  );
}

/** Mounted once in App; opens with useLearn.getState().open(id). Swipe-free, keyboard-friendly. */
export function PrimerHost() {
  const id = useLearn((s) => s.id);
  const open = useLearn((s) => s.open);
  const close = useLearn((s) => s.close);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!id) return;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [id, close]);
  const idx = id ? CONCEPT_ORDER.indexOf(id) : -1;
  const next = idx >= 0 ? CONCEPT_ORDER[(idx + 1) % CONCEPT_ORDER.length] : null;
  return (
    <AnimatePresence>
      {id && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4">
          <motion.div className="absolute inset-0 bg-black/65 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close} />
          <motion.div
            key={id}
            ref={ref}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={CONCEPTS[id].title}
            className="glass-strong relative max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-[20px] bg-[#0b0d24]/95 p-5 outline-none sm:rounded-[20px] sm:p-6"
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} transition={{ duration: 0.25 }}
          >
            <div className="mb-2 flex items-start justify-between gap-4">
              <h2 className="font-display m-0 text-base leading-snug sm:text-lg">{CONCEPTS[id].title}</h2>
              <button type="button" aria-label="Close" onClick={close} className="shrink-0 rounded-full border border-line p-1.5 text-muted hover:text-fg"><Icon name="x" size={16} /></button>
            </div>
            <ConceptBody id={id} />
            {next && (
              <div className="mt-5 flex justify-end">
                <button type="button" onClick={() => open(next)} className="inline-flex items-center gap-2 text-sm text-violet-bright hover:text-fg">
                  Next idea: {CONCEPTS[next].short} <Icon name="arrow" size={14} />
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/** "What's this?" pill that opens a primer. */
export function LearnChip({ id, className = "" }: { id: ConceptId; className?: string }) {
  const open = useLearn((s) => s.open);
  return (
    <button
      type="button"
      onClick={() => open(id)}
      className={`inline-flex items-center gap-1.5 rounded-full border border-violet/35 bg-violet/10 px-3 py-1 text-xs text-violet-bright transition hover:border-violet-bright hover:bg-violet/20 ${className}`}
    >
      <Icon name="sparkle" size={13} /> {CONCEPTS[id].short}
    </button>
  );
}
