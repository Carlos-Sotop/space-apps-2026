import type { Issue } from "@/engine/types";
import { Icon } from "@/components/ui/Icon";

/** Every issue in full (what is wrong and how to fix it), blockers first. */
export function WarningsPanel({ issues }: { issues: Issue[] }) {
  if (!issues.length) {
    return (
      <div data-coach="control.issues" className="glass flex items-center gap-2 border-ok/40 px-4 py-3 text-sm text-ok">
        <Icon name="check" size={16} /> No issues, ready for review
      </div>
    );
  }
  const sorted = [...issues].sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "blocker" ? -1 : 1));
  const blockers = sorted.filter((i) => i.severity === "blocker").length;
  return (
    <section data-coach="control.issues" aria-label="Warnings" className={`glass p-4 ${blockers ? "border-over/50" : "border-tight/40"}`}>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <Icon name="warning" size={16} className={blockers ? "text-over" : "text-tight"} />
        {blockers ? `${blockers} ${blockers === 1 ? "blocker" : "blockers"} to fix before launch` : "Warnings"}
      </h2>
      <ul className="space-y-3">
        {sorted.map((i) => {
          const blocker = i.severity === "blocker";
          return (
            <li key={i.id} className="flex items-start gap-2.5 text-sm">
              <Icon name={blocker ? "x" : "warning"} size={16} className={`mt-0.5 shrink-0 ${blocker ? "text-over" : "text-tight"}`} />
              <div className="min-w-0">
                <div className="text-fg">{i.text}</div>
                <div className="mt-0.5 text-muted">Fix: {i.fix}</div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
