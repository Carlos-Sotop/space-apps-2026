import { useEffect } from "react";
import { motion } from "motion/react";
import { Icon, type IconName } from "@/components/ui";
import { sfx } from "@/components/audio";
import type { Source } from "@/engine/types";
import { fmtGb, fmtWh } from "@/lib/format";
import type { OpsGoal, OpsTurnReport } from "@/ops";
import { LiveEventBadge } from "./LiveEventBadge";
import { TickNumber } from "./TickNumber";

interface Props {
  report: OpsTurnReport;
  turnLabel: string;
  nameOf: (id: string) => string;
  goals: OpsGoal[];
  onClose: () => void;
}

interface Line { key: string; icon: IconName; tone: string; live?: Source; text: string }

const names = (ids: string[], nameOf: (id: string) => string) => ids.map(nameOf).join(", ");

function Stat({ icon, label, value, format, delay }: { icon: IconName; label: string; value: number; format: (n: number) => string; delay: number }) {
  if (Math.abs(value) < 0.05) return null;
  const up = value > 0;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm ${up ? "border-ok/35 bg-ok/10 text-ok" : "border-over/40 bg-over/10 text-over"}`}>
      <Icon name={icon} size={14} />
      <span>{up ? "+" : "−"}<TickNumber value={Math.abs(value)} format={format} delay={delay} /></span>
      <span className="text-xs text-fg/80">{label}</span>
    </span>
  );
}

/** Animated recap of the turn that just ran, built from `state.lastReport`. */
export function TurnSummary({ report, turnLabel, nameOf, goals, onClose }: Props) {
  const { delta, effects } = report;
  useEffect(() => {
    sfx("turn");
    if (effects.some((e) => e.kind === "storm")) sfx("storm");
    if (effects.some((e) => e.kind === "impact" || e.kind === "power-out")) sfx("impact");
    if (effects.some((e) => e.kind === "goal-done" || e.kind === "discovery")) sfx("success");
    if (report.warnings.some((w) => w.severity !== "info")) sfx("warning");
    const t = window.setTimeout(onClose, 10000);
    return () => window.clearTimeout(t);
  }, [report, effects, onClose]);

  const goalTitle = (id: string) => goals.find((g) => g.id === id)?.title;
  const lines: Line[] = effects.flatMap((e, i): Line[] => {
    const key = `${e.kind}-${i}`;
    switch (e.kind) {
      case "storm":
        return [{ key, icon: "storm", tone: "text-over", live: e.liveSource, text: `Solar storm, level ${e.severity}${e.hitIds.length ? `: hit ${names(e.hitIds, nameOf)}` : ": nothing hit"}${e.shieldedIds.length ? `. Shielded: ${names(e.shieldedIds, nameOf)}` : ""}` }];
      case "impact":
        return [{ key, icon: "meteor", tone: "text-over", text: `Meteoroid impact${e.hitIds.length ? `: ${names(e.hitIds, nameOf)} −${Math.round(e.damage)}%` : ", no damage"}` }];
      case "power-out":
        return [{ key, icon: "power", tone: "text-tight", text: `Out of power: ${names(e.structureIds, nameOf)}` }];
      case "downlink":
        return [{ key, icon: "comms", tone: "text-cyan", text: `${fmtGb(e.gb)} sent to Earth from ${nameOf(e.fromId)}` }];
      case "goal-done":
        return [{ key, icon: "check", tone: "text-ok", text: `Goal done: ${goalTitle(e.goalId) ?? e.goalId}` }];
      case "discovery":
        return [{ key, icon: "sparkle", tone: "text-ok", text: `Discovery: ${goalTitle(e.goalId) ?? "something new"}` }];
      default:
        return [];
    }
  });

  return (
    <motion.div role="status" aria-live="polite" data-coach="ops.summary" className="glass-strong pointer-events-auto relative w-full max-w-md bg-[#0b0d24]/95 p-3" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
      <button type="button" onClick={onClose} aria-label="Close summary" className="absolute right-2 top-2 text-muted hover:text-fg"><Icon name="x" size={14} /></button>
      <div className="flex items-center gap-2 pr-6 text-sm font-medium">
        <Icon name="sun" size={16} className="text-tight" />
        <span>Day <span className="num">{report.fromDay}</span> <Icon name="arrow" size={12} className="inline" /> <span className="num">{report.toDay}</span></span>
        <span className="text-xs text-muted">{turnLabel} {report.turn}</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Stat icon="science" label="science" value={delta.sciencePoints} format={(n) => Math.round(n).toString()} delay={0} />
        <Stat icon="comms" label="sent" value={delta.dataReturnedGb} format={fmtGb} delay={0.1} />
        <Stat icon="data" label="data" value={delta.dataStoredGb} format={fmtGb} delay={0.2} />
        <Stat icon="power" label="energy" value={delta.energyWh} format={fmtWh} delay={0.3} />
        <Stat icon="water" label="supply" value={delta.waterKg} format={(n) => `${n.toFixed(0)} kg`} delay={0.4} />
      </div>
      {lines.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {lines.map((l, i) => (
            <motion.li key={l.key} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.25 }}>
              <span className={l.tone}><Icon name={l.icon} size={15} /></span>
              <span className="min-w-0 flex-1">{l.text}</span>
              {l.live && <LiveEventBadge source={l.live} />}
            </motion.li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}
