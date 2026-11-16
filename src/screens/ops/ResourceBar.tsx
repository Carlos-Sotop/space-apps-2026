import { motion } from "motion/react";
import { Icon, type IconName } from "@/components/ui";
import { fmtGb, fmtWh } from "@/lib/format";
import type { OpsState, OpsTurnReport } from "@/ops";

interface Item {
  key: string;
  icon: IconName;
  label: string;
  value: string;
  frac?: number;
  color: string;
  delta: number;
  fmt: (n: number) => string;
}

const sign = (n: number) => (n > 0 ? "+" : "−");

function Chip({ it }: { it: Item }) {
  const show = Math.abs(it.delta) >= 0.05;
  return (
    <div className="min-w-0 rounded-xl border border-line bg-white/[0.03] px-2.5 py-1.5" data-coach={`ops.${it.key}`}>
      <div className="flex items-center gap-1.5 text-[11px] text-muted"><span style={{ color: it.color }}><Icon name={it.icon} size={14} /></span><span className="truncate">{it.label}</span></div>
      <div className="flex items-baseline justify-between gap-1">
        <span className="num truncate text-sm font-medium">{it.value}</span>
        {show && <span className={`num shrink-0 text-[11px] ${it.delta > 0 ? "text-ok" : "text-over"}`} title="Change expected next turn">{sign(it.delta)}{it.fmt(Math.abs(it.delta))}</span>}
      </div>
      {it.frac !== undefined && (
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10">
          <motion.div className="h-full rounded-full" style={{ background: it.color }} animate={{ width: `${Math.max(0, Math.min(100, it.frac * 100))}%` }} transition={{ duration: 0.5 }} />
        </div>
      )}
    </div>
  );
}

/** Top resource bar: what you have and what changes next turn. `delta` is null when no projection exists. */
export function ResourceBar({ ops, consumable, delta }: { ops: OpsState; consumable: { label: string; unit: string }; delta: OpsTurnReport["delta"] | null }) {
  const d = delta ?? { energyWh: 0, waterKg: 0, dataStoredGb: 0, dataReturnedGb: 0, sciencePoints: 0 };
  const items: Item[] = [
    { key: "energy", icon: "power", label: "Energy", value: fmtWh(ops.energyWh), frac: ops.storageWh > 0 ? ops.energyWh / ops.storageWh : 0, color: "var(--ok)", delta: d.energyWh, fmt: fmtWh },
    { key: "supply", icon: "water", label: consumable.label, value: `${ops.waterKg.toFixed(0)} ${consumable.unit}`, frac: ops.waterKg / Math.max(ops.waterKg, 100), color: "#38bdf8", delta: d.waterKg, fmt: (n) => `${n.toFixed(0)} ${consumable.unit}` },
    { key: "data", icon: "data", label: "Data waiting", value: fmtGb(ops.dataStoredGb), frac: ops.dataStorageGb > 0 ? ops.dataStoredGb / ops.dataStorageGb : 0, color: "var(--violet-bright)", delta: d.dataStoredGb, fmt: fmtGb },
    { key: "sent", icon: "comms", label: "Sent to Earth", value: fmtGb(ops.dataReturnedGb), color: "var(--cyan)", delta: d.dataReturnedGb, fmt: fmtGb },
    { key: "science", icon: "science", label: "Science", value: `${Math.floor(ops.sciencePoints)} pts`, color: "var(--tight)", delta: d.sciencePoints, fmt: (n) => n.toFixed(0) },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 border-b border-line bg-bg/60 px-3 py-2 backdrop-blur-xl sm:grid-cols-3 lg:grid-cols-6" role="group" aria-label="Resources">
      {items.map((it) => <Chip key={it.key} it={it} />)}
      <div className="flex items-center justify-between gap-2 rounded-xl border border-line bg-white/[0.03] px-2.5 py-1.5" data-coach="ops.ap">
        <div>
          <div className="text-[11px] text-muted">Day</div>
          <div className="num text-sm font-medium">{ops.env.day}</div>
        </div>
        <div className="flex items-center gap-1" role="img" aria-label={`${ops.ap} of ${ops.apPerTurn} action points left`}>
          {Array.from({ length: ops.apPerTurn }, (_, i) => <span key={i} className={`h-3 w-3 rounded-full ${i < ops.ap ? "bg-cyan shadow-[0_0_10px_#22d3ee]" : "bg-white/10"}`} />)}
        </div>
      </div>
    </div>
  );
}
