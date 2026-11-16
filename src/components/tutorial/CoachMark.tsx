import { AnimatePresence } from "motion/react";
import { Button } from "@/components/ui";
import { useGame } from "@/store/game";
import { AnchoredBubble } from "./AnchoredBubble";
import { useCoachProgress } from "./state";
import { TIPS, tipContext } from "./tips";

/**
 * Rocky, speaking next to the thing he is talking about: the bubble sits against the element
 * marked data-coach="<anchor>", the rest of the screen dims, and the target is scrolled into
 * view. Placement, the arrow and the spotlight all live in AnchoredBubble.
 */
export function CoachMark() {
  const screen = useGame((s) => s.screen);
  const step = useGame((s) => s.step);
  const enabled = useGame((s) => s.tutorial);
  const onboarding = useGame((s) => s.onboarding);
  const at = useCoachProgress((s) => s.at);
  const setAt = useCoachProgress((s) => s.set);

  const ctx = tipContext(screen, step);
  const tips = TIPS[ctx] ?? [];
  const index = at[ctx] ?? 0;
  const tip = enabled && !onboarding ? tips[index] : undefined;

  if (!tip) return null;

  const last = index >= tips.length - 1;

  return (
    <AnimatePresence mode="wait">
      <AnchoredBubble key={`${ctx}:${index}`} anchor={tip.anchor} pose={tip.pose} tipKey={`${ctx}:${index}`} spotlight maxWidth={400}>
        <p className="m-0 text-[15px] leading-snug text-fg">{tip.text}</p>
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="num text-xs text-muted">{index + 1} / {tips.length}</span>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setAt(ctx, tips.length)}>Skip</Button>
            <Button size="sm" variant="primary" onClick={() => setAt(ctx, index + 1)}>{last ? "Got it" : "Next"}</Button>
          </div>
        </div>
      </AnchoredBubble>
    </AnimatePresence>
  );
}
