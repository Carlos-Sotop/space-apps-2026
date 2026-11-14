import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { TopBar } from "@/components/hud/TopBar";
import { Badge, Button, Icon, LiveBadge } from "@/components/ui";
import type { FlightEvent } from "@/engine/types";
import { getMission } from "@/lib/catalog";
import { fmtGb, fmtW } from "@/lib/format";
import { useGame } from "@/store/game";
import { FlightScene } from "./FlightScene";
import { FlightHud } from "./FlightHud";
import { Sparkline } from "./FlightTelemetry";
import { buildTimeline, dayAt, endProgress, phaseAt, type Outcome } from "./flightTimeline";

const DURATION_S = 26;
const KIND_COLOR: Record<FlightEvent["kind"], string> = { info: "var(--fg-faint)", success: "var(--ok)", warning: "var(--tight)", failure: "var(--over)" };
const OUTCOME: Record<Outcome, { label: string; color: string; line: string }> = {
  success: { label: "Success", color: "var(--ok)", line: "Mission accomplished. The data is on its way to the world." },
  partial: { label: "Partial", color: "var(--tight)", line: "The spacecraft flew, but the main goal was not met." },
  lost: { label: "Lost", color: "var(--over)", line: "We lost the spacecraft. Every failure teaches us something." },
};

function sourceName(title: string): string {
  return title.includes("EONET") ? "NASA EONET" : title.includes("DONKI") ? "NASA DONKI" : title;
}

