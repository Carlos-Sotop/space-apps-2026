import type { Timeline } from "./flightTimeline";
import { phaseAt } from "./flightTimeline";
import type { FlightPhaseId } from "@/engine/types";

type Pt = { x: number; y: number };

const bez = (a: Pt, b: Pt, c: Pt, d: Pt, t: number): Pt => {
  const u = 1 - t;
  return { x: u * u * u * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t * t * t * d.x, y: u * u * u * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t * t * t * d.y };
};

export interface FlightSceneProps {
  timeline: Timeline;
  p: number;
  lunar: boolean;
  lostAt?: FlightPhaseId;
  ended: boolean;
}

const ASCENT_FRACTION_PHASES: FlightPhaseId[] = ["launch", "ascent", "orbit-insertion", "transfer", "arrival"];

/** Earth and Moon arc (or an Earth orbit), the spacecraft dot along it and a launch plume. */
export function FlightSceneSvg({ timeline, p, lunar, lostAt, ended }: FlightSceneProps) {
  const { index, frac } = phaseAt(timeline, p);
  const phaseId = timeline.phases[index].id;
  const opsIndex = timeline.phases.findIndex((ph) => ph.id === "operations");
  const preOps = opsIndex < 0 ? timeline.phases.length : opsIndex;
  const inOps = opsIndex >= 0 && index >= opsIndex;

  const route = lunar
    ? [{ x: 175, y: 205 }, { x: 290, y: 20 }, { x: 540, y: 10 }, { x: 640, y: 118 }] as const
    : [{ x: 400, y: 128 }, { x: 470, y: 60 }, { x: 600, y: 90 }, { x: 590, y: 215 }] as const;
  const f = inOps ? 1 : Math.min(1, (index + frac) / Math.max(1, preOps));
  const point = (t: number) => bez(route[0], route[1], route[2], route[3], Math.min(1, Math.max(0, t)));
  const orbit = (a: number): Pt => { const r = (-12 * Math.PI) / 180, ex = 190 * Math.cos(a), ey = 62 * Math.sin(a); return { x: 400 + ex * Math.cos(r) - ey * Math.sin(r), y: 215 + ex * Math.sin(r) + ey * Math.cos(r) }; };

  let pos = point(f);
  if (inOps && !lunar) pos = orbit(((p - timeline.starts[opsIndex]) / (1 - timeline.starts[opsIndex] || 1)) * Math.PI * 10 - 0.2);
  if (inOps && lunar) pos = { x: 646, y: 112 };

  const trail = Array.from({ length: 24 }, (_, i) => point((f * i) / 23));
  const launching = ASCENT_FRACTION_PHASES.slice(0, 2).includes(phaseId) && !ended;
  const plume = Array.from({ length: 12 }, (_, k) => point(f - 0.012 * (k + 1)));
  const lost = ended && !!lostAt;

  return (
    <svg viewBox="0 0 800 400" className="h-full w-full" role="img" aria-label="Flight path from Earth">
      <defs>
        <radialGradient id="earthG" cx="0.5" cy="0.4" r="0.7"><stop offset="0" stopColor="#1e4fa0" /><stop offset="1" stopColor="#081330" /></radialGradient>
        <radialGradient id="moonG" cx="0.4" cy="0.35" r="0.8"><stop offset="0" stopColor="#d6dbe8" /><stop offset="1" stopColor="#6b7390" /></radialGradient>
        <radialGradient id="atmo" cx="0.5" cy="0.5" r="0.5"><stop offset="0.9" stopColor="#60a5fa" stopOpacity="0.35" /><stop offset="1" stopColor="#60a5fa" stopOpacity="0" /></radialGradient>
      </defs>
      {lunar ? (
        <>
          <circle cx="110" cy="330" r="190" fill="url(#atmo)" /><circle cx="110" cy="330" r="165" fill="url(#earthG)" />
          <circle cx="690" cy="110" r="54" fill="url(#moonG)" /><circle cx="670" cy="96" r="9" fill="#5b6280" opacity="0.5" /><circle cx="705" cy="130" r="6" fill="#5b6280" opacity="0.5" />
          <path d={`M${route[0].x} ${route[0].y} C${route[1].x} ${route[1].y} ${route[2].x} ${route[2].y} ${route[3].x} ${route[3].y}`} fill="none" stroke="#8b5cf6" strokeOpacity="0.35" strokeWidth="1.5" strokeDasharray="4 6" />
        </>
      ) : (
        <>
          <circle cx="400" cy="215" r="118" fill="url(#atmo)" /><circle cx="400" cy="215" r="88" fill="url(#earthG)" />
          <ellipse cx="400" cy="215" rx="190" ry="62" transform="rotate(-12 400 215)" fill="none" stroke="#8b5cf6" strokeOpacity="0.4" strokeWidth="1.5" strokeDasharray="4 6" />
          <path d={`M${route[0].x} ${route[0].y} C${route[1].x} ${route[1].y} ${route[2].x} ${route[2].y} ${route[3].x} ${route[3].y}`} fill="none" stroke="#8b5cf6" strokeOpacity="0.35" strokeWidth="1.5" strokeDasharray="4 6" />
        </>
      )}
      {!inOps && <polyline points={trail.map((t) => `${t.x},${t.y}`).join(" ")} fill="none" stroke="#a78bfa" strokeWidth="2" strokeOpacity="0.8" />}
      {launching && plume.map((t, k) => <circle key={k} cx={t.x} cy={t.y + 3} r={7 - k * 0.45} fill={k < 4 ? "#fbbf24" : "#fb7185"} opacity={0.75 - k * 0.055} />)}
      {inOps && !lost && <circle cx={pos.x} cy={pos.y} r="14" fill="none" stroke="#22d3ee" strokeOpacity="0.5" className="pulse-dot" />}
      {lost ? (
        <g transform={`translate(${pos.x} ${pos.y})`}><circle r="22" fill="#fb7185" opacity="0.25" /><circle r="10" fill="#fb7185" /><path d="M-6-6 6 6M6-6-6 6" stroke="#fff" strokeWidth="2" /></g>
      ) : (
        <circle cx={pos.x} cy={pos.y} r="6" fill="#fff" style={{ filter: "drop-shadow(0 0 8px #a78bfa)" }} />
      )}
    </svg>
  );
}
