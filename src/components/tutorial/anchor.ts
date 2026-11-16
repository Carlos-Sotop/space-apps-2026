import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

export interface Box { left: number; top: number; width: number; height: number }
export interface Viewport { w: number; h: number }

export type Side = "bottom" | "top" | "right" | "left" | "docked";

/** Gap between the target and the bubble, and the room the arrow needs. */
export const GAP = 14;
/** Docked bubbles sit above the sticky ActionBar so they never cover Continue / Next. */
export const DOCK = 92;
/** Below this width the bubble always docks at the bottom of the screen. */
export const NARROW = 640;

export const boxOf = (el: Element | null): Box | null => {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return { left: r.left, top: r.top, width: r.width, height: r.height };
};

export const findAnchor = (anchor: string | undefined): Element | null =>
  anchor ? document.querySelector(`[data-coach="${anchor}"]`) : null;

const same = (a: Box | null, b: Box | null) =>
  a === b || (!!a && !!b && a.left === b.left && a.top === b.top && a.width === b.width && a.height === b.height);

/** The live rect of the element marked data-coach="<anchor>", and the viewport, both kept up to date. */
export function useAnchorBox(anchor: string | undefined, active: boolean): { box: Box | null; vp: Viewport } {
  const [box, setBox] = useState<Box | null>(null);
  const [vp, setVp] = useState<Viewport>(() => ({ w: window.innerWidth, h: window.innerHeight }));

  const update = useCallback(() => {
    setVp((v) => (v.w === window.innerWidth && v.h === window.innerHeight ? v : { w: window.innerWidth, h: window.innerHeight }));
    setBox((b) => { const n = boxOf(findAnchor(anchor)); return same(b, n) ? b : n; });
  }, [anchor]);

  useLayoutEffect(() => { update(); }, [update, active]);

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(update, 250);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => { window.clearInterval(id); window.removeEventListener("resize", update); window.removeEventListener("scroll", update, true); };
  }, [active, update]);

  return { box, vp };
}

/** Attempts per tip: the page keeps growing while 3D and live data land, so one scroll can miss. */
const SCROLL_TRIES = 3;

/**
 * Keep the anchor on screen: scroll to it when it is out of view, give up after a few tries so a
 * target that cannot be reached never fights the player's own scrolling.
 */
export function useScrollToAnchor(anchor: string | undefined, key: string, active: boolean, box: Box | null, vp: Viewport) {
  const tries = useRef({ key: "", n: 0 });
  useEffect(() => {
    if (!active || !anchor || !box) return;
    if (tries.current.key !== key) tries.current = { key, n: 0 };
    if (tries.current.n >= SCROLL_TRIES) return;
    if (box.height > vp.h * 0.7) return;
    if (box.top >= 0 && box.top + box.height <= vp.h) return;
    const el = findAnchor(anchor);
    if (!el) return;
    tries.current.n += 1;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
  }, [anchor, key, active, box, vp.h]);
}

export interface Placement {
  side: Side;
  style: { left?: number; right?: number; top?: number; bottom?: number; width: number };
  /** where the arrow sits along the bubble edge, in px from its left or top */
  arrow: number | null;
}

/**
 * Put the bubble against the target: below it when there is room, else above, else beside it.
 * On a phone, or when the target fills the screen, it docks at the bottom with the arrow pointing up.
 */
export function place(box: Box | null, vp: Viewport, size: { w: number; h: number }): Placement {
  const width = Math.min(size.w, vp.w - 24);
  const tall = !!box && box.height > vp.h * 0.7;
  const narrow = vp.w < NARROW;
  const docked: Placement = { side: "docked", style: narrow ? { left: 12, bottom: DOCK, width } : { right: 12, bottom: DOCK, width }, arrow: null };
  if (!box || tall || narrow) {
    // on a phone the bubble stays docked, but the arrow still points up at the target
    if (narrow && box) return { ...docked, arrow: clamp(box.left + box.width / 2 - 12, 18, width - 18) };
    return docked;
  }
  const clampLeft = (x: number) => clamp(x, 12, Math.max(12, vp.w - width - 12));
  const clampTop = (y: number) => clamp(y, 12, Math.max(12, vp.h - size.h - 12));
  const below = vp.h - (box.top + box.height);
  if (below > size.h + GAP) {
    const left = clampLeft(box.left + box.width / 2 - width / 2);
    return { side: "bottom", style: { left, top: box.top + box.height + GAP, width }, arrow: clamp(box.left + box.width / 2 - left, 18, width - 18) };
  }
  if (box.top > size.h + GAP) {
    const left = clampLeft(box.left + box.width / 2 - width / 2);
    return { side: "top", style: { left, top: box.top - size.h - GAP, width }, arrow: clamp(box.left + box.width / 2 - left, 18, width - 18) };
  }
  const right = vp.w - (box.left + box.width);
  if (right > width + GAP) {
    const top = clampTop(box.top + box.height / 2 - size.h / 2);
    return { side: "right", style: { left: box.left + box.width + GAP, top, width }, arrow: clamp(box.top + box.height / 2 - top, 18, Math.max(18, size.h - 18)) };
  }
  if (box.left > width + GAP) {
    const top = clampTop(box.top + box.height / 2 - size.h / 2);
    return { side: "left", style: { left: box.left - width - GAP, top, width }, arrow: clamp(box.top + box.height / 2 - top, 18, Math.max(18, size.h - 18)) };
  }
  return docked;
}

export const clamp = (x: number, lo: number, hi: number) => Math.min(Math.max(x, lo), hi);
