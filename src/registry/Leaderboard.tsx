import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Icon, MonogramBadge } from "@/components/ui";
import type { FlightResult, MissionDesign } from "@/engine/types";
import { getActor } from "@/lib/catalog";
import { makeCallsign, missionEntry, registry, type LeaderboardRow } from "./client";

interface Props {
  result: FlightResult;
  design: MissionDesign;
  manifestHash?: string;
}

/** Top flights of this mission from the shared registry. Posting is a click, the name is generated, nothing personal is sent. */
export function Leaderboard({ result, design, manifestHash }: Props) {
  const [rows, setRows] = useState<LeaderboardRow[] | null | undefined>(undefined); // undefined = loading, null = offline
  const [callsign] = useState(() => makeCallsign(getActor(design.coalition.leadId)?.shortName ?? "crew"));
  const [state, setState] = useState<"idle" | "posting" | "posted" | "failed">("idle");

  const load = useCallback(async () => setRows(await registry.topMissions(design.missionId, 10)), [design.missionId]);
  useEffect(() => { void load(); }, [load]);

  const post = async () => {
    setState("posting");
    const ok = await registry.submitMission(missionEntry(result, design, callsign, manifestHash));
    setState(ok ? "posted" : "failed");
    if (ok) await load();
  };

  const offline = !registry.enabled || rows === null;

  return (
    <div className="glass p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-sm">Leaderboard</h2>
        {!offline && (
          state === "posted"
            ? <Badge tone="ok"><Icon name="check" size={12} /> Posted as <span className="num">{callsign}</span></Badge>
            : <Button size="sm" onClick={post} disabled={state === "posting"}>{state === "posting" ? "Posting..." : <>Post my score as <span className="num">{callsign}</span></>}</Button>
        )}
      </div>
      {offline ? (
        <p className="text-sm text-muted">Leaderboard offline. Your result stays on this device.</p>
      ) : rows === undefined ? (
        <p className="text-sm text-muted" aria-live="polite">Loading...</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted">No flights posted for this mission yet. Be the first.</p>
      ) : (
        <ol className="space-y-1.5">
          {rows.map((r, i) => {
            const mine = state === "posted" && r.callsign === callsign;
            return (
              <li key={r.id} className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-sm ${mine ? "border-violet-bright/60 bg-violet-bright/10" : "border-line"}`}>
                <span className="num w-5 text-right text-xs text-faint">{i + 1}</span>
                <MonogramBadge actor={getActor(r.leadId)} fallbackName={r.leadId} size={24} showFlag={false} />
                <span className="num min-w-0 flex-1 truncate">{r.callsign}</span>
                {!r.success && <Badge tone="tight">Partial or lost</Badge>}
                <Badge>Grade {r.grade}</Badge>
                <span className="num w-14 text-right">{r.score}</span>
              </li>
            );
          })}
        </ol>
      )}
      {state === "failed" && <p className="mt-3 text-xs text-over" role="status">Could not post the score. Try again in a moment.</p>}
    </div>
  );
}
