import { AnimatePresence, motion } from "motion/react";
import { Icon, type IconName } from "@/components/ui";
import type { Timeline } from "./flightTimeline";

/** A real measurement the flight is using right now, with the record it came from. */
export interface LiveItem {
  icon: IconName;
  label: string;
  value: string;
  href?: string;
  /** true when the value came from the bundled snapshot instead of a live call */
  snapshot?: boolean;
}

interface Props {
  timeline: Timeline;
  /** index of the phase being played */
  index: number;
  /** 0 to 1 over the whole flight */
  p: number;
  day: number;
  ended: boolean;
  /** set when the mission was lost, to switch the frame to the alarm colour */
  lost: boolean;
  calm: boolean;
  /** NASA data in use for this flight: shown so it is visible, not decoration */
  live?: LiveItem[];
}

const pad = (n: number, w = 2) => String(Math.max(0, Math.floor(n))).padStart(w, "0");

/** One animated corner bracket of the frame. The wrapper holds the mirroring so the animation cannot undo it. */
function Corner({ at, color }: { at: "tl" | "tr" | "bl" | "br"; color: string }) {
  const flipX = at === "tr" || at === "br";
  const flipY = at === "bl" || at === "br";
  return (
    <div
      className="absolute"
      style={{
        [flipY ? "bottom" : "top"]: 10,
        [flipX ? "right" : "left"]: 10,
        transform: `scale(${flipX ? -1 : 1}, ${flipY ? -1 : 1})`,
        transformOrigin: "center",
      }}
    >
      <motion.svg
        viewBox="0 0 40 40" width="34" height="34" aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <path d="M2 16 L2 2 L16 2" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.9" />
        <path d="M22 2 L30 2" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.3" />
      </motion.svg>
    </div>
  );
}

/** Motion-graphics layer over the 3D flight: frame, phase callout, mission clock, progress ticks. */
export function FlightHud({ timeline, index, p, day, ended, lost, calm, live = [] }: Props) {
  const phase = timeline.phases[index];
  const color = lost ? "var(--over)" : "var(--violet-bright)";
  const total = timeline.phases.length;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {(["tl", "tr", "bl", "br"] as const).map((at) => <Corner key={at} at={at} color={color} />)}

      {/* sweep: one pass when the phase changes */}
      {!calm && !ended && (
        <motion.div
          key={`sweep-${phase.id}-${index}`}
          className="absolute inset-y-0 w-24"
          style={{ background: `linear-gradient(90deg, transparent, ${lost ? "rgba(251,113,133,0.10)" : "rgba(167,139,250,0.10)"}, transparent)` }}
          initial={{ left: "-10%", opacity: 0 }}
          animate={{ left: "110%", opacity: [0, 1, 0] }}
          transition={{ duration: 1.1, ease: "easeInOut" }}
        />
      )}

      {/* phase callout */}
      <div className="absolute left-3 top-8 sm:left-6 sm:top-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${phase.id}-${index}`}
            initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
            transition={{ duration: calm ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="num text-[10px] tracking-[0.3em]" style={{ color }}>
              PHASE {pad(index + 1)} / {pad(total)}
            </div>
            <div className="font-display mt-0.5 text-[13px] uppercase leading-none tracking-wide text-fg sm:text-2xl">
              {phase.label}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* mission clock */}
      <div className="absolute right-3 top-8 text-right sm:right-6 sm:top-12">
        <div className="num text-[10px] tracking-[0.3em] text-faint">MISSION CLOCK</div>
        <div className="num mt-0.5 text-[13px] leading-none text-fg sm:text-2xl">
          T+<motion.span key={Math.floor(day)} initial={{ opacity: 0.35 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>{pad(day, 3)}</motion.span>
          <span className="text-faint">d</span>
        </div>
      </div>

      {/* the NASA data this flight is actually running on */}
      {live.length > 0 && (
        <div className="pointer-events-none absolute bottom-14 left-3 flex flex-col items-start gap-1.5 sm:bottom-16 sm:left-6">
          {live.map((it) => {
            const body = (
              <>
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${it.snapshot ? "bg-faint" : "pulse-dot bg-cyan"}`} />
                <Icon name={it.icon} size={12} className="shrink-0 text-faint" />
                <span className="text-[10px] uppercase tracking-wider text-faint">{it.label}</span>
                <span className="num text-[11px] text-fg">{it.value}</span>
              </>
            );
            const cls = "flex items-center gap-1.5 rounded-full border border-line bg-[#070a18]/80 px-2.5 py-1 backdrop-blur-sm";
            return it.href ? (
              <a key={it.label} href={it.href} target="_blank" rel="noreferrer noopener" className={`pointer-events-auto ${cls} hover:border-cyan/50`} title={`Open the ${it.label} record`}>
                {body}
                <Icon name="external" size={10} className="shrink-0 text-faint" />
              </a>
            ) : (
              <div key={it.label} className={cls}>{body}</div>
            );
          })}
        </div>
      )}

      {/* progress ticks */}
      <div className="absolute inset-x-3 bottom-8 sm:inset-x-6 sm:bottom-9">
        <div className="flex items-end gap-[3px]">
          {Array.from({ length: 48 }, (_, i) => {
            const on = i / 47 <= p;
            return (
              <motion.span
                key={i}
                className="flex-1 rounded-full"
                style={{ background: on ? color : "rgba(255,255,255,0.14)" }}
                animate={{ height: on ? (i % 6 === 0 ? 10 : 5) : 3, opacity: on ? 1 : 0.5 }}
                transition={{ duration: calm ? 0 : 0.25 }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
