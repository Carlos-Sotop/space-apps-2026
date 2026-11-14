import type { Catalog, MissionDesign } from "../engine/types";
import { applyAction, createOps } from "./core";
import type { OpsAction, OpsCtx, OpsInit, OpsState } from "./types";

export * from "./types";
export type { OpsScenario, StructureDef, ResearchSpec, ResearchEffect, ScenarioEvent } from "./scenario";
export { createOps, applyAction, whyNot, validTiles } from "./core";
export { maxTurnsFor } from "./util";
export { opsScore, finalScore, canRunOps } from "./score";
export { getScenario } from "./scenarios";

/** Same as applying the actions one by one. The Worker uses this to check a score. */
export function replay(design: MissionDesign, catalog: Catalog, init: OpsInit, actions: OpsAction[]): OpsState {
  const ctx: OpsCtx = { design, catalog };
  return actions.reduce((s, a) => applyAction(s, a, ctx), createOps(design, catalog, init));
}
