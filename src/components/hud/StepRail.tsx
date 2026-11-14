import { Icon } from "@/components/ui/Icon";

export interface RailStep<T extends string> { id: T; label: string; hint?: string }

interface Props<T extends string> {
  steps: RailStep<T>[];
  current: T;
  onSelect: (id: T) => void;
  /** steps with a blocker, shown with a red dot */
  flagged?: T[];
}

/** Vertical rail on desktop, a compact numbered row on phones. */
export function StepRail<T extends string>({ steps, current, onSelect, flagged = [] }: Props<T>) {
  const idx = steps.findIndex((s) => s.id === current);
  return (
    <nav aria-label="Mission steps">
      <ol className="flex justify-between gap-1 lg:flex-col lg:justify-start">
        {steps.map((s, i) => {
          const active = s.id === current;
          const done = i < idx;
          return (
            <li key={s.id} className="lg:w-full">
              <button
                type="button"
                aria-current={active ? "step" : undefined}
                aria-label={`${i + 1}. ${s.label}`}
                onClick={() => onSelect(s.id)}
                className={`flex w-full items-center gap-3 rounded-ctl border px-1.5 py-2 text-left lg:px-2.5 transition duration-200 ${
                  active ? "border-violet-bright/60 bg-violet/15 shadow-glow" : "border-transparent hover:bg-white/5"
                }`}
              >
                <span className={`num relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs ${
                  active ? "border-violet-bright bg-violet text-white" : done ? "border-ok/50 bg-ok/10 text-ok" : "border-line text-muted"
                }`}>
                  {done && !active ? <Icon name="check" size={14} /> : i + 1}
                  {flagged.includes(s.id) && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-over ring-2 ring-bg" />}
                </span>
                <span className="hidden min-w-0 lg:block">
                  <span className={`block text-sm ${active ? "text-fg" : "text-muted"}`}>{s.label}</span>
                  {s.hint && <span className="block truncate text-[11px] text-faint">{s.hint}</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
