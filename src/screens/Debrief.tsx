import { useState } from "react";
import { motion } from "motion/react";
import { TopBar } from "@/components/hud/TopBar";
import { Badge, Button, Icon, MonogramBadge, toast } from "@/components/ui";
import type { Blueprint, ModuleCategory } from "@/engine/types";
import { getActor, getBlueprint, getMission, getModule } from "@/lib/catalog";
import { Leaderboard } from "@/registry/Leaderboard";
import { registry } from "@/registry/client";
import { fmtGb } from "@/lib/format";
import { ChainReceipt } from "@/chain";
import { useGame } from "@/store/game";
import { MarketSettlement } from "@/screens/control/MarketPanel";

const GRADE_COLOR: Record<string, string> = { S: "#fbbf24", A: "var(--ok)", B: "var(--blue-bright)", C: "var(--violet-bright)", F: "var(--over)" };
const short = (h: string) => `${h.slice(0, 8)}…${h.slice(-4)}`;

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm"><span>{label}</span><span className="num text-muted">{Math.round(value)}</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <motion.div className="h-full rounded-full bg-brand" initial={{ width: 0 }} animate={{ width: `${Math.min(100, value)}%` }} transition={{ duration: 0.8, ease: "easeOut" }} />
      </div>
    </div>
  );
}

export default function Debrief() {
  const { result, design, ratification, published, go, fly, newMission, publish } = useGame();
  const mission = design ? getMission(design.missionId) : undefined;
  const [done, setDone] = useState(false);

  if (!result || !design || !mission) return <div className="grid min-h-[60vh] place-items-center"><Button variant="primary" onClick={() => go("missions")}>Choose a mission</Button></div>;

  const objectives = [mission.primaryObjective, ...mission.secondaryObjectives.filter((o) => design.secondaryObjectiveIds.includes(o.id))];
  const grade = result.score.grade;

  const onPublish = async () => {
    const { manifestHash } = await import("@/crypto");
    const parent = [...design.blueprintIds].reverse().map(getBlueprint).find((b) => !!b);
    const flown = design.moduleIds.map(getModule).filter((m) => !!m).sort((a, b) => b!.massKg - a!.massKg);
    const category: ModuleCategory = parent?.category ?? flown[0]?.category ?? "bus";
    const bp: Blueprint = {
      id: `bp-player-${Date.now().toString(36)}`,
      name: `${mission.name} design`,
      authorId: design.coalition.leadId,
      parentId: parent?.id ?? null,
      category,
      modifiers: parent ? parent.modifiers : [{ stat: "moduleMass", op: "mul", value: 0.97, scope: { category } }],
      summary: parent ? `Forked from ${parent.name}` : "Lighter parts from a flown mission",
      contentHash: manifestHash(design),
      adoptions: 0,
    };
    publish(bp);
    setDone(true);
    const shared = await registry.publishBlueprint(bp);
    toast(shared ? "Published to the shared Open Tech Registry" : "Saved on this device (shared registry not available)", "ok");
  };

  return (
    <div className="pb-12">
      <TopBar title="Debrief" right={<Badge>{mission.name}</Badge>} />
      <div className="mx-auto max-w-5xl space-y-5 px-4 sm:px-6">
        <div className="glass grid items-center gap-6 p-5 sm:grid-cols-[auto_1fr] sm:p-6">
          <div className="text-center">
            <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="font-display text-[72px] leading-none sm:text-[120px]" style={{ color: GRADE_COLOR[grade] ?? "var(--fg)", textShadow: `0 0 40px ${GRADE_COLOR[grade] ?? "#fff"}` }}>{grade}</motion.div>
            <div className="num text-sm text-muted">{result.score.total} points</div>
            <Badge tone={result.lostAt ? "over" : result.success ? "ok" : "tight"} className="mt-2">{result.lostAt ? "Lost" : result.success ? "Success" : "Partial"}</Badge>
          </div>
          <div className="space-y-3">
            <ScoreBar label="Science" value={result.score.science} />
            <ScoreBar label="Safety" value={result.score.safety} />
            <ScoreBar label="Efficiency" value={result.score.efficiency} />
            <ScoreBar label="Collaboration" value={result.score.collaboration} />
            <p className="num pt-1 text-xs text-muted">{fmtGb(result.dataReturnedGb)} of data returned to Earth</p>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="glass p-5">
            <h2 className="font-display mb-3 text-sm">Objectives</h2>
            <ul className="space-y-2">
              {objectives.map((o) => {
                const met = result.objectivesMet.includes(o.id);
                return <li key={o.id} className="flex items-center gap-2.5 text-sm"><span className={met ? "text-ok" : "text-over"}><Icon name={met ? "check" : "x"} size={16} /></span><span className={met ? "" : "text-muted"}>{o.title}</span></li>;
              })}
            </ul>
          </div>
          <div className="glass p-5">
            <h2 className="font-display mb-3 text-sm">Why it went this way</h2>
            <ul className="space-y-2 text-sm text-fg/90">
              {result.lessons.map((l, i) => <li key={i} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-bright" />{l}</li>)}
            </ul>
          </div>
        </div>

        <div className="glass p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-sm">Council signatures</h2>
            {ratification?.signatures.every((s) => s.postQuantum) && <Badge tone="violet"><Icon name="shield" size={12} /> Quantum-safe</Badge>}
          </div>
          {ratification ? (
            <div className="space-y-3">
              <p className="num text-xs text-muted">Manifest SHA-256 <span className="text-fg">{short(ratification.manifestHash)}</span></p>
              <ChainReceipt design={design} ratification={ratification} />
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {ratification.signatures.map((s) => (
                  <li key={s.actorId} className="flex items-center gap-2.5 rounded-xl border border-line p-2.5">
                    <MonogramBadge actor={getActor(s.actorId)} fallbackName={s.actorId} size={30} showFlag={false} />
                    <div className="num min-w-0 text-[10.5px] text-muted"><div className="truncate text-xs text-fg">{getActor(s.actorId)?.shortName ?? s.actorId}</div>{short(s.classical.signature)}</div>
                  </li>
                ))}
              </ul>
            </div>
          ) : <p className="text-sm text-muted">This flight was not signed by the council.</p>}
        </div>

        <MarketSettlement />

        <Leaderboard key={result.seed} result={result} design={design} manifestHash={ratification?.manifestHash} />

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" className="h-auto min-h-10 max-w-full !whitespace-normal py-2 text-left" onClick={onPublish} disabled={done}>{done ? <><Icon name="check" size={16} /> Published ({published.length})</> : <><Icon name="fork" size={16} /> Publish your design to the Open Tech Registry</>}</Button>
          <Button onClick={fly}>Fly again</Button>
          <Button onClick={() => go("control")}>Redesign</Button>
          <Button onClick={newMission}>New mission</Button>
        </div>
      </div>
    </div>
  );
}
