import type { MissionId } from "../../engine/types";
import type { OpsScenario } from "../scenario";

const registry: Partial<Record<MissionId, OpsScenario>> = {};

export function getScenario(missionId: MissionId): OpsScenario {
  const sc = registry[missionId];
  if (!sc) throw new Error(`No operations scenario for mission "${missionId}"`);
  return sc;
}
