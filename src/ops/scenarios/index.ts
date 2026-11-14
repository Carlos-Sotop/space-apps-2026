import type { MissionId } from "../../engine/types";
import type { OpsScenario } from "../scenario";
import { moon } from "./moon";

const registry: Partial<Record<MissionId, OpsScenario>> = { "moon-base-zero": moon };

export function getScenario(missionId: MissionId): OpsScenario {
  const sc = registry[missionId];
  if (!sc) throw new Error(`No operations scenario for mission "${missionId}"`);
  return sc;
}
