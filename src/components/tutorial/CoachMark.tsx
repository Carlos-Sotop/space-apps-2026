import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui";
import { useGame } from "@/store/game";
import { Rocky } from "./Rocky";
import { useCoachProgress } from "./state";
import { TIPS, tipContext } from "./tips";

interface Box { left: number; top: number; width: number; height: number }

const GAP = 14;
const BUBBLE_H = 190;

function measure(anchor: string | undefined): Box | null {
  if (!anchor) return null;
  const el = document.querySelector(`[data-coach="${anchor}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return { left: r.left, top: r.top, width: r.width, height: r.height };
}

const same = (a: Box | null, b: Box | null) => (a === b) || (!!a && !!b && a.left === b.left && a.top === b.top && a.width === b.width && a.height === b.height);

/** Rocky and a speech bubble that point at the element marked data-coach="<anchor>". */
export function CoachMark() {
  const screen = useGame((s) => s.screen);
  const step = useGame((s) => s.step);
  const enabled = useGame((s) => s.tutorial);
  const onboarding = useGame((s) => s.onboarding);
  const at = useCoachProgress((s) => s.at);
  const setAt = useCoachProgress((s) => s.set);

  const ctx = tipContext(screen, step);
  const tips = TIPS[ctx] ?? [];
  const index = at[ctx] ?? 0;
  const tip = enabled && !onboarding ? tips[index] : undefined;

  const [box, setBox] = useState<Box | null>(null);
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight });
  const scrolledFor = useRef("");

  const update = useCallback(() => {
    setVp((v) => (v.w === window.innerWidth && v.h === window.innerHeight ? v : { w: window.innerWidth, h: window.innerHeight }));
    setBox((b) => { const n = measure(tip?.anchor); return same(b, n) ? b : n; });
  }, [tip?.anchor]);

  useLayoutEffect(() => { update(); }, [update, ctx, index]);

  useEffect(() => {
    if (!tip) return;
    const id = window.setInterval(update, 300);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => { window.clearInterval(id); window.removeEventListener("resize", update); window.removeEventListener("scroll", update, true); };
  }, [tip, update]);

  useEffect(() => {
    if (!tip?.anchor || !box) return;
    const key = `${ctx}:${index}`;
    if (scrolledFor.current === key) return;
    scrolledFor.current = key;
    const el = document.querySelector(`[data-coach="${tip.anchor}"]`);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el?.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
  }, [tip, box, ctx, index]);

  if (!tip) return null;

  const last = index >= tips.length - 1;
  const next = () => setAt(ctx, index + 1);
  const skip = () => setAt(ctx, tips.length);

  const narrow = vp.w < 640;
  const width = Math.min(400, vp.w - 24);
  const tall = box ? box.height > vp.h * 0.6 : false;
  const docked = !box || narrow || tall;

  let pos: { left?: number; right?: number; top?: number; bottom?: number } = { right: 12, bottom: 12 };
  if (narrow) pos = { left: 12, bottom: 12 };
  else if (box && !tall) {
    const left = Math.min(Math.max(box.left, 12), vp.w - width - 12);
    if (vp.h - (box.top + box.height) > BUBBLE_H + GAP) pos = { left, top: Math.max(box.top, 0) + box.height + GAP };
    else if (box.top > BUBBLE_H + GAP) pos = { left, top: box.top - BUBBLE_H - GAP };
    else pos = { right: 12, bottom: 12 };
  }

  const ring = box && {
    left: Math.max(box.left - 6, 6),
    top: Math.max(box.top - 6, 6),
    width: Math.min(box.left + box.width + 6, vp.w - 6) - Math.max(box.left - 6, 6),
    height: Math.min(box.top + box.height + 6, vp.h - 6) - Math.max(box.top - 6, 6),
  };
  const boxCenter = box ? box.left + box.width / 2 : 0;
  const bubbleCenter = (pos.left ?? vp.w - (pos.right ?? 0) - width) + width / 2;
  const flip = !!box && !docked && tip.pose === "point" && boxCenter < bubbleCenter - 40;

  return (
    <>
      {ring && ring.width > 0 && ring.height > 0 && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none fixed z-40 rounded-2xl shadow-select"
          style={{ border: "2px solid var(--select-ring)" }}
          initial={false}
          animate={{ left: ring.left, top: ring.top, width: ring.width, height: ring.height, opacity: [0.7, 1, 0.7] }}
          transition={{ left: { duration: 0.25 }, top: { duration: 0.25 }, width: { duration: 0.25 }, height: { duration: 0.25 }, opacity: { duration: 1.8, repeat: Infinity } }}
        />
      )}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${ctx}:${index}`}
          role="status" aria-live="polite"
          className="fixed z-40 flex items-end gap-1"
          style={{ ...pos, width }}
          initial={{ opacity: 0, y: 10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.22 }}
        >
          <Rocky pose={tip.pose} size={narrow ? 56 : 76} flip={flip} className="-mb-1" />
          <div className="glass-strong min-w-0 flex-1 rounded-[var(--radius-card)] p-3.5">
            <p className="m-0 text-[15px] leading-snug text-fg">{tip.text}</p>
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="num text-xs text-muted">{index + 1} / {tips.length}</span>
              <div className="flex gap-2">
                <Button size="sm" onClick={skip}>Skip</Button>
                <Button size="sm" variant="primary" onClick={next}>{last ? "Got it" : "Next"}</Button>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
}
