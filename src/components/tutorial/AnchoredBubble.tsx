import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { useGame } from "@/store/game";
import { Rocky, type RockyPose } from "./Rocky";
import { place, useAnchorBox, useScrollToAnchor, type Box, type Side, type Viewport } from "./anchor";

/** Everything outside the target goes dark, so the one thing that matters stays lit. */
function Spotlight({ box, vp }: { box: Box; vp: Viewport }) {
  const pad = 6;
  const l = Math.max(box.left - pad, 0);
  const t = Math.max(box.top - pad, 0);
  const r = Math.min(box.left + box.width + pad, vp.w);
  const b = Math.min(box.top + box.height + pad, vp.h);
  const shade = "pointer-events-none fixed z-30 bg-[#05060f]/62";
  return (
    <div aria-hidden="true">
      <div className={shade} style={{ left: 0, top: 0, width: vp.w, height: t }} />
      <div className={shade} style={{ left: 0, top: b, width: vp.w, height: Math.max(0, vp.h - b) }} />
      <div className={shade} style={{ left: 0, top: t, width: l, height: Math.max(0, b - t) }} />
      <div className={shade} style={{ left: r, top: t, width: Math.max(0, vp.w - r), height: Math.max(0, b - t) }} />
      <motion.div
        className="pointer-events-none fixed z-40 rounded-2xl shadow-select"
        style={{ left: l, top: t, width: Math.max(0, r - l), height: Math.max(0, b - t), border: "2px solid var(--select-ring)" }}
        initial={false}
        animate={{ opacity: [0.75, 1, 0.75] }}
        transition={{ duration: 1.8, repeat: Infinity }}
      />
    </div>
  );
}

/** The little triangle that ties the bubble to the thing it talks about. */
function Arrow({ side, at }: { side: Side; at: number }) {
  const common = "pointer-events-none absolute h-3 w-3 rotate-45 border-line bg-glass-strong";
  if (side === "bottom" || side === "docked") return <span aria-hidden="true" className={`${common} border-l border-t`} style={{ left: at - 6, top: -6.5 }} />;
  if (side === "top") return <span aria-hidden="true" className={`${common} border-b border-r`} style={{ left: at - 6, bottom: -6.5 }} />;
  if (side === "right") return <span aria-hidden="true" className={`${common} border-b border-l`} style={{ top: at - 6, left: -6.5 }} />;
  return <span aria-hidden="true" className={`${common} border-r border-t`} style={{ top: at - 6, right: -6.5 }} />;
}

interface Props {
  /** data-coach value of the element to point at */
  anchor?: string;
  pose: RockyPose;
  /** changes when the message changes: re-runs the scroll and the entrance */
  tipKey: string;
  /** dim everything but the target */
  spotlight?: boolean;
  maxWidth?: number;
  children: ReactNode;
}

/**
 * Rocky and a speech bubble stuck to the element marked data-coach="<anchor>": under it when it
 * fits, over it when it does not, beside it otherwise, and docked at the bottom on a phone, where
 * the arrow still points up at the target. The target is scrolled into view and stays lit.
 */
export function AnchoredBubble({ anchor, pose, tipKey, spotlight, maxWidth = 380, children }: Props) {
  // the Rocky the player picked at "Who's flying today?" guides the whole run
  const variant = useGame((s) => s.level);
  const { box, vp } = useAnchorBox(anchor, true);
  useScrollToAnchor(anchor, tipKey, true, box, vp);
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: maxWidth, h: 150 });

  // the bubble is placed from its real height, so "does it fit below?" is not a guess
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => setSize((s) => {
      const h = Math.round(el.getBoundingClientRect().height);
      return Math.abs(h - s.h) < 2 ? s : { w: maxWidth, h };
    });
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [maxWidth, tipKey, children]);

  const { side, style, arrow } = place(box, vp, size);
  const narrow = vp.w < 640;
  // a target that fills the screen is not worth lighting: dimming the thin frame around it only adds noise
  const huge = !!box && (box.height > vp.h * 0.7 || (box.width > vp.w * 0.92 && box.height > vp.h * 0.5));
  const pointLeft = !!box && side !== "docked" && box.left + box.width / 2 < (style.left ?? 0) + style.width / 2 - 40;

  return (
    <>
      {spotlight && box && !huge && <Spotlight box={box} vp={vp} />}
      <motion.div
        key={tipKey}
        role="status" aria-live="polite"
        className="fixed z-50 flex items-end gap-1"
        style={style}
        initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.22 }}
      >
        <Rocky pose={pose} variant={variant} size={narrow ? 56 : 72} flip={pointLeft} className="-mb-1 shrink-0" />
        <div ref={ref} className="glass-strong relative min-w-0 flex-1 rounded-[var(--radius-card)] p-3.5">
          {arrow !== null && <Arrow side={side} at={arrow} />}
          {children}
        </div>
      </motion.div>
    </>
  );
}
