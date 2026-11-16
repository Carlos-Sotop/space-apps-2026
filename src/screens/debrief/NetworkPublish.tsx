import { Suspense, lazy, useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Button, Icon } from "@/components/ui";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { ChainReceipt } from "@/chain";
import type { MissionDesign, Ratification } from "@/engine/types";
import { hasWebgl } from "@/three/webgl";

/** three.js loads only when there is a context to draw into. */
const NetworkPulse = lazy(() => import("@/three/NetworkPulse"));

/** Fixed layout of the existing network in a 200x120 box: agencies, companies, open technologies. */
const NODES: { x: number; y: number; kind: "agency" | "company" | "tech" }[] = [
  { x: 28, y: 24, kind: "agency" }, { x: 70, y: 14, kind: "tech" }, { x: 132, y: 16, kind: "company" }, { x: 176, y: 30, kind: "agency" },
  { x: 16, y: 70, kind: "tech" }, { x: 52, y: 100, kind: "company" }, { x: 112, y: 106, kind: "agency" }, { x: 168, y: 92, kind: "tech" },
  { x: 38, y: 58, kind: "company" }, { x: 150, y: 60, kind: "company" },
];
const LINKS: [number, number][] = [[0, 1], [1, 2], [2, 3], [0, 8], [8, 4], [8, 5], [5, 6], [6, 7], [7, 3], [9, 2], [9, 3], [9, 7], [9, 6], [1, 8]];
const YOU = { x: 100, y: 60 };
const JOIN: number[] = [8, 1, 2, 9, 6];
const COLOR = { agency: "var(--violet-bright)", company: "var(--blue-bright)", tech: "var(--ok)" } as const;

interface Props {
  design: MissionDesign;
  ratification: Ratification | null;
  published: boolean;
  count: number;
  onPublish: () => void;
}

/** Publish card: your design is a node that joins the open network with a pulse. */
export function NetworkPublish({ design, ratification, published, count, onPublish }: Props) {
  const reduced = useReducedMotion();
  const webgl = useMemo(hasWebgl, []);
  const t = (d: number) => (reduced ? { duration: 0 } : { duration: 0.6, delay: d });

  /** The flat web. It is what you get when WebGL is missing or the 3D scene fails. */
  const flat = (
    <svg viewBox="0 0 200 120" className="h-auto w-full max-w-md" role="img" aria-label={published ? "Your design joined the SpaceDAO network" : "The SpaceDAO network of agencies, companies and open technologies"}>
      {LINKS.map(([a, b], i) => <line key={i} x1={NODES[a].x} y1={NODES[a].y} x2={NODES[b].x} y2={NODES[b].y} stroke="var(--glass-border)" strokeWidth={0.8} />)}
      {JOIN.map((n, i) => (
        <motion.line
          key={`j${n}`} x1={YOU.x} y1={YOU.y} x2={NODES[n].x} y2={NODES[n].y} stroke="var(--cyan)" strokeWidth={1.2}
          initial={false} animate={{ pathLength: published ? 1 : 0, opacity: published ? 0.9 : 0 }} transition={t(0.5 + i * 0.12)}
        />
      ))}
      {NODES.map((n, i) => <circle key={i} cx={n.x} cy={n.y} r={4.5} fill={COLOR[n.kind]} opacity={0.9} />)}
      {published && !reduced && (
        <motion.circle cx={YOU.x} cy={YOU.y} fill="none" stroke="var(--cyan)" strokeWidth={1.5} initial={{ r: 6, opacity: 0.9 }} animate={{ r: 42, opacity: 0 }} transition={{ duration: 1.4, repeat: 2, ease: "easeOut" }} />
      )}
      <motion.circle cx={YOU.x} cy={YOU.y} r={7} initial={false} animate={{ scale: published ? 1 : 0.8 }} style={{ transformOrigin: `${YOU.x}px ${YOU.y}px` }} transition={t(0.3)}
        fill={published ? "var(--cyan)" : "transparent"} stroke="var(--cyan)" strokeWidth={1.5} strokeDasharray={published ? undefined : "2 2"} />
    </svg>
  );
  const flatBox = <div className="grid h-full w-full place-items-center p-4">{flat}</div>;

  return (
    <div className="glass p-5" data-coach="debrief.publish">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display flex items-center gap-2 text-sm"><Icon name="fork" size={16} className="text-cyan" /> Open Tech Registry</h2>
        <ChainReceipt design={design} ratification={ratification} />
      </div>
      <div className="relative mt-3 h-64 overflow-hidden rounded-xl border border-line bg-[#05060f] sm:h-80">
        {webgl ? (
          <ErrorBoundary fallback={flatBox}>
            <Suspense fallback={flatBox}>
              <NetworkPulse highlight={published} />
            </Suspense>
          </ErrorBoundary>
        ) : (
          flatBox
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted" aria-hidden="true">
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-violet-bright" />Agencies</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-bright" />Companies</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-ok" />Open tech</span>
          {webgl && <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#fbbf24]" />Missions</span>}
        </div>
        <div className="w-full sm:w-64">
          {published ? (
            <p role="status" className="m-0 text-sm font-medium text-cyan"><Icon name="check" size={16} className="mr-1 inline align-text-bottom" />Your design joined the SpaceDAO network ({count} published).</p>
          ) : (
            <Button variant="primary" className="w-full" onClick={onPublish}><Icon name="fork" size={16} /> Publish your design</Button>
          )}
        </div>
      </div>
    </div>
  );
}
