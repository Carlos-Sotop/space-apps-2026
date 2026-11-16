import { lazy, Suspense, useCallback, useMemo, useState } from "react";
import { AnimatePresence } from "motion/react";
import { TopBar } from "@/components/hud/TopBar";
import { sfx } from "@/components/audio";
import { Badge, Button, Icon, toast } from "@/components/ui";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { getScenario, opsScore, projectTurn, whyNot, type OpsAction, type OpsGoal, type OpsState, type OpsTurnReport, type OpsWarning, type Tile } from "@/ops";
import { getMission, getModule } from "@/lib/catalog";
import { useCatalog, useGame } from "@/store/game";
import { ActionDock, type DockCard, type DockId } from "./ActionDock";
import { EventCard } from "./EventCard";
import { LossScreen } from "./LossScreen";
import { ResourceBar } from "./ResourceBar";
import { TurnSummary } from "./TurnSummary";
import { Warnings } from "./Warnings";

const HexBoard = lazy(() => import("@/scene/ops/HexBoard"));

/** What the player is about to do with the next tile click. */
type Pending =
  | { kind: "deploy"; moduleId: string; label: string }
  | { kind: "build"; build: string; label: string }
  | { kind: "move"; structureId: string; label: string }
  | { kind: "scout"; label: string };

function toAction(p: Pending, tileId: string): OpsAction {
  switch (p.kind) {
    case "deploy": return { type: "deploy", moduleId: p.moduleId, tileId };
    case "build": return { type: "build", kind: p.build, tileId };
    case "move": return { type: "move", structureId: p.structureId, tileId };
    case "scout": return { type: "scout", tileId };
  }
}

const pct = (x: number) => `${Math.round(x * 100)}%`;
function EnvStrip({ s, turnLabel }: { s: OpsState; turnLabel: string }) {
  const link = s.missionId === "orbital-lab" ? "Relay" : s.missionId === "earth-guardian" ? "Ground" : "DSN";
  const items = [s.env, ...s.forecast];
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1" aria-label="Forecast">
      {items.map((e, i) => (
        <div key={e.turn} className={`min-w-[64px] flex-1 rounded-xl border p-2 text-center text-[11px] ${i === 0 ? "border-violet-bright/60 bg-violet/10" : "border-line bg-white/[0.02]"}`}>
          <div className="text-faint">{i === 0 ? "Now" : `${turnLabel} ${e.turn}`}</div>
          <div className="mt-1 flex justify-center gap-1.5">
            <span title={`Sun ${pct(e.sunFactor)}`} style={{ color: e.sunFactor > 0.6 ? "#fbbf24" : e.sunFactor > 0.25 ? "#a16207" : "#475569" }}><Icon name="sun" size={14} /></span>
            <span title={e.earthUp ? "Earth in view" : "Earth below the horizon"} style={{ color: e.earthUp ? "#60a5fa" : "#334155" }}><Icon name="earth" size={14} /></span>
            {e.storm && <span title={e.storm.note} className="text-over"><Icon name="storm" size={14} /></span>}
          </div>
          <div className="num mt-0.5 text-faint" title="Share of the downlink network free for us">{link} {pct(e.dsnFactor)}</div>
        </div>
      ))}
    </div>
  );
}

