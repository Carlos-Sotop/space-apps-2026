import type { MissionId } from "@/engine/types";
import type { ScoreRow, ScoreSubmission } from "@/leaderboard/types";

export async function fetchLeaderboard(missionId?: MissionId, limit = 50): Promise<ScoreRow[]> {
  const q = new URLSearchParams({ limit: String(limit) });
  if (missionId) q.set("mission", missionId);
  const res = await fetch(`/api/scores?${q}`, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(String(res.status));
  const body = (await res.json()) as { items: ScoreRow[] };
  return body.items;
}

export async function submitScore(sub: ScoreSubmission): Promise<{ row: ScoreRow; rank: number }> {
  const res = await fetch("/api/scores", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(sub),
    signal: AbortSignal.timeout(15000),
  });
  const body = (await res.json().catch(() => ({}))) as { row?: ScoreRow; rank?: number; error?: string };
  if (!res.ok || !body.row) throw new Error(body.error ?? `HTTP ${res.status}`);
  return { row: body.row, rank: body.rank ?? 0 };
}

/** ISO alpha-2 → flag emoji; "INT" → globe. */
export function countryFlag(code: string | null): string {
  if (!code || code === "INT") return "🌐";
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

const regionNames = (() => {
  try { return new Intl.DisplayNames(["en"], { type: "region" }); } catch { return null; }
})();

export function countryName(code: string | null): string {
  if (!code || code === "INT") return "International";
  return regionNames?.of(code) ?? code;
}

const NOT_COUNTRIES = new Set(["EU", "EZ", "UN", "QO", "ZZ", "XA", "XB", "XK", "AC", "CP", "DG", "EA", "IC", "TA"]);

/** Every region the browser can name, sorted by name, with International first. */
export function countryOptions(): { code: string; name: string }[] {
  const out: { code: string; name: string }[] = [];
  const A = 65;
  for (let i = 0; i < 26; i++) {
    for (let j = 0; j < 26; j++) {
      const code = String.fromCharCode(A + i, A + j);
      if (NOT_COUNTRIES.has(code)) continue;
      const name = regionNames?.of(code);
      if (name && name !== code) out.push({ code, name });
    }
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  return [{ code: "INT", name: "International team" }, ...out];
}
