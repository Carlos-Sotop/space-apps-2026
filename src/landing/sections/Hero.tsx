import { motion, useReducedMotion } from "motion/react";
import { Icon } from "@/components/ui";
import { hero, videos } from "../content";
import { GhostLink, PlayButton, useVideoAvailable } from "../lib";

function Globe({ animate }: { animate: boolean }) {
  const orbits = [
    { rx: 330, ry: 96, rot: -18, dur: 26, color: "#22d3ee" },
    { rx: 380, ry: 130, rot: 24, dur: 34, color: "#a78bfa" },
    { rx: 300, ry: 70, rot: 62, dur: 22, color: "#60a5fa" },
  ];
  return (
    <svg viewBox="-420 -420 840 840" className="h-full w-full" aria-hidden="true">
      <defs>
        <radialGradient id="hg-body" cx="35%" cy="30%" r="80%">
          <stop offset="0" stopColor="#3b3f8f" /><stop offset="0.55" stopColor="#14163f" /><stop offset="1" stopColor="#05060f" />
        </radialGradient>
        <radialGradient id="hg-halo" cx="50%" cy="50%" r="50%">
          <stop offset="0.55" stopColor="#8b5cf6" stopOpacity="0.5" /><stop offset="1" stopColor="#8b5cf6" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle r="360" fill="url(#hg-halo)" />
      <circle r="200" fill="url(#hg-body)" stroke="#a78bfa" strokeOpacity="0.5" />
      <g fill="none" stroke="#67e8f9" strokeOpacity="0.28">
        <ellipse rx="200" ry="70" /><ellipse rx="200" ry="140" />
        <ellipse rx="70" ry="200" /><ellipse rx="140" ry="200" /><path d="M0-200V200M-200 0H200" />
      </g>
      {orbits.map((o, i) => (
        <g key={i} transform={`rotate(${o.rot})`}>
          <ellipse rx={o.rx} ry={o.ry} fill="none" stroke={o.color} strokeOpacity="0.45" strokeDasharray="2 10" strokeLinecap="round" />
          <circle r="7" fill={o.color} style={{ filter: `drop-shadow(0 0 10px ${o.color})` }}>
            {animate && <animateMotion dur={`${o.dur}s`} repeatCount="indefinite" path={`M${o.rx} 0A${o.rx} ${o.ry} 0 1 1 ${-o.rx} 0A${o.rx} ${o.ry} 0 1 1 ${o.rx} 0`} />}
          </circle>
        </g>
      ))}
    </svg>
  );
}

export function Hero() {
  const reduce = useReducedMotion();
  const hasTeaser = useVideoAvailable(videos.teaser.src);
  const fade = (d: number) => ({ initial: reduce ? false : { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.9, delay: d, ease: [0.22, 0.61, 0.36, 1] as const } });
  return (
    <section id="top" className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden px-4 pb-16 pt-28 sm:px-6" aria-labelledby="hero-h">
      <motion.div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-70" initial={reduce ? false : { opacity: 0, scale: 0.92 }} animate={{ opacity: 0.7, scale: 1 }} transition={{ duration: 1.6 }}>
        <div className="aspect-square w-[min(150vw,1100px)]"><Globe animate={!reduce} /></div>
      </motion.div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(4,5,13,0.75)_0%,rgba(4,5,13,0.15)_70%)]" />
      <div className="relative mx-auto w-full min-w-0 max-w-4xl text-center">
        <motion.p {...fade(0.1)} className="num mx-auto mb-6 max-w-xl text-[11px] uppercase leading-relaxed tracking-[0.2em] text-cyan-bright sm:text-xs">{hero.eyebrow}</motion.p>
        <motion.h1 {...fade(0.25)} className="font-display text-[9.5vw] leading-none text-fg [text-shadow:0_0_40px_rgba(139,92,246,0.6)] sm:text-7xl md:text-8xl">
          Space<span className="text-gradient">DAO</span>
        </motion.h1>
        <motion.p {...fade(0.45)} className="mx-auto mt-8 max-w-2xl text-2xl font-medium leading-snug text-fg sm:text-3xl">{hero.tagline}</motion.p>
        <motion.p {...fade(0.6)} className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">{hero.sub}</motion.p>
        <motion.div {...fade(0.75)} className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <PlayButton>{hero.play}</PlayButton>
          {hasTeaser && <GhostLink href="#teaser"><Icon name="sparkle" size={16} />{hero.watch}</GhostLink>}
        </motion.div>
      </div>
      <a href="#problem" aria-label="Scroll to the problem" className="absolute bottom-6 left-1/2 -translate-x-1/2 text-muted transition hover:text-fg">
        <Icon name="arrow" size={22} style={{ transform: "rotate(90deg)" }} />
      </a>
    </section>
  );
}
