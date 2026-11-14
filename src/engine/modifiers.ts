import type { Catalog, MissionDesign, MissionId, Modifier, ModuleCategory, StatKey } from "./types";
import { getActor, getBlueprint } from "./design";

export interface StatScope {
  category?: ModuleCategory;
  missionId?: MissionId;
}

/** Perks of the lead and the three partners, then every adopted blueprint. */
export function effectiveModifiers(design: MissionDesign, catalog: Catalog): Modifier[] {
  const { leadId, partnerIds } = design.coalition;
  const out: Modifier[] = [];
  for (const id of [leadId, ...partnerIds]) out.push(...getActor(catalog, id).perk.modifiers);
  for (const id of design.blueprintIds) out.push(...getBlueprint(catalog, id).modifiers);
  return out;
}

/** All matching "mul" modifiers multiply first, then all matching "add" modifiers add. */
export function applyStat(base: number, stat: StatKey, modifiers: Modifier[], scope?: StatScope): number {
  let mul = 1;
  let add = 0;
  for (const m of modifiers) {
    if (m.stat !== stat) continue;
    if (m.scope?.category !== undefined && m.scope.category !== scope?.category) continue;
    if (m.scope?.missionId !== undefined && m.scope.missionId !== scope?.missionId) continue;
    if (m.op === "mul") mul *= m.value;
    else add += m.value;
  }
  return base * mul + add;
}
