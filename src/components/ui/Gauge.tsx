import type { ResourceGauge, ResourceStatus } from "@/engine/types";
import { fmtResource, RESOURCE_LABEL } from "@/lib/format";
import { Icon } from "./Icon";

const COLOR: Record<ResourceStatus, string> = { ok: "var(--ok)", tight: "var(--tight)", over: "var(--over)" };

function Lines({ title, lines, g }: { title: string; lines: ResourceGauge["usedBy"]; g: ResourceGauge }) {
  if (!lines.length) return null;
  return (
    <div className="mt-1.5 first:mt-0">
      <div className="text-[10px] uppercase tracking-widest text-faint">{title}</div>
      {lines.map((l, i) => (
        <div key={i} className="flex justify-between gap-4 text-xs">
          <span className="truncate text-muted">{l.label}</span>
          <span className="num shrink-0">{fmtResource(g.key, l.amount)}</span>
        </div>
      ))}
    </div>
  );
}

/** Horizontal used-versus-capacity bar with a hover or focus tooltip that explains the numbers. */
export function Gauge({ gauge: g, compact, alignRight }: { gauge: ResourceGauge; compact?: boolean; alignRight?: boolean }) {
  const ratio = g.capacity > 0 ? g.used / g.capacity : g.used > 0 ? 1 : 0;
  const pct = Math.min(1, ratio) * 100;
  const color = COLOR[g.status];
  const verb = g.key === "comms" ? "needed" : "used";
  return (
    <div
      tabIndex={0}
      role="meter"
      aria-label={`${RESOURCE_LABEL[g.key]}: ${fmtResource(g.key, g.used)} ${verb} of ${fmtResource(g.key, g.capacity)}`}
      aria-valuemin={0}
      aria-valuemax={g.capacity}
      aria-valuenow={g.used}
      className="group relative min-w-0 rounded-md"
    >
      <div className="flex items-center justify-between gap-2 text-[11px] uppercase tracking-wider text-muted">
        <span className="flex items-center gap-1.5">
          <Icon name={g.key} size={13} />
          {RESOURCE_LABEL[g.key]}
        </span>
        {g.status !== "ok" && <span style={{ color }} className="font-medium">{g.status === "over" ? "Over" : "Tight"}</span>}
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full transition-[width,background-color] duration-300 ease-out" style={{ width: `${pct}%`, background: color, boxShadow: `0 0 10px ${color}` }} />
      </div>
      <div className={`num mt-1 flex justify-between text-xs ${compact ? "" : "sm:text-[13px]"}`}>
        <span style={{ color: g.status === "ok" ? "var(--fg)" : color }}>{fmtResource(g.key, g.used)}</span>
        <span className="text-faint">/ {fmtResource(g.key, g.capacity)}</span>
      </div>
      <div className={`pointer-events-none absolute ${alignRight ? "right-0" : "left-0"} top-full z-40 mt-2 hidden w-60 max-w-[80vw] rounded-xl border border-line bg-[#0d0f26]/95 p-3 shadow-2xl backdrop-blur-xl group-hover:block group-focus-visible:block`}>
        <Lines title={g.key === "comms" ? "Needed" : "Used by"} lines={g.usedBy} g={g} />
        <Lines title="Provided by" lines={g.providedBy} g={g} />
        {!g.usedBy.length && !g.providedBy.length && <div className="text-xs text-muted">Nothing here yet</div>}
      </div>
    </div>
  );
}