export default function Flight() {
  const result = useGame((s) => s.result);
  const design = useGame((s) => s.design);
  const live = useGame((s) => s.live);
  const go = useGame((s) => s.go);
  const afterFlight = useGame((s) => s.afterFlight);
  const mission = design ? getMission(design.missionId) : undefined;
  const [p, setP] = useState(0);
  const [speed, setSpeed] = useState(1);
  const pRef = useRef(0);
  const speedRef = useRef(1);

  useEffect(() => { if (!result || !design) go("control"); }, [result, design, go]);

  const timeline = useMemo(() => buildTimeline(mission?.phases ?? []), [mission]);
  const end = endProgress(timeline, result?.lostAt);
  const calm = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    let raf = 0, last = performance.now();
    pRef.current = 0; setP(0);
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      pRef.current = Math.min(end, pRef.current + (dt * speedRef.current) / (calm ? DURATION_S / 4 : DURATION_S));
      setP(pRef.current);
      if (pRef.current < end) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // restarts only for a new result; speed is read through speedRef
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, end]);

  if (!result || !design || !mission) return null;

  const ended = p >= end - 1e-6;
  const day = dayAt(timeline, p);
  const { index } = phaseAt(timeline, p);
  const dest = mission.destinations.find((d) => d.id === design.destinationId) ?? mission.destinations[0];
  const lunar = dest.orbitClass === "TLI";
  const seen = result.telemetry.filter((s) => s.day <= day + 0.01);
  const last = seen[seen.length - 1];
  const events = result.events.filter((e) => e.day <= day + 0.01).reverse();
  const outcome: Outcome = result.lostAt ? "lost" : result.success ? "success" : "partial";
  const skip = () => { pRef.current = end; setP(end); };

  return (
    <div className="pb-10">
      <TopBar title={mission.name} right={
        <>
          {[1, 4].map((v) => (
            <Button key={v} size="sm" variant={speed === v ? "primary" : "ghost"} aria-pressed={speed === v} aria-label={`Speed x${v}`} onClick={() => { speedRef.current = v; setSpeed(v); }}><span className="num">x{v}</span></Button>
          ))}
          <Button size="sm" onClick={skip}><Icon name="skip" size={14} /> Skip</Button>
        </>
      } />
      <div className="mx-auto max-w-7xl space-y-4 px-4 sm:px-6">
        <ol className="flex gap-1" aria-label="Flight phases">
          {timeline.phases.map((ph, i) => {
            const w = (timeline.starts[i + 1] ?? 1) - timeline.starts[i];
            const fill = i < index ? 1 : i === index ? phaseAt(timeline, p).frac : 0;
            return (
              <li key={ph.id + i} style={{ flex: w }} className="min-w-0">
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-brand" style={{ width: `${fill * 100}%` }} /></div>
                <div className={`mt-1.5 truncate text-[10px] uppercase tracking-wider sm:text-[11px] ${i === index ? "text-fg" : "text-faint"}`}>{ph.label}</div>
              </li>
            );
          })}
        </ol>
        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
          <div className="min-w-0 space-y-4">
            <div className="glass relative aspect-[4/3] overflow-hidden sm:aspect-[2/1]">
              <FlightScene timeline={timeline} p={p} lunar={lunar} lostAt={result.lostAt} ended={ended} />
              <FlightHud timeline={timeline} index={index} p={p} day={day} ended={ended} lost={!!result.lostAt && ended} calm={calm} />
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              <Sparkline label="Power" values={seen.map((s) => s.powerW)} now={fmtW(last?.powerW ?? 0)} color="var(--tight)" />
              <Sparkline label="Battery" values={seen.map((s) => s.batteryWh)} now={`${Math.round(last?.batteryWh ?? 0)} Wh`} color="var(--ok)" />
              <Sparkline label="Data queued" values={seen.map((s) => s.dataQueuedGb)} now={fmtGb(last?.dataQueuedGb ?? 0)} color="var(--violet-bright)" />
              <Sparkline label="Data returned" values={seen.map((s) => s.dataReturnedGb)} now={fmtGb(last?.dataReturnedGb ?? 0)} color="var(--blue-bright)" />
              <Sparkline label="Link" values={seen.map((s) => (s.linkUp ? 1 : 0))} now={last?.linkUp ? "UP" : "DOWN"} binary />
            </div>
          </div>
          <aside className="glass flex max-h-[480px] min-h-[240px] flex-col p-4">
            <div className="mb-3 text-xs uppercase tracking-widest text-faint">Event feed</div>
            <ul className="flex-1 space-y-3 overflow-y-auto pr-1" aria-live="polite">
              {events.map((e, i) => (
                <motion.li key={`${e.day}-${e.title}-${i}`} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="flex gap-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: KIND_COLOR[e.kind] }} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 text-sm"><span>{e.title}</span><span className="num text-[11px] text-faint">day {Math.floor(e.day)}</span></div>
                    {e.kind !== "info" && <p className="text-xs text-muted">{e.text}</p>}
                    {e.liveSource && <div className="mt-1"><LiveBadge source={sourceName(e.liveSource.title)} snapshot={live?.snapshot} date={live?.fetchedAt} href={e.liveSource.url} /></div>}
                  </div>
                </motion.li>
              ))}
            </ul>
          </aside>
        </div>
      </div>
      <AnimatePresence>
        {ended && (
          <motion.div className="fixed inset-0 z-40 grid place-items-center bg-black/60 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="glass-strong w-full max-w-md bg-[#0b0d24]/95 p-8 text-center" initial={{ scale: 0.94, y: 10 }} animate={{ scale: 1, y: 0 }} role="dialog" aria-label={`Flight ${OUTCOME[outcome].label}`}>
              <div className="font-display text-4xl" style={{ color: OUTCOME[outcome].color, textShadow: `0 0 28px ${OUTCOME[outcome].color}` }}>{OUTCOME[outcome].label}</div>
              <p className="mt-3 text-sm text-muted">{OUTCOME[outcome].line}</p>
              <div className="mt-3 flex justify-center gap-2"><Badge>Score <span className="num">{result.score.total}</span></Badge><Badge>Grade {result.score.grade}</Badge></div>
              <Button variant="primary" size="lg" className="mt-6" onClick={() => void afterFlight()}>{result.lostAt && !["operations", "downlink"].includes(result.lostAt) ? "See the debrief" : "Take command on site"} <Icon name="arrow" size={16} /></Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
