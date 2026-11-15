import { Suspense, lazy, useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import type { MissionDesign, Module, ModuleCategory, RideshareOffer } from "@/engine/types";
import { CATEGORY_COLOR, CATEGORY_LABEL } from "@/lib/catalog";
import { hasWebgl } from "@/three/webgl";

/** three.js loads only when there is a context to draw into. */
const Spacecraft3D = lazy(() => import("@/three/spacecraft/Spacecraft3D"));

/** Bottom to top. Power arrays and comms dishes are drawn as wings and a dish instead of stack blocks. */
const ORDER: ModuleCategory[] = ["propulsion", "lander", "bus", "battery", "thermal", "computer", "adcs", "habitat", "isru", "rover", "experiment", "instrument"];

const blockHeight = (m: Module) => Math.max(20, Math.min(54, 14 + Math.sqrt(m.massKg) * 1.6));

/** The flat drawing of the stack. It is what you get when WebGL is missing. */
export function SpacecraftStackSvg({ modules }: { modules: Module[] }) {
  const stack = ORDER.flatMap((c) => modules.filter((m) => m.category === c));
  const wings = modules.filter((m) => m.category === "power");
  const dishes = modules.filter((m) => m.category === "comms");
  const other = modules.filter((m) => !ORDER.includes(m.category) && m.category !== "power" && m.category !== "comms");
  const all = [...stack, ...other];

  let y = 392;
  const blocks = all.map((m) => { const h = blockHeight(m); y -= h + 3; return { m, y, h }; });
  const top = blocks.length ? blocks[blocks.length - 1].y : 392;
  const mid = blocks.length ? blocks[Math.floor(blocks.length / 2)] : null;

  return (
    <svg viewBox="0 0 260 420" className="mx-auto h-full w-full max-w-[260px]" role="img" aria-label={`Spacecraft stack with ${modules.length} modules`}>
      <ellipse cx="130" cy="402" rx="70" ry="7" fill="#8b5cf6" opacity="0.18" />
      {!modules.length && <text x="130" y="210" textAnchor="middle" fill="var(--fg-faint)" fontSize="12">Add modules to build</text>}
      <AnimatePresence>
        {blocks.map(({ m, y: by, h }) => (
          <motion.g key={m.id} initial={{ opacity: 0, y: -28 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}>
            <rect x="86" y={by} width="88" height={h} rx="7" fill={CATEGORY_COLOR[m.category]} fillOpacity="0.2" stroke={CATEGORY_COLOR[m.category]} strokeWidth="1.5" />
            <rect x="94" y={by + h / 2 - 1.5} width="26" height="3" rx="1.5" fill={CATEGORY_COLOR[m.category]} opacity="0.7" />
            <title>{m.name}</title>
          </motion.g>
        ))}
        {wings.map((m, i) => {
          const wy = (mid ? mid.y + mid.h / 2 : 300) - 14 + (i % 2) * 22 - Math.floor(i / 2) * 30;
          return (
            <motion.g key={m.id} initial={{ opacity: 0, scaleX: 0.2 }} animate={{ opacity: 1, scaleX: 1 }} exit={{ opacity: 0 }} style={{ transformOrigin: "130px 0" }}>
              <rect x="14" y={wy} width="72" height="20" rx="3" fill="#fbbf24" fillOpacity="0.16" stroke="#fbbf24" strokeWidth="1.2" />
              <rect x="174" y={wy} width="72" height="20" rx="3" fill="#fbbf24" fillOpacity="0.16" stroke="#fbbf24" strokeWidth="1.2" />
              {[32, 50, 68].map((x) => <line key={x} x1={x} y1={wy} x2={x} y2={wy + 20} stroke="#fbbf24" strokeOpacity="0.4" />)}
              {[192, 210, 228].map((x) => <line key={x} x1={x} y1={wy} x2={x} y2={wy + 20} stroke="#fbbf24" strokeOpacity="0.4" />)}
              <title>{m.name}</title>
            </motion.g>
          );
        })}
        {dishes.slice(0, 3).map((m, i) => (
          <motion.g key={m.id} initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <path d={`M${112 + i * 18} ${top - 8 - i * 4} q18 -22 36 0`} fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" />
            <line x1={130 + i * 18} y1={top - 8 - i * 4} x2={130 + i * 18} y2={top - 2} stroke="#60a5fa" strokeWidth="1.5" />
            <title>{m.name}</title>
          </motion.g>
        ))}
      </AnimatePresence>
    </svg>
  );
}

interface Props {
  design: MissionDesign;
  modules: Module[];
  /** capacity still free on the rocket, kg: drawn as the cyan volume on top */
  spareMassKg?: number;
  /** the module the pointer is on, lit up on the ship */
  highlightModuleId?: string;
  payloads?: RideshareOffer[];
}

/** The spacecraft as it is being built: 3D where it can be, the flat stack where it cannot. */
export function SpacecraftStack({ design, modules, spareMassKg, highlightModuleId, payloads }: Props) {
  const webgl = useMemo(hasWebgl, []);
  const present = [...new Set(modules.map((m) => m.category))];
  const flat = <SpacecraftStackSvg modules={modules} />;

  return (
    <div>
      <div className="relative h-60 overflow-hidden rounded-xl border border-line bg-[#070817] sm:h-72">
        {webgl ? (
          <ErrorBoundary fallback={flat}>
            <Suspense fallback={flat}>
              <Spacecraft3D design={design} spareMassKg={spareMassKg} highlightModuleId={highlightModuleId} payloads={payloads} compact />
            </Suspense>
          </ErrorBoundary>
        ) : (
          flat
        )}
        {!modules.length && (
          <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-xs text-faint">Add modules to build</p>
        )}
      </div>
      {present.length > 0 && (
        <ul className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] text-muted">
          {present.map((c) => <li key={c} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: CATEGORY_COLOR[c] }} />{CATEGORY_LABEL[c]}</li>)}
        </ul>
      )}
    </div>
  );
}
