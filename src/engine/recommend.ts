// Recommended choices for each Mission Control step: they power Quick play and the "Use recommended" buttons.
// C0 (Sunday sprint contract): both follow today's defaultDesign. C3 replaces them with real recommendations.
import { defaultDesign } from "./design";
import type { Catalog, Coalition, DesignPatch, DesignStep, MissionDesign, MissionId } from "./types";

/** The fields of a design that each step decides. */
const STEP_FIELDS: Record<DesignStep, (keyof DesignPatch)[]> = {
  charter: ["values"],
  objectives: ["secondaryObjectiveIds"],
  launch: ["destinationId", "launchVehicleId"],
  build: ["moduleIds"],
  opentech: ["blueprintIds"],
  rideshare: ["rideshareIds"],
};

/** The recommended choice for one step, as a patch on the current design. */
export function recommendStep(step: DesignStep, design: MissionDesign, catalog: Catalog): DesignPatch {
  const best = defaultDesign(design.missionId, design.coalition, catalog);
  const patch: DesignPatch = {};
  for (const field of STEP_FIELDS[step]) Object.assign(patch, { [field]: best[field] });
  return patch;
}

/** A full recommended design for a mission and coalition. */
export function autoDesign(missionId: MissionId, coalition: Coalition, catalog: Catalog): MissionDesign {
  return defaultDesign(missionId, coalition, catalog);
}
