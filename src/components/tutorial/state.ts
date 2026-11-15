import { create } from "zustand";
import { useGame } from "@/store/game";

interface Progress {
  /** tip index reached per context; a value past the last tip means done or skipped */
  at: Record<string, number>;
  set: (ctx: string, i: number) => void;
  reset: () => void;
}

export const useCoachProgress = create<Progress>((set) => ({
  at: {},
  set: (ctx, i) => set((s) => ({ at: { ...s.at, [ctx]: i } })),
  reset: () => set({ at: {} }),
}));

/** Tutorial on/off, the chosen play mode, and a way to replay the tips. */
export function useTutorial() {
  const enabled = useGame((s) => s.tutorial);
  const playMode = useGame((s) => s.playMode);
  const setTutorial = useGame((s) => s.setTutorial);
  const reset = useCoachProgress((s) => s.reset);
  return {
    enabled,
    playMode,
    setEnabled: (on: boolean) => { if (on) reset(); setTutorial(on); },
    toggle: () => { if (!enabled) reset(); setTutorial(!enabled); },
    restart: () => { reset(); setTutorial(true); },
  };
}
