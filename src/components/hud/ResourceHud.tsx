import { useMemo } from "react";
import { computeResources, validateDesign } from "@/engine";
import type { Issue, MissionDesign, ResourceKey } from "@/engine/types";
import { Gauge } from "@/components/ui/Gauge";
import { Icon } from "@/components/ui/Icon";
import { useCatalog } from "@/store/game";

const ORDER: ResourceKey[] = ["mass", "power", "budget", "data", "comms", "lifetime"];

export function ResourceHud({ design }: { design: MissionDesign }) {
  const catalog = useCatalog();
  const report = useMemo(() => computeResources(design, catalog), [design, catalog]);
  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-3 lg:grid-cols-6">
      {ORDER.map((k, i) => <Gauge key={k} gauge={report[k]} alignRight={i % 3 === 2 || i >= 4} />)}
    </div>
  );
}

export function useIssues(design: MissionDesign): Issue[] {
  const catalog = useCatalog();
  return useMemo(() => validateDesign(design, catalog), [design, catalog]);
}

/** Blockers (red) and warnings (amber) as small chips. The fix shows on hover or focus. */
export function IssueChips({ issues }: { issues: Issue[] }) {
  if (!issues.length) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-ok"><Icon name="check" size={14} /> No issues, ready for review</div>
    );
  }
  const sorted = [...issues].sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "blocker" ? -1 : 1));
  return (
    <ul className="flex flex-wrap gap-1.5">
      {sorted.map((i) => {
        const blocker = i.severity === "blocker";
        return (
          <li key={i.id} tabIndex={0} className={`group relative max-w-full cursor-help rounded-full border px-2.5 py-0.5 text-xs ${blocker ? "border-over/50 bg-over/10 text-over" : "border-tight/40 bg-tight/10 text-tight"}`}>
            <span className="inline-block max-w-[70vw] truncate align-bottom sm:max-w-sm">{blocker ? "Blocker" : "Warning"}: {i.text}</span>
            <span role="tooltip" className="pointer-events-none absolute left-0 top-full z-40 mt-1.5 hidden w-64 max-w-[80vw] rounded-xl border border-line bg-[#0d0f26]/95 p-3 text-xs text-fg shadow-2xl group-hover:block group-focus-visible:block">
              <span className="mb-1 block text-[10px] uppercase tracking-widest text-faint">How to fix</span>
              {i.fix}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
