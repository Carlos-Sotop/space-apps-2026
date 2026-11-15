import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { TopBar } from "@/components/hud/TopBar";
import { Badge, Button, Flag, Icon, MonogramBadge } from "@/components/ui";
import { catalog } from "@/data";
import type { MissionId } from "@/engine/types";
import { countryName, fetchLeaderboard } from "@/lib/leaderboard";
import { getActor } from "@/lib/catalog";
import type { ScoreRow } from "@/leaderboard/types";
import { useGame } from "@/store/game";

const GRADE_COLOR: Record<string, string> = { S: "#fbbf24", A: "var(--ok)", B: "var(--blue-bright)", C: "var(--violet-bright)", F: "var(--over)" };
type Tab = MissionId | "all";

function Row({ row, rank }: { row: ScoreRow; rank: number }) {
  const [open, setOpen] = useState(false);
  const mission = catalog.missions.find((m) => m.id === row.missionId);
  return (
    <li className="glass overflow-hidden">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center gap-3 p-3 text-left sm:gap-4 sm:p-4">
        <span className={`num w-7 shrink-0 text-center text-lg ${rank <= 3 ? "text-tight" : "text-muted"}`}>{rank}</span>
        <span title={countryName(row.country)}><Flag code={row.country} size={28} /></span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">{row.playerName}</span>
            {row.mode === "crew" && <Badge tone="violet">Crew of {row.crewSize}</Badge>}
          </div>
          <div className="truncate text-xs text-muted">{mission?.name} · {row.summary.vehicle} · {row.summary.destination}</div>
        </div>
        <span className="font-display text-2xl" style={{ color: GRADE_COLOR[row.grade] ?? "var(--fg)" }}>{row.grade}</span>
        <span className="num w-10 text-right text-lg">{row.total}</span>
        <Icon name={open ? "minus" : "plus"} size={16} className="shrink-0 text-faint" />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="grid gap-4 border-t border-line p-4 text-sm sm:grid-cols-3">
              <div>
                <div className="mb-2 text-xs uppercase tracking-wider text-faint">Council</div>
                <div className="flex gap-2">
                  {[row.coalition.leadId, ...row.coalition.partnerIds].map((id) => <MonogramBadge key={id} actor={getActor(id)} fallbackName={id} size={32} />)}
                </div>
              </div>
              <div>
                <div className="mb-2 text-xs uppercase tracking-wider text-faint">Score</div>
                <p className="num m-0 text-muted">Flight {row.flightScore} · Operations {row.opsScore ?? "–"}</p>
                <p className="num m-0 text-muted">{row.dataGb.toFixed(0)} Gb returned · {row.success ? "Success" : "Partial or lost"}</p>
              </div>
              <div>
                <div className="mb-2 text-xs uppercase tracking-wider text-faint">Modules</div>
                <p className="m-0 text-muted">{row.summary.modules.slice(0, 6).join(", ")}{row.summary.modules.length > 6 ? "…" : ""}</p>
              </div>
              <p className="num m-0 text-[11px] text-faint sm:col-span-3">Verified by re-running the engine · plan fingerprint {row.manifestHash.slice(0, 12)}…{row.customTech ? " · uses community tech" : ""}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

export default function Leaderboard() {
  const go = useGame((s) => s.go);
  const [tab, setTab] = useState<Tab>("all");
  const [rows, setRows] = useState<ScoreRow[] | null>(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let alive = true;
    setRows(null);
    fetchLeaderboard(tab === "all" ? undefined : tab)
      .then((r) => { if (alive) { setRows(r); setOffline(false); } })
      .catch(() => { if (alive) { setRows([]); setOffline(true); } });
    return () => { alive = false; };
  }, [tab]);

  const tabs: { id: Tab; label: string }[] = [{ id: "all", label: "All missions" }, ...catalog.missions.map((m) => ({ id: m.id as Tab, label: m.name }))];

  return (
    <div className="pb-12">
      <TopBar title="Global leaderboard" onBack={() => go("intro")} backLabel="Back to start" />
      <div className="mx-auto max-w-4xl space-y-4 px-4 sm:px-6" data-coach="leaderboard.list">
        <p className="m-0 text-sm text-muted">Every score is checked: the server replays the mission with the same design, seed and decisions before it counts.</p>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Mission">
          {tabs.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={`rounded-full border px-3 py-1.5 text-sm transition ${tab === t.id ? "border-violet-bright bg-violet/20 text-fg" : "border-line text-muted hover:text-fg"}`}>
              {t.label}
            </button>
          ))}
        </div>
        {rows === null ? (
          <ul className="space-y-2">{[0, 1, 2, 3].map((i) => <li key={i} className="glass h-16 animate-pulse" />)}</ul>
        ) : rows.length ? (
          <ul className="space-y-2">{rows.map((r, i) => <Row key={r.id} row={r} rank={i + 1} />)}</ul>
        ) : (
          <div className="glass grid place-items-center gap-3 p-10 text-center">
            <Icon name="trophy" size={36} className="text-violet-bright" />
            <p className="m-0 text-muted">{offline ? "The leaderboard is offline right now. Your game still works." : "No missions here yet. Be the first."}</p>
            <Button variant="primary" onClick={() => go("missions")}>Fly a mission</Button>
          </div>
        )}
      </div>
    </div>
  );
}
