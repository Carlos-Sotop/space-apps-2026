import { catalog } from "../src/data/index.ts";
import type { ScoreRow, ScoreSubmission } from "../src/leaderboard/types.ts";
import { verifySubmission } from "../src/leaderboard/verify.ts";

export interface ScoresEnv {
  SUPABASE_URL?: string;
  SUPABASE_SECRET_KEY?: string;
}

const MAX_BODY = 512 * 1024;
const MISSIONS = new Set(["orbital-lab", "earth-guardian", "moon-base-zero"]);
const COLUMNS = "id,created_at,mission_id,player_name,country,mode,crew_size,total,flight_score,ops_score,grade,success,data_gb,coalition,summary,manifest_hash,custom_tech";

type DbRow = {
  id: string; created_at: string; mission_id: ScoreRow["missionId"]; player_name: string; country: string | null; mode: "solo" | "crew"; crew_size: number;
  total: number; flight_score: number; ops_score: number | null; grade: string; success: boolean; data_gb: number;
  coalition: ScoreRow["coalition"]; summary: ScoreRow["summary"]; manifest_hash: string; custom_tech: boolean;
};

const toRow = (r: DbRow): ScoreRow => ({
  id: r.id, createdAt: r.created_at, missionId: r.mission_id, playerName: r.player_name, country: r.country, mode: r.mode, crewSize: r.crew_size,
  total: r.total, flightScore: r.flight_score, opsScore: r.ops_score, grade: r.grade, success: r.success, dataGb: r.data_gb,
  coalition: r.coalition, summary: r.summary, manifestHash: r.manifest_hash, customTech: r.custom_tech,
});

const reply = (body: unknown, status = 200, cacheS = 0) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": cacheS ? `public, max-age=${cacheS}` : "no-store" },
  });

function db(env: ScoresEnv, path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("apikey", env.SUPABASE_SECRET_KEY!);
  headers.set("content-type", "application/json");
  return fetch(`${env.SUPABASE_URL!.replace(/\/$/, "")}/rest/v1/${path}`, { ...init, headers, signal: AbortSignal.timeout(8000) });
}

/** GET /api/scores?mission=&limit= : the public ranking. POST /api/scores : replay, then store. */
export async function handleScores(request: Request, env: ScoresEnv): Promise<Response> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) return reply({ error: "ranking offline" }, 503);
  const url = new URL(request.url);

  if (request.method === "GET") {
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 50));
    const mission = url.searchParams.get("mission");
    const filter = mission && MISSIONS.has(mission) ? `&mission_id=eq.${mission}` : "";
    const res = await db(env, `scores?select=${COLUMNS}${filter}&order=total.desc,created_at.asc&limit=${limit}`);
    if (!res.ok) return reply({ error: "ranking unavailable" }, 502);
    return reply({ items: ((await res.json()) as DbRow[]).map(toRow) }, 200, 20);
  }

  if (request.method === "POST") {
    const len = Number(request.headers.get("content-length") ?? 0);
    if (len > MAX_BODY) return reply({ error: "too large" }, 413);
    let sub: ScoreSubmission;
    try {
      const text = await request.text();
      if (text.length > MAX_BODY) return reply({ error: "too large" }, 413);
      sub = JSON.parse(text) as ScoreSubmission;
    } catch {
      return reply({ error: "bad json" }, 400);
    }
    const v = verifySubmission(sub, catalog);
    if (!v.ok) return reply({ error: v.error }, 422);

    const ins = await db(env, `scores?select=${COLUMNS}`, { method: "POST", headers: { prefer: "return=representation" }, body: JSON.stringify(v.row) });
    if (!ins.ok) return reply({ error: "could not save" }, 502);
    const [saved] = (await ins.json()) as DbRow[];
    const rankRes = await db(env, `scores?select=id&mission_id=eq.${saved.mission_id}&total=gt.${saved.total}`, { method: "HEAD", headers: { prefer: "count=exact" } });
    const above = Number(rankRes.headers.get("content-range")?.split("/")[1] ?? NaN);
    return reply({ row: toRow(saved), rank: Number.isFinite(above) ? above + 1 : 0 }, 201);
  }

  return reply({ error: "method not allowed" }, 405);
}
