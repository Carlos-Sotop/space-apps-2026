import { useId } from "react";

/**
 * SpaceDAO mark drawn in code (no generated image): a network globe with a tilted ring.
 * Nodes sit where meridians cross parallels, like members of a council.
 */
export function LogoMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  const nodes: [number, number, number][] = [
    [50, 14, 3.2], [33, 24, 2.4], [67, 24, 2.4], [24, 42, 2.6], [50, 36, 3.6], [76, 42, 2.6],
    [36, 56, 2.8], [64, 56, 2.8], [50, 66, 2.4], [30, 72, 2], [70, 72, 2], [50, 86, 3],
  ];
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#60a5fa" />
          <stop offset="1" stopColor="#a78bfa" />
        </linearGradient>
        <radialGradient id={`n${id}`}>
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.45" stopColor="#c4b5fd" />
          <stop offset="1" stopColor="#8b5cf6" stopOpacity="0" />
        </radialGradient>
        <filter id={`f${id}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.6" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <g fill="none" stroke={`url(#g${id})`} strokeWidth="1.6" filter={`url(#f${id})`}>
        <circle cx="50" cy="50" r="36" />
        <ellipse cx="50" cy="50" rx="18" ry="36" />
        <ellipse cx="50" cy="50" rx="36" ry="13" />
        <path d="M17 36 Q50 26 83 36 M17 64 Q50 74 83 64" opacity="0.8" />
        <path d="M33 24 L50 36 L67 24 M24 42 L36 56 L50 66 L64 56 L76 42 M50 36 L36 56 M50 36 L64 56" opacity="0.55" strokeWidth="1.1" />
      </g>
      <path d="M8 62 C 4 50, 40 34, 78 30 C 98 28, 99 36, 88 42" fill="none" stroke={`url(#g${id})`} strokeWidth="3.2" strokeLinecap="round" opacity="0.9" />
      {nodes.map(([x, y, r]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={r * 1.9} fill={`url(#n${id})`} />
      ))}
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-display inline-flex items-baseline gap-[0.35em] tracking-[0.12em] ${className}`} aria-label="SpaceDAO">
      <span className="text-fg [text-shadow:0_0_18px_rgba(238,240,255,0.35)]">SPACE</span>
      <span className="bg-[linear-gradient(90deg,#a78bfa,#60a5fa)] bg-clip-text text-transparent [filter:drop-shadow(0_0_14px_rgba(139,92,246,0.55))]">DAO</span>
    </span>
  );
}
