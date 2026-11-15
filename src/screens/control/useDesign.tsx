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
