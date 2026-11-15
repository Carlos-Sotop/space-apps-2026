import { Icon } from "@/components/ui/Icon";
import { useGame } from "@/store/game";
import type { Screen, StepId } from "@/store/steps";

export const JOURNEY = ["Mission", "Team", "Design", "Review & Sign", "Launch", "Operate", "Debrief"] as const;

/** Index into JOURNEY for the current screen and Mission Control step, or -1 outside the play loop. */
export function journeyIndex(screen: Screen, step: StepId): number {
  switch (screen) {
    case "missions": return 0;
    case "coalition": return 1;
    case "control": return step === "council" ? 3 : 2;
    case "flight": return 4;
    case "ops": return 5;
    case "debrief": return 6;
    default: return -1;
  }
}

/** Always-visible progress through the whole game. Cyan marks where the player is. */
export function JourneyBar() {
  const screen = useGame((s) => s.screen);
  const step = useGame((s) => s.step);
  const cur = journeyIndex(screen, step);
  if (cur < 0) return null;
  return (
    <nav aria-label="Mission journey" data-coach="journey.bar" className="mx-auto w-full max-w-7xl px-4 pb-2 sm:px-6">
      <ol className="flex items-center gap-1">
        {JOURNEY.map((label, i) => {
          const active = i === cur;
          const done = i < cur;
          return (
            <li key={label} className={`flex items-center gap-1 ${i < JOURNEY.length - 1 ? "flex-1" : ""}`} aria-current={active ? "step" : undefined}>
              <span className={`num flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] ${
                active ? "border-cyan bg-cyan text-[#04050d] shadow-select" : done ? "border-line bg-white/10 text-fg" : "border-line text-muted"
              }`}>
                {done ? <Icon name="check" size={12} strokeWidth={3} /> : i + 1}
              </span>
              <span className={`whitespace-nowrap text-xs ${active ? "font-semibold text-cyan" : "hidden text-muted lg:inline"}`}>{label}</span>
              {i < JOURNEY.length - 1 && <span className={`h-px min-w-1 flex-1 ${done ? "bg-white/30" : "bg-white/10"}`} aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
