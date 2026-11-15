import type { Blueprint, Catalog, MissionDesign, MissionId, Modifier, ModuleCategory, StatKey } from "./types";
import { getActor, getBlueprint } from "./design";

export interface StatScope {
  category?: ModuleCategory;
  missionId?: MissionId;
}

export interface BlueprintFit {
  /** true when the spacecraft flies a module the design attaches to */
  ok: boolean;
  /** modules in the design it attaches to */
  hostIds: string[];
  /** modules this mission offers that it could attach to, for the "add one in Build" hint */
  optionIds: string[];
}

/** An open design works only on a spacecraft that flies a module it attaches to. */
export function blueprintFit(bp: Blueprint, design: MissionDesign, catalog: Catalog): BlueprintFit {
  const all = bp.hostIds ?? catalog.modules.filter((m) => m.category === bp.category).map((m) => m.id);
  const offered = catalog.missions.find((m) => m.id === design.missionId)?.moduleIds ?? [];
  const hostIds = design.moduleIds.filter((id) => all.includes(id));
  return { ok: hostIds.length > 0, hostIds, optionIds: offered.filter((id) => all.includes(id)) };
}

/** Adopted blueprints that attach to something on this spacecraft; the others change nothing. */
export function fittedBlueprints(design: MissionDesign, catalog: Catalog): Blueprint[] {
  return design.blueprintIds.map((id) => getBlueprint(catalog, id)).filter((b) => blueprintFit(b, design, catalog).ok);
}

/**
 * Open tech reciprocity: a team that adopted any open design owes the registry its own design,
 * published at the Debrief.
 */
export const reciprocityDue = (design: MissionDesign): boolean => design.blueprintIds.length > 0;

/** Perks of the lead and the three partners, then every adopted blueprint that fits. */
export function effectiveModifiers(design: MissionDesign, catalog: Catalog): Modifier[] {
  const { leadId, partnerIds } = design.coalition;
  const out: Modifier[] = [];
  for (const id of [leadId, ...partnerIds]) out.push(...getActor(catalog, id).perk.modifiers);
  for (const b of fittedBlueprints(design, catalog)) out.push(...b.modifiers);
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
