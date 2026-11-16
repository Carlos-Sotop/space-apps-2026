import { motion, useReducedMotion } from "motion/react";
import { Icon, type IconName } from "@/components/ui";

type Kind = "agency" | "company" | "tech" | "mission";
const KINDS: Record<Kind, { label: string; icon: IconName; color: string }> = {
  agency: { label: "Agencies", icon: "globe", color: "#a78bfa" },
  company: { label: "Companies", icon: "build", color: "#22d3ee" },
  tech: { label: "Technologies", icon: "science", color: "#60a5fa" },
  mission: { label: "Missions", icon: "rocket", color: "#eef0ff" },
};
const ORDER: Kind[] = ["agency", "company", "tech", "mission"];
const CX = 400, CY = 250;

const NODES = Array.from({ length: 16 }, (_, i) => {
  const ring = i < 6 ? 0 : 1;
  const a = ((i < 6 ? i : i - 6) / (ring ? 10 : 6)) * Math.PI * 2 + (ring ? 0.3 : 0);
  const rx = ring ? 345 : 205, ry = ring ? 200 : 118;
  return { x: CX + Math.cos(a) * rx, y: CY + Math.sin(a) * ry, kind: ORDER[i % 4], i };
});
const EXTRA = [[0, 7], [1, 9], [2, 11], [3, 13], [4, 15], [5, 6], [0, 2], [3, 5], [8, 12], [10, 14]];
const LINKS = [
  ...NODES.map((n) => ({ from: [n.x, n.y], to: [CX, CY], kind: n.kind })),
  ...EXTRA.map(([a, b]) => ({ from: [NODES[a].x, NODES[a].y], to: [NODES[b].x, NODES[b].y], kind: NODES[a].kind })),
].map((l, i) => {
  const mx = (l.from[0] + l.to[0]) / 2, my = (l.from[1] + l.to[1]) / 2;
  const dx = l.to[0] - l.from[0], dy = l.to[1] - l.from[1];
  return { ...l, i, d: `M${l.from[0]} ${l.from[1]}Q${mx - dy * 0.12} ${my + dx * 0.12} ${l.to[0]} ${l.to[1]}` };
});

export function NetworkVisual() {
  const reduce = useReducedMotion();
  return (
    <figure className="m-0">
      <svg viewBox="0 0 800 500" className="h-auto w-full" role="img" aria-label="A web of agencies, companies, technologies and missions linked around a globe.">
        <defs>
          <radialGradient id="nv-core" cx="35%" cy="30%" r="80%">
            <stop offset="0" stopColor="#4b50b8" /><stop offset="1" stopColor="#0c0e2a" />
          </radialGradient>
          <radialGradient id="nv-halo"><stop offset="0.4" stopColor="#8b5cf6" stopOpacity="0.55" /><stop offset="1" stopColor="#8b5cf6" stopOpacity="0" /></radialGradient>
          <filter id="nv-glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        <circle cx={CX} cy={CY} r="130" fill="url(#nv-halo)" />
        <g fill="none" strokeWidth="1.2">
          {LINKS.map((l) => (
            <motion.path
              key={l.i} id={`nv-l${l.i}`} d={l.d} stroke={KINDS[l.kind].color} strokeOpacity="0.5"
              initial={reduce ? false : { pathLength: 0, opacity: 0 }}
              whileInView={{ pathLength: 1, opacity: 1 }} viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 1.4, delay: 0.3 + l.i * 0.07, ease: "easeOut" }}
            />
          ))}
        </g>
        {!reduce && LINKS.map((l) => (
          <circle key={`p${l.i}`} r="3.2" fill={KINDS[l.kind].color} filter="url(#nv-glow)">
            <animateMotion dur={`${4 + (l.i % 5) * 0.8}s`} begin={`${2 + (l.i % 7) * 0.6}s`} repeatCount="indefinite" keyPoints={l.i % 2 ? "0;1" : "1;0"} keyTimes="0;1" calcMode="linear">
              <mpath href={`#nv-l${l.i}`} />
            </animateMotion>
          </circle>
        ))}
        <g>
          <circle cx={CX} cy={CY} r="62" fill="url(#nv-core)" stroke="#a78bfa" strokeOpacity="0.6" />
          <g fill="none" stroke="#67e8f9" strokeOpacity="0.35">
            <ellipse cx={CX} cy={CY} rx="62" ry="22" /><ellipse cx={CX} cy={CY} rx="24" ry="62" /><path d={`M${CX - 62} ${CY}H${CX + 62}`} />
          </g>
        </g>
        {NODES.map((n) => (
          <motion.g
            key={n.i}
            initial={reduce ? false : { opacity: 0, scale: 0 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: 0.1 + n.i * 0.06 }} style={{ transformOrigin: `${n.x}px ${n.y}px` }}
          >
            <circle cx={n.x} cy={n.y} r="12" fill={KINDS[n.kind].color} opacity="0.18" />
            <circle cx={n.x} cy={n.y} r="5.5" fill={KINDS[n.kind].color} filter="url(#nv-glow)" />
          </motion.g>
        ))}
      </svg>
      <figcaption className="mt-4 flex flex-wrap justify-center gap-x-8 gap-y-3">
        {ORDER.map((k) => (
          <span key={k} className="inline-flex items-center gap-2 text-sm text-muted">
            <span style={{ color: KINDS[k].color }}><Icon name={KINDS[k].icon} size={16} /></span>
            {KINDS[k].label}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
