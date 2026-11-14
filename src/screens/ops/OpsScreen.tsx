import { lazy, Suspense, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { TopBar } from "@/components/hud/TopBar";
import { Badge, Button, Icon, toast } from "@/components/ui";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { getScenario, opsScore, whyNot, DAYS_PER_TURN, type OpsAction, type OpsGoal, type OpsState, type Tile } from "@/ops";
import { getMission, getModule } from "@/lib/catalog";
import { fmtGb } from "@/lib/format";
import { useCatalog, useGame } from "@/store/game";

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
const fmtKwh = (wh: number) => (wh >= 10000 ? `${(wh / 1000).toFixed(0)} kWh` : `${(wh / 1000).toFixed(1)} kWh`);

function Meter({ label, value, max, color, text }: { label: string; value: number; max: number; color: string; text: string }) {
  const w = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs"><span className="text-muted">{label}</span><span className="num">{text}</span></div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10"><motion.div className="h-full rounded-full" style={{ background: color }} animate={{ width: `${w}%` }} transition={{ duration: 0.5 }} /></div>
    </div>
  );
}

function EnvStrip({ s, turnLabel }: { s: OpsState; turnLabel: string }) {
  const link = s.missionId === "orbital-lab" ? "Relay" : s.missionId === "earth-guardian" ? "Ground" : "DSN";
  const items = [s.env, ...s.forecast];
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1" aria-label="Forecast">
      {items.map((e, i) => (
        <div key={e.turn} className={`min-w-[64px] flex-1 rounded-xl border p-2 text-center text-[11px] ${i === 0 ? "border-violet-bright/60 bg-violet/10" : "border-line bg-white/[0.02]"}`}>
          <div className="text-faint">{i === 0 ? "Now" : `${turnLabel} ${e.turn}`}</div>
          <div className="mt-1 flex justify-center gap-1.5">
            <span title={`Sun ${pct(e.sunFactor)}`} style={{ color: e.sunFactor > 0.6 ? "#fbbf24" : e.sunFactor > 0.25 ? "#a16207" : "#475569" }}>☀</span>
            <span title={e.earthUp ? "Earth in view" : "Earth below the horizon"} style={{ color: e.earthUp ? "#60a5fa" : "#334155" }}>◐</span>
            {e.storm && <span title={e.storm.note} className="text-over">⚡</span>}
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

type Tab = "deploy" | "build" | "research" | "log";

export default function OpsScreen() {
  const ops = useGame((s) => s.ops);
  const design = useGame((s) => s.design);
  const opsAct = useGame((s) => s.opsAct);
  const finishOps = useGame((s) => s.finishOps);
  const catalog = useCatalog();
  const [pending, setPending] = useState<Pending | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("deploy");

  const ctx = useMemo(() => (design ? { design, catalog } : null), [design, catalog]);
  const sc = useMemo(() => (ops ? getScenario(ops.missionId) : null), [ops]);

  const validIds = useMemo(() => {
    if (!ops || !ctx || !pending) return [];
    return ops.tiles.filter((t) => whyNot(ops, toAction(pending, t.id), ctx) === null).map((t) => t.id);
  }, [ops, ctx, pending]);

  if (!ops || !design || !ctx || !sc) return <div className="grid min-h-[60vh] place-items-center"><Button onClick={() => useGame.getState().go("debrief")}>Go to debrief</Button></div>;

  const mission = getMission(ops.missionId);
  const act = (a: OpsAction) => {
    const reason = whyNot(ops, a, ctx);
    if (reason) { toast(reason, "warn"); return false; }
    opsAct(a);
    return true;
  };

  const onTile = (t: Tile) => {
    if (pending) {
      if (act(toAction(pending, t.id))) setPending(null);
      return;
    }
    setSelected(t.id === selected ? null : t.id);
  };

  const selTile = ops.tiles.find((t) => t.id === selected) ?? null;
  const selStructs = ops.structures.filter((st) => st.tileId === selected);
  const defOf = (kind: string) => sc.structures.find((d) => d.kind === kind);
  const ended = ops.status !== "running";
  const score = opsScore(ops);
  const buildables = sc.structures.filter((d) => d.buildCost && (!d.lockedUntilResearch || ops.research.some((r) => r.unlocked && sc.research.find((x) => x.id === r.id)?.effect.unlockBuild === d.kind)));
  const rover = ops.structures.find((st) => defOf(st.kind)?.traits.includes(sc.scout.needsTrait ?? "rover"));

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <TopBar
        title={`${mission?.name ?? ""} · ${sc.title}`}
        right={<Badge tone="violet">{sc.turnLabel} {Math.min(ops.turn, ops.maxTurns)}/{ops.maxTurns}</Badge>}
      />
      <div className="grid flex-1 gap-0 lg:grid-cols-[1fr_380px]">
        <div className="relative h-[52dvh] min-h-[320px] lg:h-auto">
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
              />
            </Suspense>
          </ErrorBoundary>
          <div className="pointer-events-none absolute inset-x-3 top-3 flex flex-wrap items-start justify-between gap-2">
            {pending ? (
              <div className="pointer-events-auto glass flex items-center gap-2 px-3 py-2 text-sm">
                <Icon name="sparkle" size={14} className="text-cyan" /> {pending.label}: pick a glowing tile
                <button type="button" className="ml-1 text-muted hover:text-fg" onClick={() => setPending(null)} aria-label="Cancel"><Icon name="x" size={14} /></button>
              </div>
            ) : <span />}
            {ops.env.storm && <div className="glass px-3 py-2 text-sm text-over">⚡ {ops.env.storm.note}</div>}
          </div>
          {selTile && !pending && (
            <div className="glass absolute inset-x-3 bottom-3 p-3 text-sm sm:right-auto sm:max-w-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium">{selTile.label ?? sc.terrains.find((t) => t.id === selTile.terrain)?.label}</div>
                <button type="button" onClick={() => setSelected(null)} aria-label="Close" className="text-muted hover:text-fg"><Icon name="x" size={14} /></button>
              </div>
              <div className="text-xs text-muted">{sc.terrains.find((t) => t.id === selTile.terrain)?.blurb}</div>
              <div className="num mt-1 text-[11px] text-faint">Sun {pct(selTile.sun)} · Earth view {selTile.earthView >= 0 ? "+" : ""}{pct(selTile.earthView)}{selTile.iceKgPerTurn > 0 ? ` · ice ${selTile.iceKgPerTurn} kg/turn` : ""}</div>
              {selTile.liveEvent && <a className="mt-1 block text-xs text-tight hover:underline" href={selTile.liveEvent.source.url} target="_blank" rel="noreferrer">● Live: {selTile.liveEvent.title}</a>}
              {selStructs.map((st) => {
                const d = defOf(st.kind);
                return (
                  <div key={st.id} className="mt-2 flex flex-wrap items-center gap-2 border-t border-line pt-2">
                    <span className="min-w-0 flex-1 truncate">{st.moduleId ? getModule(st.moduleId)?.name ?? d?.label : d?.label} <span className="num text-faint">{Math.round(st.health)}%</span></span>
                    {st.kind !== sc.hubKind && <Button size="sm" onClick={() => act({ type: "toggle", structureId: st.id })}>{st.on ? "Switch off" : "Switch on"}</Button>}
                    {st.health < 100 && <Button size="sm" onClick={() => act({ type: "repair", structureId: st.id })}>Repair</Button>}
                    {d?.move && <Button size="sm" onClick={() => setPending({ kind: "move", structureId: st.id, label: `Move ${d.label}` })}>Move</Button>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <aside className="space-y-4 border-l border-line bg-bg/70 p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted">Day <span className="num text-fg">{ops.env.day}</span></div>
            <div className="flex items-center gap-1" aria-label={`${ops.ap} action points left`}>
              {Array.from({ length: ops.apPerTurn }, (_, i) => <span key={i} className={`h-3 w-3 rounded-full ${i < ops.ap ? "bg-cyan shadow-[0_0_10px_#22d3ee]" : "bg-white/10"}`} />)}
              <span className="ml-1 text-xs text-muted">actions</span>
            </div>
          </div>
          <EnvStrip s={ops} turnLabel={sc.turnLabel} />
          <div className="space-y-2.5">
            <Meter label="Stored energy" value={ops.energyWh} max={ops.storageWh} color="var(--ok)" text={`${fmtKwh(ops.energyWh)} / ${fmtKwh(ops.storageWh)}`} />
            <Meter label={sc.consumable.label} value={ops.waterKg} max={Math.max(ops.waterKg, 100)} color="#38bdf8" text={`${ops.waterKg.toFixed(0)} ${sc.consumable.unit}`} />
            <Meter label="Data waiting" value={ops.dataStoredGb} max={ops.dataStorageGb} color="var(--violet-bright)" text={`${fmtGb(ops.dataStoredGb)} / ${fmtGb(ops.dataStorageGb)}`} />
            <div className="num flex justify-between text-xs text-muted"><span>Sent to Earth <span className="text-fg">{fmtGb(ops.dataReturnedGb)}</span></span><span>Science pts <span className="text-fg">{Math.floor(ops.sciencePoints)}</span></span></div>
          </div>

          <Quests goals={ops.goals} />

          <div>
            <div className="mb-2 flex gap-1" role="tablist">
              {(["deploy", "build", "research", "log"] as Tab[]).map((t) => (
                <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`flex-1 rounded-lg px-2 py-1.5 text-xs capitalize ${tab === t ? "bg-violet/25 text-fg" : "text-muted hover:text-fg"}`}>
                  {t}{t === "deploy" && ops.inventory.length ? ` (${ops.inventory.length})` : ""}
                </button>
              ))}
            </div>
            {tab === "deploy" && (
              <ul className="space-y-1.5">
                {ops.inventory.length === 0 && <li className="text-sm text-muted">Everything is deployed.</li>}
                {ops.inventory.map((it) => {
                  const d = defOf(it.kind);
                  const name = getModule(it.moduleId)?.name ?? d?.label ?? it.kind;
                  return (
                    <li key={it.moduleId}>
                      <button type="button" disabled={ended} onClick={() => setPending({ kind: "deploy", moduleId: it.moduleId, label: `Place ${name}` })} className="w-full rounded-xl border border-line bg-white/[0.03] p-2.5 text-left transition hover:border-cyan/60 disabled:opacity-40">
                        <div className="text-sm">{name}</div>
                        <div className="text-xs text-muted">{d?.blurb}</div>
                      </button>
                    </li>
                  );
                })}
                {rover && <li><Button className="w-full" disabled={ended} onClick={() => setPending({ kind: "scout", label: sc.scout.label })}><Icon name="globe" size={14} /> {sc.scout.label}</Button></li>}
              </ul>
            )}
            {tab === "build" && (
              <ul className="space-y-1.5">
                {buildables.map((d) => (
                  <li key={d.kind}>
                    <button type="button" disabled={ended} onClick={() => setPending({ kind: "build", build: d.kind, label: `Build ${d.label}` })} className="w-full rounded-xl border border-line bg-white/[0.03] p-2.5 text-left transition hover:border-cyan/60 disabled:opacity-40">
                      <div className="flex justify-between text-sm"><span>{d.label}</span><span className="num text-xs text-faint">{d.buildCost!.ap} AP{d.buildCost!.waterKg ? ` · ${d.buildCost!.waterKg} ${sc.consumable.unit}` : ""}</span></div>
                      <div className="text-xs text-muted">{d.blurb}</div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {tab === "research" && (
              <ul className="space-y-1.5">
                {ops.research.map((r) => {
                  const blocked = r.requires && !ops.research.find((x) => x.id === r.requires)?.unlocked;
                  return (
                    <li key={r.id}>
                      <button type="button" disabled={r.unlocked || ended || !!blocked} onClick={() => act({ type: "research", id: r.id })} className={`w-full rounded-xl border p-2.5 text-left transition ${r.unlocked ? "border-ok/50 bg-ok/10" : "border-line bg-white/[0.03] hover:border-violet-bright/60"} disabled:cursor-default`}>
                        <div className="flex justify-between text-sm"><span>{r.unlocked ? "✓ " : ""}{r.title}</span><span className="num text-xs text-faint">{r.cost} pts</span></div>
                        <div className="text-xs text-muted">{r.blurb}</div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {tab === "log" && (
              <ul className="max-h-64 space-y-1.5 overflow-y-auto text-xs">
                {[...ops.log].reverse().map((l, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="num shrink-0 text-faint">{l.turn}</span>
                    <span className={l.kind === "failure" ? "text-over" : l.kind === "warning" ? "text-tight" : l.kind === "success" ? "text-ok" : "text-muted"}>
                      {l.text}{l.liveSource && <> · <a href={l.liveSource.url} target="_blank" rel="noreferrer" className="underline">{l.liveSource.title}</a></>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="sticky bottom-0 -mx-4 border-t border-line bg-bg/90 p-4 backdrop-blur-xl">
            {ended ? (
              <div className="space-y-2">
                <div className={`text-sm ${ops.status === "lost" ? "text-over" : "text-ok"}`}>{ops.status === "lost" ? `Outpost lost: ${ops.lostReason ?? ""}` : "Operations complete."} Score {score.total} ({score.grade})</div>
                <Button variant="primary" className="w-full" onClick={finishOps}>See the debrief <Icon name="arrow" size={16} /></Button>
              </div>
            ) : (
              <Button variant="primary" className="w-full" disabled={!!ops.pendingEvent} onClick={() => act({ type: "advance" })}>
                {sc.turnLabel === "Turn" ? `Advance ${DAYS_PER_TURN} days` : `Next ${sc.turnLabel.toLowerCase()}`} <Icon name="play" size={15} />
              </Button>
            )}
          </div>
        </aside>
      </div>

      <AnimatePresence>
        {ops.pendingEvent && (
          <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center">
            <motion.div className="absolute inset-0 bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.div role="dialog" aria-modal="true" aria-label={ops.pendingEvent.title} className="glass-strong relative w-full max-w-md bg-[#0b0d24]/95 p-5" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}>
              <div className="text-[11px] uppercase tracking-wider text-tight">{sc.turnLabel} {ops.turn} · Decision</div>
              <h2 className="font-display mt-1 text-lg">{ops.pendingEvent.title}</h2>
              <p className="text-sm text-fg/90">{ops.pendingEvent.text}</p>
              {ops.pendingEvent.liveSource && <a href={ops.pendingEvent.liveSource.url} target="_blank" rel="noreferrer" className="text-xs text-cyan hover:underline">● Live NASA data: {ops.pendingEvent.liveSource.title}</a>}
              <div className="mt-4 grid gap-2">
                {ops.pendingEvent.options.map((o) => (
                  <button key={o.id} type="button" onClick={() => act({ type: "choose", eventId: ops.pendingEvent!.id, optionId: o.id })} className="rounded-xl border border-line bg-white/[0.04] p-3 text-left transition hover:border-violet-bright/70">
                    <div className="text-sm font-medium">{o.label}</div>
                    <div className="text-xs text-muted">{o.hint}</div>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
