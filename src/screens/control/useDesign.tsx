import type { ReactNode } from "react";
import { getMission } from "@/lib/catalog";
import { useCatalog, useGame } from "@/store/game";

/** The current design, its mission and the catalog. Only call inside MissionControl, where a design exists. */
export function useDesign() {
  const design = useGame((s) => s.design);
  const catalog = useCatalog();
  if (!design) throw new Error("MissionControl needs a design");
  const mission = getMission(design.missionId);
  if (!mission) throw new Error(`Unknown mission ${design.missionId}`);
  return { design, mission, catalog };
}

export function StepTitle({ title, chip, children }: { title: string; chip?: string; children?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-display text-lg sm:text-xl">{title}</h2>
        {chip && <span className="rounded-full border border-violet/40 bg-violet/10 px-3 py-0.5 text-xs text-violet-bright">{chip}</span>}
      </div>
      {children}
    </div>
  );
}
