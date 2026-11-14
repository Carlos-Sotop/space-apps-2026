import type { Blueprint, LiveContext, MissionDesign, MissionId } from "../engine/types";
import type { OpsAction, OpsLive } from "../ops/types";

/** What the browser sends; the Worker re-runs the engine on it and computes the score itself. */
export interface ScoreSubmission {
  playerName: string;
  /** ISO 3166 alpha-2, or "INT" for international teams */
  country: string | null;
  mode: "solo" | "crew";
  crewSize: number;
  design: MissionDesign;
  /** blueprints the player published and used (not in the shipped catalog) */
  customBlueprints: Blueprint[];
  flightSeed: number;
  /** the live context the flight used (space weather, Earth events) */
  live: LiveContext | null;
  ops: { seed: number; live: OpsLive | null; actions: OpsAction[] } | null;
}

export interface ScoreRow {
  id: string;
  createdAt: string;
  missionId: MissionId;
  playerName: string;
  country: string | null;
  mode: "solo" | "crew";
  crewSize: number;
  total: number;
  flightScore: number;
  opsScore: number | null;
  grade: string;
  success: boolean;
  dataGb: number;
  coalition: { leadId: string; partnerIds: string[] };
  summary: { vehicle: string; destination: string; modules: string[]; objectives: string[] };
  manifestHash: string;
  customTech: boolean;
}

export const NAME_RE = /^[\p{L}\p{N} ._-]{1,24}$/u;
