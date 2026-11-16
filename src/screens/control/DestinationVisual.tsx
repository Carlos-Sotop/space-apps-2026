import type { Destination } from "@/engine/types";

/** Orbit radius (px in a 320x160 box, Earth radius 34) and tilt per orbit class. Schematic, not to scale. */
const RING: Record<string, { rx: number; ry: number; tilt: number }> = {
  ISS: { rx: 50, ry: 18, tilt: -18 },
  LEO: { rx: 54, ry: 22, tilt: -8 },
  SSO: { rx: 48, ry: 46, tilt: 0 },
  GTO: { rx: 130, ry: 52, tilt: -12 },
};

const Earth = ({ cx, cy, r }: { cx: number; cy: number; r: number }) => (
  <g>
    <circle cx={cx} cy={cy} r={r + 5} fill="var(--blue)" opacity="0.15" />
    <circle cx={cx} cy={cy} r={r} fill="#1d3a8a" stroke="var(--blue-bright)" strokeWidth="1.5" />
    <path d={`M${cx - r * 0.6} ${cy - r * 0.3}q${r * 0.4} ${-r * 0.4} ${r * 0.8} ${-r * 0.1}t${r * 0.4} ${r * 0.6}q${-r * 0.5} ${r * 0.2} ${-r * 0.9} ${r * 0.1}z`} fill="var(--ok)" opacity="0.55" />
  </g>
);

/** Code-drawn picture of where the mission goes: an orbit around Earth, or the Earth-Moon trip to a landing site. */
export function DestinationVisual({ dest }: { dest: Destination }) {
  const moon = dest.orbitClass === "TLI";
  const site = dest.lat !== undefined && dest.lon !== undefined ? `${Math.abs(dest.lat).toFixed(1)}° ${dest.lat < 0 ? "S" : "N"}` : null;
  return (
    <figure data-coach="launch.destination-visual" className="glass m-0 flex flex-col items-center gap-2 p-4">
      <svg viewBox="0 0 320 160" role="img" aria-label={`${dest.name}, ${moon ? "Moon landing" : `${dest.orbitClass} orbit`}`} className="h-auto w-full max-w-md">
        {moon ? (
          <g>
            <Earth cx={52} cy={80} r={30} />
            <path d="M84 70C140 20 200 20 250 62" fill="none" stroke="var(--cyan)" strokeWidth="2" strokeDasharray="5 5" />
            <circle cx={150} cy={32} r={4} fill="var(--cyan)" />
            <circle cx={270} cy={80} r={22} fill="#8b93c9" stroke="var(--fg-muted)" strokeWidth="1.5" />
            <circle cx={262} cy={72} r={4} fill="#6b7299" />
            <circle cx={277} cy={90} r={3} fill="#6b7299" />
            <circle cx={262} cy={98} r={5} fill="var(--cyan)" stroke="#04050d" strokeWidth="1.5" />
            <path d="M262 98v-14m-4 4 4-4 4 4" stroke="var(--cyan)" strokeWidth="1.5" fill="none" />
          </g>
        ) : (
          <g>
            <ellipse cx={160} cy={80} rx={RING[dest.orbitClass].rx} ry={RING[dest.orbitClass].ry} transform={`rotate(${RING[dest.orbitClass].tilt} 160 80)`} fill="none" stroke="var(--cyan)" strokeWidth="2" strokeDasharray="6 4" />
            <Earth cx={160} cy={80} r={34} />
            <g transform={`rotate(${RING[dest.orbitClass].tilt} 160 80)`}>
              <circle cx={160 + RING[dest.orbitClass].rx} cy={80} r={5} fill="var(--cyan)" stroke="#04050d" strokeWidth="1.5" />
            </g>
          </g>
        )}
      </svg>
      <figcaption className="text-center text-sm text-muted">
        <span className="text-fg">{dest.name}</span>
        <span className="num"> · {dest.orbitClass}{site ? ` · ${site}` : ""}</span>
      </figcaption>
    </figure>
  );
}
