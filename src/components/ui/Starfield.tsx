import { useEffect, useRef } from "react";

interface Star { x: number; y: number; z: number; r: number; tw: number }

/** ~150 stars with slow parallax drift. Static when the user prefers reduced motion. */
export function Starfield({ count = 150 }: { count?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0, h = 0, raf = 0;
    const stars: Star[] = Array.from({ length: count }, () => ({ x: Math.random(), y: Math.random(), z: 0.2 + Math.random() * 0.8, r: 0.4 + Math.random() * 1.2, tw: Math.random() * Math.PI * 2 }));

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        const drift = reduced ? 0 : (t * 0.000004 * s.z) % 1;
        const x = ((s.x + drift) % 1) * w;
        const tw = reduced ? 1 : 0.65 + 0.35 * Math.sin(t * 0.0012 + s.tw);
        ctx.globalAlpha = (0.25 + 0.6 * s.z) * tw;
        ctx.fillStyle = s.z > 0.8 ? "#c7d2fe" : "#ffffff";
        ctx.beginPath();
        ctx.arc(x, s.y * h, s.r * s.z, 0, Math.PI * 2);
        ctx.fill();
      }
      if (!reduced) raf = requestAnimationFrame(draw);
    };

    resize();
    draw(0);
    const onResize = () => { resize(); if (reduced) draw(0); };
    window.addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); };
  }, [count]);

  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none fixed inset-0 z-0" />;
}
