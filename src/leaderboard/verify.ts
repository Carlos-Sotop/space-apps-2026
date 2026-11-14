import type { Blueprint, Catalog } from "../engine/types";
import { simulateFlight } from "../engine/simulate";
import { manifestHash } from "../crypto";
import { canRunOps, finalScore, opsScore, replay } from "../ops";
import { NAME_RE, type ScoreSubmission } from "./types";

/** Columns of public.scores, computed on the server from the replayed game (never trusted from the client). */
export interface VerifiedScore {
  mission_id: string;
  player_name: string;
  country: string | null;
  mode: "solo" | "crew";
  crew_size: number;
  total: number;
  flight_score: number;
  ops_score: number | null;
  grade: string;
  success: boolean;
  data_gb: number;
  coalition: { leadId: string; partnerIds: string[] };
  summary: { vehicle: string; destination: string; modules: string[]; objectives: string[] };
  manifest_hash: string;
  seed: number;
  custom_tech: boolean;
}

const MAX_ACTIONS = 400;
const MAX_CUSTOM = 6;

function clean(name: unknown): string | null {
  if (typeof name !== "string") return null;
  const n = name.trim().replace(/\s+/g, " ");
  return NAME_RE.test(n) ? n : null;
}

/** Re-runs flight and operations from the submission. Returns the row or a one-line reason. */
export function verifySubmission(sub: ScoreSubmission, base: Catalog): { ok: true; row: VerifiedScore } | { ok: false; error: string } {
  const playerName = clean(sub?.playerName);
  if (!playerName) return { ok: false, error: "Pick a nickname: 1-24 letters, numbers, spaces, . _ -" };
  const country = sub.country && /^([A-Z]{2}|INT)$/.test(sub.country) ? sub.country : null;
  const mode = sub.mode === "crew" ? "crew" : "solo";
  const crewSize = mode === "crew" ? Math.min(4, Math.max(2, Math.floor(Number(sub.crewSize) || 2))) : 1;
  const d = sub.design;
  const mission = base.missions.find((m) => m.id === d?.missionId);
  if (!mission) return { ok: false, error: "Unknown mission" };
  if (!Number.isSafeInteger(sub.flightSeed) || sub.flightSeed < 1) return { ok: false, error: "Bad seed" };

  const custom = (Array.isArray(sub.customBlueprints) ? sub.customBlueprints : []).slice(0, MAX_CUSTOM)
    .filter((b: Blueprint) => typeof b?.id === "string" && b.id.startsWith("bp-player-") && !base.blueprints.some((x) => x.id === b.id));
  const catalog: Catalog = custom.length ? { ...base, blueprints: [...base.blueprints, ...custom] } : base;

  let flight;
  try {
    flight = simulateFlight(d, catalog, sub.flightSeed, sub.live ?? undefined);
  } catch {
    return { ok: false, error: "The design does not replay" };
  }

  let ops = null;
  if (sub.ops && canRunOps(flight)) {
    if (!Array.isArray(sub.ops.actions) || sub.ops.actions.length > MAX_ACTIONS) return { ok: false, error: "Too many operations actions" };
    try {
      ops = replay(d, catalog, { flight, seed: sub.ops.seed, live: sub.ops.live ?? undefined }, sub.ops.actions);
    } catch {
      return { ok: false, error: "The operations log does not replay" };
    }
    if (ops.status === "running") return { ok: false, error: "Finish operations before submitting" };
    if (ops.actions.length !== sub.ops.actions.length) return { ok: false, error: "The operations log has invalid moves" };
  }

  const fin = finalScore(flight, ops);
  const vehicle = base.launchVehicles.find((v) => v.id === d.launchVehicleId)?.name ?? d.launchVehicleId;
  const destination = mission.destinations.find((x) => x.id === d.destinationId)?.name ?? d.destinationId;
  const moduleName = (id: string) => base.modules.find((m) => m.id === id)?.name ?? id;
  return {
    ok: true,
    row: {
      mission_id: mission.id,
      player_name: playerName,
      country,
      mode,
      crew_size: crewSize,
      total: fin.total,
      flight_score: flight.score.total,
      ops_score: ops ? opsScore(ops).total * 10 : null,
      grade: fin.grade,
      success: flight.success && (!ops || ops.status === "ended"),
      data_gb: Math.round((flight.dataReturnedGb + (ops?.dataReturnedGb ?? 0)) * 10) / 10,
      coalition: { leadId: d.coalition.leadId, partnerIds: [...d.coalition.partnerIds] },
      summary: { vehicle, destination, modules: d.moduleIds.map(moduleName), objectives: flight.objectivesMet },
      manifest_hash: manifestHash(d),
      seed: sub.flightSeed,
      custom_tech: custom.length > 0,
    },
  };
}
