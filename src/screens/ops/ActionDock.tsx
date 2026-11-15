import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui";

export type DockId = "deploy" | "build" | "research" | "scout";

export interface DockCard {
  id: DockId;
  icon: IconName;
  label: string;
  /** e.g. "1 AP" */
  cost: string;
  /** why the card is disabled; null when usable */
  reason: string | null;
  badge?: number;
}

interface Props {
  cards: DockCard[];
  open: DockId | null;
  onPick: (id: DockId) => void;
  /** the tray that opens above the dock */
  tray?: ReactNode;
  /** the end-turn control */
  end: ReactNode;
}

/** RTS-style bottom bar: one icon card per action with its cost, the reason when disabled, and the end-turn button. */
export function ActionDock({ cards, open, onPick, tray, end }: Props) {
  return (
    <div className="relative border-t border-line bg-bg/80 backdrop-blur-xl" data-coach="ops.actions">
      {tray && <div className="absolute inset-x-0 bottom-full z-20 max-h-[46dvh] overflow-y-auto border-t border-line bg-bg/95 p-3 backdrop-blur-xl">{tray}</div>}
      <div className="flex items-stretch gap-2 p-2.5">
        <div className="grid flex-1 grid-cols-4 gap-2">
          {cards.map((c) => {
            const off = c.reason !== null;
            return (
              <button
                key={c.id}
                type="button"
                disabled={off}
                aria-expanded={open === c.id}
                aria-label={off ? `${c.label}: ${c.reason}` : `${c.label}, ${c.cost}`}
                title={c.reason ?? undefined}
                onClick={() => onPick(c.id)}
                className={`relative flex min-w-0 flex-col items-center gap-0.5 rounded-xl border px-1 py-2 text-center transition ${open === c.id ? "border-cyan bg-cyan/10 shadow-select" : "border-line bg-white/[0.04] hover:border-cyan/60"} ${off ? "cursor-not-allowed opacity-60" : ""}`}
              >
                <span className={open === c.id ? "text-cyan" : "text-fg"}><Icon name={c.icon} size={22} /></span>
                <span className="text-xs font-medium">{c.label}</span>
                <span className="num text-[10.5px] text-muted">{c.cost}</span>
                {off && <span className="line-clamp-2 text-[10px] leading-tight text-tight">{c.reason}</span>}
                {!!c.badge && <span className="num absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-cyan px-1 text-[11px] font-semibold text-[#04050d]">{c.badge}</span>}
              </button>
            );
          })}
        </div>
        <div className="flex w-[34%] max-w-52 shrink-0 items-stretch">{end}</div>
      </div>
    </div>
  );
}
