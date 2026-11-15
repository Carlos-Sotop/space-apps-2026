import { Button, Icon } from "@/components/ui";
import type { OpsWarning } from "@/ops";

const TONE = { info: "border-line text-muted", warn: "border-tight/40 bg-tight/10 text-tight", danger: "border-over/50 bg-over/10 text-over" } as const;

/** Forward-looking warnings. The fix text always shows; "Fix" opens the action tray that can do it. */
export function Warnings({ warnings, onFix }: { warnings: OpsWarning[]; onFix: (w: OpsWarning) => void }) {
  if (!warnings.length) return null;
  return (
    <ul className="space-y-2" aria-label="Warnings" data-coach="ops.warnings">
      {warnings.map((w) => (
        <li key={w.id} className={`rounded-xl border p-2.5 text-sm ${TONE[w.severity]}`}>
          <div className="flex items-start gap-2">
            <Icon name="warning" size={16} className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-fg">{w.text}</div>
              {w.turnsLeft !== undefined && <div className="num text-[11px]">{w.turnsLeft} turn{w.turnsLeft === 1 ? "" : "s"} left</div>}
              {w.fix && <div className="mt-1 text-xs font-medium text-fg"><span className="text-cyan">Fix: </span>{w.fix}</div>}
            </div>
            {w.fix && <Button size="sm" variant="primary" onClick={() => onFix(w)}>Fix</Button>}
          </div>
        </li>
      ))}
    </ul>
  );
}