function Quests({ goals }: { goals: OpsGoal[] }) {
  const main = goals.filter((g) => g.kind === "main").sort((a, b) => (a.step ?? 0) - (b.step ?? 0));
  const current = main.find((g) => !g.done);
  const side = goals.filter((g) => g.kind === "side");
  const disc = goals.filter((g) => g.kind === "discovery");
  const line = (g: OpsGoal, locked = false) => (
    <li key={g.id} className={`flex items-start gap-2 text-sm ${locked ? "opacity-40" : ""}`}>
      <span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border ${g.done ? "border-ok bg-ok/20 text-ok" : "border-line"}`}>{g.done && <Icon name="check" size={11} />}</span>
      <span className="min-w-0 flex-1">
        <span className={g.done ? "text-muted line-through" : ""}>{g.hidden && !g.done ? "Undiscovered: scout to find it" : g.title}</span>
        {!g.done && !g.hidden && g.target > 0 && (
          <span className="mt-1 block h-1 overflow-hidden rounded-full bg-white/10"><span className="block h-full rounded-full bg-brand" style={{ width: `${Math.min(100, (g.progress / g.target) * 100)}%` }} /></span>
        )}
      </span>
      <span className="num shrink-0 text-[11px] text-faint">+{g.points}</span>
    </li>
  );
  return (
    <div className="space-y-3">
      <div>
        <div className="mb-1.5 text-[11px] uppercase tracking-wider text-violet-bright">Main quest</div>
        <ol className="space-y-1.5">{main.map((g) => line(g, !g.done && g !== current))}</ol>
      </div>
      {side.length > 0 && (
        <div>
          <div className="mb-1.5 text-[11px] uppercase tracking-wider text-blue-bright">Side quests</div>
          <ul className="space-y-1.5">{side.map((g) => line(g))}</ul>
        </div>
      )}
      {disc.length > 0 && (
        <div>
          <div className="mb-1.5 text-[11px] uppercase tracking-wider text-tight">Discoveries</div>
          <ul className="space-y-1.5">{disc.map((g) => line(g))}</ul>
        </div>
      )}
    </div>
  );
}

const fixTray = (fix: string): DockId => {
  const f = fix.toLowerCase();
  if (/research|unlock/.test(f)) return "research";
  if (/scout|explore/.test(f)) return "scout";
  if (/deploy|place|move|cargo/.test(f)) return "deploy";
  return "build";
};

export default function OpsScreen() {
  const ops = useGame((s) => s.ops);
  const design = useGame((s) => s.design);
  const opsAct = useGame((s) => s.opsAct);
  const finishOps = useGame((s) => s.finishOps);
  const catalog = useCatalog();
  const [pending, setPending] = useState<Pending | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [tray, setTray] = useState<DockId | null>(null);
  const [dismissedTurn, setDismissedTurn] = useState(0);
  const closeSummary = useCallback(() => setDismissedTurn(useGame.getState().ops?.lastReport?.turn ?? 0), []);

  const ctx = useMemo(() => (design ? { design, catalog } : null), [design, catalog]);
  const sc = useMemo(() => (ops ? getScenario(ops.missionId) : null), [ops?.missionId]); // eslint-disable-line react-hooks/exhaustive-deps

  const validIds = useMemo(() => {
    if (!ops || !ctx || !pending) return [];
    return ops.tiles.filter((t) => whyNot(ops, toAction(pending, t.id), ctx) === null).map((t) => t.id);
  }, [ops, ctx, pending]);

  // Preview of the next turn. Fails soft: while the engine projection is a stub or throws, the deltas stay hidden.
  const projection = useMemo((): OpsTurnReport | null => {
    if (!ops || !ctx || ops.status !== "running") return null;
    try { return projectTurn(ops, ctx); } catch { return null; }
  }, [ops, ctx]);

  if (!ops || !design || !ctx || !sc) return <div className="grid min-h-[60vh] place-items-center"><Button onClick={() => useGame.getState().go("debrief")}>Go to debrief</Button></div>;

  const mission = getMission(ops.missionId);
  const act = (a: OpsAction) => {
    const reason = whyNot(ops, a, ctx);
    if (reason) { toast(reason, "warn"); sfx("error"); return false; }
    sfx(a.type === "advance" ? "turn" : "confirm");
    opsAct(a);
    return true;
  };

  const onTile = (t: Tile) => {
    if (pending) {
      if (act(toAction(pending, t.id))) setPending(null);
      return;
    }
    setTray(null);
    setSelected(t.id === selected ? null : t.id);
  };

  /** What the pending action would put on the tile, so the board can preview it. */
  const ghostKind =
    pending?.kind === "build" ? pending.build
    : pending?.kind === "deploy" ? ops.inventory.find((it) => it.moduleId === pending.moduleId)?.kind ?? null
    : pending?.kind === "move" ? ops.structures.find((st) => st.id === pending.structureId)?.kind ?? null
    : null;

  const selTile = ops.tiles.find((t) => t.id === selected) ?? null;
  const selStructs = ops.structures.filter((st) => st.tileId === selected);
  const defOf = (kind: string) => sc.structures.find((d) => d.kind === kind);
  const nameOf = (id: string) => {
    const st = ops.structures.find((x) => x.id === id);
    return st ? (st.moduleId ? getModule(st.moduleId)?.name : undefined) ?? defOf(st.kind)?.label ?? id : id;
  };
  const ended = ops.status !== "running";
  const lost = ops.status === "lost";
  const score = opsScore(ops);
  const buildables = sc.structures.filter((d) => d.buildCost && (!d.lockedUntilResearch || ops.research.some((r) => r.unlocked && sc.research.find((x) => x.id === r.id)?.effect.unlockBuild === d.kind)));
  const scoutTrait = sc.scout.needsTrait ?? "rover";
  const rover = ops.structures.find((st) => defOf(st.kind)?.traits.includes(scoutTrait));
  const noAp = ops.ap < 1;
  const mainGoal = ops.goals.filter((g) => g.kind === "main").sort((a, b) => (a.step ?? 0) - (b.step ?? 0)).find((g) => !g.done);

  const cards: DockCard[] = [
    { id: "deploy", icon: "landing", label: "Deploy", cost: "1 AP", badge: ops.inventory.length, reason: ended ? "Over" : ops.inventory.length === 0 ? "Nothing to place" : noAp ? "No actions left" : null },
    { id: "build", icon: "build", label: "Build", cost: buildables.length ? `${Math.min(...buildables.map((d) => d.buildCost!.ap))}+ AP` : "AP", reason: ended ? "Over" : buildables.length === 0 ? "Research first" : buildables.every((d) => d.buildCost!.ap > ops.ap) ? "No actions left" : null },
    { id: "research", icon: "science", label: "Research", cost: "1 AP", reason: ended ? "Over" : ops.research.every((r) => r.unlocked) ? "All done" : noAp ? "No actions left" : null },
    { id: "scout", icon: "globe", label: "Scout", cost: "1 AP", reason: ended ? "Over" : !rover ? `Needs a ${scoutTrait}` : noAp ? "No actions left" : null },
  ];

  const pick = (id: DockId) => {
    sfx("click");
    setSelected(null);
    if (id === "scout") { setTray(null); setPending({ kind: "scout", label: sc.scout.label }); return; }
    setPending(null);
    setTray((t) => (t === id ? null : id));
  };
  const place = (p: Pending) => { setTray(null); setPending(p); };

  const itemCls = "w-full rounded-xl border border-line bg-white/[0.03] p-2.5 text-left transition hover:border-cyan/60 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-line";
  const trayBody = tray === "deploy" ? (
    <ul className="grid gap-1.5 sm:grid-cols-2">
      {ops.inventory.map((it) => {
        const d = defOf(it.kind);
        const name = getModule(it.moduleId)?.name ?? d?.label ?? it.kind;
        return (
          <li key={it.moduleId}>
            <button type="button" disabled={ended || noAp} onClick={() => place({ kind: "deploy", moduleId: it.moduleId, label: `Place ${name}` })} className={itemCls}>
              <div className="text-sm">{name}</div>
              <div className="text-xs text-muted">{d?.blurb}</div>
            </button>
          </li>
        );
      })}
    </ul>
  ) : tray === "build" ? (
    <ul className="grid gap-1.5 sm:grid-cols-2">
      {buildables.map((d) => {
        const cost = d.buildCost!;
        const why = cost.ap > ops.ap ? `Needs ${cost.ap} AP` : (cost.waterKg ?? 0) > ops.waterKg ? `Needs ${cost.waterKg} ${sc.consumable.unit}` : null;
        return (
          <li key={d.kind}>
            <button type="button" disabled={ended || why !== null} onClick={() => place({ kind: "build", build: d.kind, label: `Build ${d.label}` })} className={itemCls}>
              <div className="flex justify-between text-sm"><span>{d.label}</span><span className="num text-xs text-faint">{cost.ap} AP{cost.waterKg ? ` · ${cost.waterKg} ${sc.consumable.unit}` : ""}</span></div>
              <div className="text-xs text-muted">{d.blurb}</div>
              {why && <div className="mt-0.5 text-xs text-tight">{why}</div>}
            </button>
          </li>
        );
      })}
    </ul>
  ) : tray === "research" ? (
    <ul className="grid gap-1.5 sm:grid-cols-2">
      {ops.research.map((r) => {
        const why = r.unlocked ? null : whyNot(ops, { type: "research", id: r.id }, ctx);
        return (
          <li key={r.id}>
            <button type="button" disabled={r.unlocked || ended || why !== null} onClick={() => act({ type: "research", id: r.id })} className={`${itemCls} ${r.unlocked ? "!border-ok/50 !bg-ok/10 !opacity-100" : ""}`}>
              <div className="flex justify-between text-sm"><span className="inline-flex items-center gap-1">{r.unlocked && <Icon name="check" size={14} className="text-ok" />}{r.title}</span><span className="num text-xs text-faint">{r.cost} pts</span></div>
              <div className="text-xs text-muted">{r.blurb}</div>
              {why && <div className="mt-0.5 text-xs text-tight">{why}</div>}
            </button>
          </li>
        );
      })}
    </ul>
  ) : null;

  const warnings: OpsWarning[] = [...(projection?.warnings ?? []), ...(ops.lastReport?.warnings ?? [])].filter((w, i, all) => all.findIndex((x) => x.id === w.id) === i);
  const onFix = (w: OpsWarning) => {
    if (!w.fix) return;
    const id = fixTray(w.fix);
    if (id === "scout" && !rover) { toast(w.fix, "warn"); return; }
    pick(id);
  };

  const report = ops.lastReport;
  const showSummary = !!report && report.turn !== dismissedTurn && !ops.pendingEvent && !lost;

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <TopBar
        title={`${mission?.name ?? ""} · ${sc.title}`}
        right={<Badge tone="violet">{sc.turnLabel} {Math.min(ops.turn, ops.maxTurns)}/{ops.maxTurns}</Badge>}
      />
      <ResourceBar ops={ops} consumable={sc.consumable} delta={projection?.delta ?? null} />
      <div className="grid flex-1 gap-0 lg:grid-cols-[1fr_380px]">
        <div className="flex min-w-0 flex-col">
          <div className="relative h-[46dvh] min-h-[300px] lg:h-auto lg:flex-1">
            <ErrorBoundary fallback={<div className="grid h-full place-items-center text-muted">3D view unavailable</div>}>
              <Suspense fallback={<div className="grid h-full place-items-center text-muted">Loading the site…</div>}>
                <HexBoard
                  theme={ops.missionId === "moon-base-zero" ? "moon" : ops.missionId === "orbital-lab" ? "station" : "earth"}
                  tiles={ops.tiles}
                  terrains={sc.terrains}
                  structures={ops.structures}
                  sunFactor={ops.env.sunFactor}
                  earthUp={ops.env.earthUp}
                  validTileIds={validIds}
                  selectedTileId={selected}
                  onTileClick={onTile}
                  report={ops.lastReport}
                  scenario={sc}
                  ghostKind={ghostKind}
                />
              </Suspense>
            </ErrorBoundary>
            <div className="pointer-events-none absolute inset-x-3 top-3 flex flex-col items-start gap-2">
              <div className="glass pointer-events-auto flex max-w-full items-center gap-2 px-3 py-2 text-sm" data-coach="ops.objective">
                <Icon name="rocket" size={16} className="shrink-0 text-cyan" />
                <span className="text-[11px] uppercase tracking-wider text-cyan">Next objective</span>
                <span className="min-w-0 truncate">{mainGoal ? mainGoal.title : "All main objectives done"}</span>
                {mainGoal && mainGoal.target > 0 && <span className="num shrink-0 text-xs text-muted">{Math.round(mainGoal.progress)}/{mainGoal.target} {mainGoal.unit}</span>}
              </div>
              {pending && (
                <div className="pointer-events-auto glass flex items-center gap-2 px-3 py-2 text-sm">
                  <Icon name="sparkle" size={14} className="text-cyan" /> {pending.label}: pick a glowing tile
                  <button type="button" className="ml-1 text-muted hover:text-fg" onClick={() => setPending(null)} aria-label="Cancel"><Icon name="x" size={14} /></button>
                </div>
              )}
              {ops.env.storm && <div className="glass px-3 py-2 text-sm text-over"><Icon name="storm" size={16} className="mr-1.5 inline align-text-bottom" />{ops.env.storm.note}</div>}
              <AnimatePresence>
                {showSummary && report && <TurnSummary key={report.turn} report={report} turnLabel={sc.turnLabel} nameOf={nameOf} goals={ops.goals} onClose={closeSummary} />}
              </AnimatePresence>
            </div>
            {selTile && !pending && !tray && (
              <div className="glass absolute inset-x-3 bottom-3 p-3 text-sm sm:right-auto sm:max-w-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium">{selTile.label ?? sc.terrains.find((t) => t.id === selTile.terrain)?.label}</div>
                  <button type="button" onClick={() => setSelected(null)} aria-label="Close" className="text-muted hover:text-fg"><Icon name="x" size={14} /></button>
                </div>
                <div className="text-xs text-muted">{sc.terrains.find((t) => t.id === selTile.terrain)?.blurb}</div>
                <div className="num mt-1 text-[11px] text-faint">Sun {pct(selTile.sun)} · Earth view {selTile.earthView >= 0 ? "+" : ""}{pct(selTile.earthView)}{selTile.iceKgPerTurn > 0 ? ` · ice ${selTile.iceKgPerTurn} kg/turn` : ""}</div>
                {selTile.liveEvent && <a className="mt-1 block text-xs text-cyan hover:underline" href={selTile.liveEvent.source.url} target="_blank" rel="noreferrer"><Icon name="dot" size={12} className="mr-1 inline align-text-bottom" />Live: {selTile.liveEvent.title}</a>}
                {selStructs.map((st) => {
                  const d = defOf(st.kind);
                  return (
                    <div key={st.id} className="mt-2 flex flex-wrap items-center gap-2 border-t border-line pt-2">
                      <span className="min-w-0 flex-1 truncate">{nameOf(st.id)} <span className="num text-faint">{Math.round(st.health)}%</span></span>
                      {st.kind !== sc.hubKind && <Button size="sm" onClick={() => act({ type: "toggle", structureId: st.id })}>{st.on ? "Switch off" : "Switch on"}</Button>}
                      {st.health < 100 && <Button size="sm" onClick={() => act({ type: "repair", structureId: st.id })}>Repair</Button>}
                      {d?.move && <Button size="sm" onClick={() => setPending({ kind: "move", structureId: st.id, label: `Move ${d.label}` })}>Move</Button>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <ActionDock
            cards={cards}
            open={tray}
            onPick={pick}
            tray={trayBody}
            end={ended ? (
              <Button variant="primary" className="h-auto w-full !whitespace-normal" onClick={finishOps}>Debrief <Icon name="arrow" size={16} /></Button>
            ) : (
              <Button variant="primary" className="h-auto w-full !whitespace-normal" disabled={!!ops.pendingEvent} onClick={() => act({ type: "advance" })} data-coach="ops.advance">
                <Icon name="play" size={15} /> {sc.turnLabel === "Turn" ? "Next turn" : `Next ${sc.turnLabel.toLowerCase()}`}
              </Button>
            )}
          />
        </div>

        <aside className="space-y-4 border-l border-line bg-bg/70 p-4 backdrop-blur-xl">
          {ended && !lost && (
            <div className="space-y-1 rounded-xl border border-ok/40 bg-ok/10 p-3 text-sm text-ok">
              Operations complete. <span className="num">Score {score.total} ({score.grade})</span>
            </div>
          )}
          <EnvStrip s={ops} turnLabel={sc.turnLabel} />
          <Warnings warnings={warnings} onFix={onFix} />
          <Quests goals={ops.goals} />
          <details className="group">
            <summary className="cursor-pointer text-[11px] uppercase tracking-wider text-muted hover:text-fg">Mission log ({ops.log.length})</summary>
            <ul className="mt-2 max-h-64 space-y-1.5 overflow-y-auto text-xs">
              {[...ops.log].reverse().map((l, i) => (
                <li key={i} className="flex gap-2">
                  <span className="num shrink-0 text-faint">{l.turn}</span>
                  <span className={l.kind === "failure" ? "text-over" : l.kind === "warning" ? "text-tight" : l.kind === "success" ? "text-ok" : "text-muted"}>
                    {l.text}{l.liveSource && <> · <a href={l.liveSource.url} target="_blank" rel="noreferrer" className="underline">{l.liveSource.title}</a></>}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        </aside>
      </div>

      <AnimatePresence>
        {ops.pendingEvent && (
          <EventCard card={ops.pendingEvent} turn={ops.turn} turnLabel={sc.turnLabel} onChoose={(optionId) => act({ type: "choose", eventId: ops.pendingEvent!.id, optionId })} />
        )}
      </AnimatePresence>
      {lost && <LossScreen ops={ops} onRetry={() => { void useGame.getState().afterFlight(); }} onRedesign={() => useGame.getState().go("control")} onDebrief={finishOps} />}
    </div>
  );
}
