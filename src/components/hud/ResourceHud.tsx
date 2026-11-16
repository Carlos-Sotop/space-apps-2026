import { useEffect, useMemo, useState } from "react";
import { computeResources, validateDesign } from "@/engine";
import type { Issue, MissionDesign, ResourceKey } from "@/engine/types";
import { Gauge } from "@/components/ui/Gauge";
import { Icon } from "@/components/ui/Icon";
import { useCatalog } from "@/store/game";
import { useGuide } from "@/store/guide";

const ORDER: ResourceKey[] = ["mass", "power", "budget", "data", "comms", "lifetime"];

export function ResourceHud({ design }: { design: MissionDesign }) {
  const catalog = useCatalog();
  const report = useMemo(() => computeResources(design, catalog), [design, catalog]);
  const flash = useGuide((s) => s.flash);
  const clearFlash = useGuide((s) => s.clearFlash);
  // the blink runs once; clearing it lets the next fix blink again
  useEffect(() => {
    if (!flash) return;
    const t = window.setTimeout(clearFlash, 1100);
    return () => window.clearTimeout(t);
  }, [flash, clearFlash]);
  return (
    <div data-coach="control.gauges" className="grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-3 lg:grid-cols-6">
      {ORDER.map((k, i) => (
        <Gauge key={flash?.keys.includes(k) ? `${k}-${flash.at}` : k} gauge={report[k]} alignRight={i % 3 === 2 || i >= 4} flash={flash?.keys.includes(k)} />
      ))}
    </div>
  );
}

export function useIssues(design: MissionDesign): Issue[] {
  const catalog = useCatalog();
  return useMemo(() => validateDesign(design, catalog), [design, catalog]);
}

/** Compact count chip that expands into a panel with every issue in full, plus how to fix it. */
export function IssueChips({ issues }: { issues: Issue[] }) {
  const [open, setOpen] = useState(false);
  if (!issues.length) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-ok"><Icon name="check" size={14} /> No issues, ready for review</div>
    );
  }
  const sorted = [...issues].sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "blocker" ? -1 : 1));
  const blockers = sorted.filter((i) => i.severity === "blocker").length;
  const warnings = sorted.length - blockers;
  const chip = (n: number, one: string, many: string, cls: string, icon: "x" | "warning") => n > 0 && (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs ${cls}`}><Icon name={icon} size={13} /> {n} {n === 1 ? one : many}</span>
  );
  return (
    <div className="w-full" data-coach="control.issues">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex flex-wrap items-center gap-1.5 rounded-full text-left">
        {chip(blockers, "blocker", "blockers", "border-over/50 bg-over/10 text-over", "x")}
        {chip(warnings, "warning", "warnings", "border-tight/40 bg-tight/10 text-tight", "warning")}
        <Icon name={open ? "minus" : "plus"} size={14} className="text-muted" />
      </button>
      {open && (
        <ul className="glass mt-2 space-y-2.5 p-3">
          {sorted.map((i) => {
            const blocker = i.severity === "blocker";
            return (
              <li key={i.id} className="flex items-start gap-2.5 text-sm">
                <Icon name={blocker ? "x" : "warning"} size={16} className={`mt-0.5 shrink-0 ${blocker ? "text-over" : "text-tight"}`} />
                <div className="min-w-0">
                  <div className="text-fg">{i.text}</div>
                  <div className="mt-0.5 text-xs text-muted">Fix: {i.fix}</div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
