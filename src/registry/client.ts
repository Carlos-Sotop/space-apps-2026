// Browser client for the shared registry in Supabase (published blueprints and the mission leaderboard).
// Talks to the PostgREST endpoint with the publishable key (protected by row level security, see
// supabase/migrations). No SDK on purpose: fewer bytes and nothing to break. It never throws: every failure
// answers "not available" so the game keeps working offline and with no keys.
import type { Blueprint, FlightResult, MissionId, MissionDesign, Modifier, ModuleCategory } from "@/engine/types";

export interface RegistryConfig {
  url: string | undefined;
  key: string | undefined;
  fetch: (url: string, init: RequestInit) => Promise<Response>;
  timeoutMs: number;
}

export interface LeaderboardRow {
  id: string;
  callsign: string;
  leadId: string;
  score: number;
  grade: string;
  success: boolean;
  createdAt: string;
}

export interface MissionEntry {
  missionId: MissionId;
  leadId: string;
  callsign: string;
  score: number;
  grade: string;
  success: boolean;
  lostAt?: string;
  science: number;
  safety: number;
  efficiency: number;
  collaboration: number;
  manifestHash?: string;
}

const DEFAULTS: RegistryConfig = {
  url: import.meta.env.VITE_SUPABASE_URL,
  key: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  fetch: (url, init) => fetch(url, init),
  timeoutMs: 6000,
};

const CALLSIGN_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** A short anonymous name such as "ESA-7K2Q". Never typed by the player, so no personal data reaches the database. */
export function makeCallsign(shortName: string, random: (n: number) => number = (n) => Math.floor(Math.random() * n)): string {
  const prefix = shortName.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 8) || "CREW";
  return `${prefix}-${Array.from({ length: 4 }, () => CALLSIGN_ALPHABET[random(CALLSIGN_ALPHABET.length)]).join("")}`;
}

export function missionEntry(result: FlightResult, design: MissionDesign, callsign: string, manifestHash?: string): MissionEntry {
  const s = result.score;
  return {
    missionId: design.missionId,
    leadId: design.coalition.leadId,
    callsign,
    score: Math.round(s.total),
    grade: s.grade,
    success: result.success,
    lostAt: result.lostAt,
    science: Math.round(s.science),
    safety: Math.round(s.safety),
    efficiency: Math.round(s.efficiency),
    collaboration: Math.round(s.collaboration),
    manifestHash: manifestHash && /^[0-9a-f]{64}$/.test(manifestHash) ? manifestHash : undefined,
  };
}

const clamp = (n: number) => Math.min(10000, Math.max(0, Math.round(Number.isFinite(n) ? n : 0)));

export function createRegistry(overrides: Partial<RegistryConfig> = {}) {
  const cfg = { ...DEFAULTS, ...overrides };
  const enabled = !!cfg.url && !!cfg.key;

  async function call(path: string, init: RequestInit = {}): Promise<Response | null> {
    if (!enabled) return null;
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), cfg.timeoutMs);
    try {
      return await cfg.fetch(`${cfg.url}/rest/v1/${path}`, {
        ...init,
        signal: ctl.signal,
        headers: { apikey: cfg.key as string, "Content-Type": "application/json", ...(init.headers as Record<string, string> | undefined) },
      });
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  /** Share a design in the Open Tech Registry. True when it is stored (or was already stored). */
  async function publishBlueprint(bp: Blueprint): Promise<boolean> {
    const res = await call("blueprints", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        id: bp.id,
        name: bp.name.slice(0, 60),
        author_id: bp.authorId,
        parent_id: bp.parentId,
        category: bp.category,
        modifiers: bp.modifiers.slice(0, 8),
        summary: bp.summary.slice(0, 160),
        content_hash: bp.contentHash,
      }),
    });
    return !!res && (res.ok || res.status === 409);
  }

  /** Blueprints published by other players, newest first. Empty when the registry is not reachable. */
  async function listBlueprints(limit = 50): Promise<Blueprint[]> {
    const res = await call(`blueprints?select=*&order=created_at.desc&limit=${limit}`);
    if (!res?.ok) return [];
    try {
      const rows = (await res.json()) as unknown;
      if (!Array.isArray(rows)) return [];
      return rows.flatMap((r): Blueprint[] => {
        if (!r || typeof r !== "object") return [];
        const o = r as Record<string, unknown>;
        if (typeof o.id !== "string" || typeof o.name !== "string" || typeof o.author_id !== "string" || typeof o.category !== "string" || !Array.isArray(o.modifiers)) return [];
        return [{
          id: o.id,
          name: o.name,
          authorId: o.author_id,
          parentId: typeof o.parent_id === "string" ? o.parent_id : null,
          category: o.category as ModuleCategory,
          modifiers: o.modifiers as Modifier[],
          summary: typeof o.summary === "string" ? o.summary : "",
          contentHash: typeof o.content_hash === "string" ? o.content_hash : "",
          txHash: typeof o.tx_hash === "string" ? o.tx_hash : undefined,
          adoptions: typeof o.adoptions === "number" ? o.adoptions : 0,
        }];
      });
    } catch {
      return [];
    }
  }

  /** Post one finished flight to the leaderboard. True when stored. */
  async function submitMission(e: MissionEntry): Promise<boolean> {
    const res = await call("missions", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        mission_id: e.missionId,
        lead_id: e.leadId,
        callsign: e.callsign,
        score: clamp(e.score),
        grade: e.grade,
        success: e.success,
        lost_at: e.lostAt ?? null,
        science: clamp(e.science),
        safety: clamp(e.safety),
        efficiency: clamp(e.efficiency),
        collaboration: clamp(e.collaboration),
        manifest_hash: e.manifestHash ?? null,
      }),
    });
    return !!res?.ok;
  }

  /** Best flights of one mission. `null` when the leaderboard is not reachable, `[]` when it is empty. */
  async function topMissions(missionId: MissionId, limit = 10): Promise<LeaderboardRow[] | null> {
    const res = await call(`missions?select=id,callsign,lead_id,score,grade,success,created_at&mission_id=eq.${missionId}&order=score.desc,created_at.asc&limit=${limit}`);
    if (!res?.ok) return null;
    try {
      const rows = (await res.json()) as unknown;
      if (!Array.isArray(rows)) return null;
      return rows.flatMap((r): LeaderboardRow[] => {
        const o = r as Record<string, unknown>;
        if (typeof o?.id !== "string" || typeof o.callsign !== "string" || typeof o.score !== "number") return [];
        return [{ id: o.id, callsign: o.callsign, leadId: String(o.lead_id ?? ""), score: o.score, grade: String(o.grade ?? ""), success: o.success === true, createdAt: String(o.created_at ?? "") }];
      });
    } catch {
      return null;
    }
  }

  return { enabled, publishBlueprint, listBlueprints, submitMission, topMissions };
}

export const registry = createRegistry();
