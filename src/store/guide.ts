import { create } from "zustand";
import type { ResourceKey } from "@/engine/types";
import type { RockyPose } from "@/components/tutorial/Rocky";
import type { StepId } from "./steps";

/**
 * "Show me where": one request to take the player to the thing that fixes their problem.
 * The council card and the Build warning set it; the step that owns the target reads it,
 * opens the right tab, scrolls the element into view and lets Rocky point at it.
 */
export interface GuideFocus {
  /** the Mission Control step that holds the target */
  step: StepId;
  /** the module card to highlight, when the target is a module */
  moduleId?: string;
  /** what Rocky says, at most two short sentences */
  text: string;
  pose: RockyPose;
}

interface GuideState {
  focus: GuideFocus | null;
  /** gauges to blink once, with the moment that set them so a repeat still blinks */
  flash: { keys: ResourceKey[]; at: number } | null;
  showMe: (focus: GuideFocus) => void;
  clearFocus: () => void;
  flashGauges: (keys: ResourceKey[]) => void;
  clearFlash: () => void;
}

export const useGuide = create<GuideState>((set) => ({
  focus: null,
  flash: null,
  showMe: (focus) => set({ focus }),
  clearFocus: () => set({ focus: null }),
  flashGauges: (keys) => set(keys.length ? { flash: { keys, at: Date.now() } } : {}),
  clearFlash: () => set({ flash: null }),
}));
