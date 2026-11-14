import { useEffect, useMemo, useRef, useState } from "react";
import { Badge, Button, Icon, MonogramBadge, Slider } from "@/components/ui";
import { toast } from "@/components/ui/Toast";
import type { Actor, Stake } from "@/engine/types";
import { getActor } from "@/lib/catalog";
import { fmtPct } from "@/lib/format";
import { useGame } from "@/store/game";
import {
  designKey, marketPrices, runMarketSteps, useLedger, winner,
  type MarketOption, type MarketRecord, type MarketState, type OptionKind,
} from "./market";
import { useDesign } from "./useDesign";

const KIND: Record<OptionKind, { label: string; tone: "neutral" | "ok" | "violet" }> = {
  current: { label: "Current", tone: "neutral" },
  cheaper: { label: "Cheaper", tone: "ok" },
  upgrade: { label: "Upgrade", tone: "violet" },
};

const signedCredits = (n: number) => `${n >= 0 ? "+" : "-"}${Math.abs(n)}`;

/* ------------------------------------------------------------------ */
/* Settle after the flight: the flight result settles the open market  */
/* ------------------------------------------------------------------ */

function playerPayoutText(r: MarketRecord): string | undefined {
  const s = r.settlement;
  const mine = s?.payouts.find((p) => p.actorId === r.playerId);
  if (!s) return undefined;
  if (!s.sameDesign || mine?.refunded) return "Market settled: your stake came back";
  if (!mine) return `Market settled at a score of ${s.actualScore}`;
  return `Market settled: ${signedCredits(mine.net)} play credits for your forecast`;
}

let unsubscribe: (() => void) | undefined;
function wireSettlement() {
  unsubscribe?.();
  unsubscribe = useGame.subscribe((s, prev) => {
    if (s.result && s.result !== prev.result && s.design) useLedger.getState().settleLatest(s.result, s.design);
    if (s.screen === "debrief" && prev.screen !== "debrief") {
      const last = useLedger.getState().records.at(-1);
      if (!last?.settlement || last.announced || last.settlement.seed !== s.result?.seed) return;
      const text = playerPayoutText(last);
      if (text) toast(text, (last.settlement.payouts.find((p) => p.actorId === last.playerId)?.net ?? 0) >= 0 ? "ok" : "warn");
      useLedger.getState().markAnnounced(last.marketId);
    }
  });
}
wireSettlement();
if (import.meta.hot) import.meta.hot.dispose(() => unsubscribe?.());

/** How the last market settled: the real score against the forecasts, and what each stake brought back. */
export function SettlementView({ record }: { record: MarketRecord }) {
  const s = record.settlement;
  if (!s) return null;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
        <span>Flight scored <span className="num text-fg">{s.actualScore}</span></span>
        <span className="text-muted">Market said <span className="num">{Math.round(record.price)}</span> for {record.adoptedLabel}</span>
      </div>
      <ul className="flex flex-wrap gap-2">
        {s.payouts.map((p) => {
          const a = getActor(p.actorId);
          const tone = p.refunded ? "text-muted" : p.net >= 0 ? "text-ok" : "text-over";
          return (
            <li key={p.actorId} className="flex items-center gap-2 rounded-full border border-line bg-glass px-2 py-1" title={`${a?.shortName ?? p.actorId} staked ${p.credits} credits predicting ${Math.round(p.predictedScore)}`}>
              <MonogramBadge actor={a} fallbackName={p.actorId} size={22} showFlag={false} />
              <span className={`num text-xs ${tone}`}>{p.refunded ? "back" : signedCredits(p.net)}</span>
            </li>
          );
        })}
      </ul>
      {!s.sameDesign && <p className="text-xs text-muted">The design changed after the market closed, so every stake came back.</p>}
    </div>
  );
}

/** For the debrief: the market of the flight on screen, settled. Renders nothing without one. */
export function MarketSettlement() {
  const seed = useGame((s) => s.result?.seed);
  const record = useLedger((s) => s.records.at(-1));
  if (!record?.settlement || record.settlement.seed !== seed) return null;
  return (
    <div className="glass space-y-3 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-sm">Decision market settled</h2>
        <span className="text-xs text-faint">Play credits only</span>
      </div>
      <SettlementView record={record} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* The market                                                          */
/* ------------------------------------------------------------------ */

function Bar({ label, value, max, text, color }: { label: string; value: number; max: number; text: string; color: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-muted"><span>{label}</span><span className="num text-fg">{text}</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.min(1, value / max) * 100}%`, background: color }} /></div>
    </div>
  );
}

function Simulating({ progress }: { progress: number }) {
  return (
    <div className="space-y-2" role="status" aria-live="polite">
      <div className="flex justify-between text-xs text-muted"><span>Simulating flights for each option</span><span className="num">{fmtPct(progress)}</span></div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-brand transition-[width] duration-200" style={{ width: `${progress * 100}%` }} /></div>
    </div>
  );
}

function OptionCard({ o, stakes, picked, adopted, price, locked, onPick }: {
  o: MarketOption; stakes: Stake[]; picked: boolean; adopted: boolean; price?: number; locked: boolean; onPick: () => void;
}) {
  const k = KIND[o.kind];
  return (
    <button type="button" disabled={locked} onClick={onPick} aria-pressed={picked}
      className={`min-w-0 rounded-2xl border p-4 text-left transition ${picked ? "border-violet-bright/70 bg-glass-strong shadow-glow" : "border-line bg-glass hover:bg-glass-strong"} ${adopted ? "ring-2 ring-ok/60" : ""}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <Badge tone={k.tone}>{k.label}</Badge>
        {adopted ? <Badge tone="ok">Adopted</Badge> : <span className="num truncate text-[11px] text-muted">{o.delta}</span>}
      </div>
      <div className="mb-3 truncate text-sm font-medium" title={o.label}>{o.label}</div>
      <div className="space-y-3">
        <Bar label="Predicted score" value={o.forecast.expectedScore} max={1000} text={String(Math.round(o.forecast.expectedScore))} color="var(--violet-bright)" />
        <Bar label="Success" value={o.forecast.successProbability} max={1} text={fmtPct(o.forecast.successProbability)} color="var(--ok)" />
      </div>
      <div className="mt-3 flex min-h-7 flex-wrap items-center gap-2">
        {stakes.map((s) => {
          const a = getActor(s.actorId);
          return (
            <span key={s.actorId} className="flex items-center gap-1" title={`${a?.shortName ?? s.actorId} stakes ${s.credits} credits, predicts ${Math.round(s.predictedScore)}`}>
              <MonogramBadge actor={a} fallbackName={s.actorId} size={22} showFlag={false} /><span className="num text-[11px] text-muted">{s.credits}</span>
            </span>
          );
        })}
        {price !== undefined && <span className="num ml-auto text-[11px] text-violet-bright">market {Math.round(price)}</span>}
      </div>
    </button>
  );
}

export function MarketPanel({ onClosed }: { onClosed: () => void }) {
  const { design, catalog } = useDesign();
  const live = useGame((s) => s.live);
  const adopt = useGame((s) => s.adoptDesign);
  const close = useLedger((s) => s.close);
  const last = useLedger((s) => s.records.at(-1));
  // The market is about the design the council opened it on; later edits reopen the step.
  const opened = useRef({ design, catalog, live });
  const [state, setState] = useState<MarketState | null>(null);
  const [progress, setProgress] = useState(0);
  const [pick, setPick] = useState<string>("current");
  const [credits, setCredits] = useState(100);
  const [result, setResult] = useState<{ win: MarketOption; prices: Record<string, number> } | null>(null);

  useEffect(() => {
    const { design: d, catalog: c, live: l } = opened.current;
    const partners = d.coalition.partnerIds.map((id) => c.actors.find((a) => a.id === id)).filter((a): a is Actor => !!a);
    const steps = runMarketSteps(d, partners, c, l ?? undefined);
    let alive = true;
    let timer = 0;
    const pump = () => {
      if (!alive) return;
      const t0 = performance.now();
      let r = steps.next();
      while (!r.done && performance.now() - t0 < 12) r = steps.next();
      if (r.done) {
        setState(r.value);
        setPick([...r.value.options].sort((a, b) => b.forecast.expectedScore - a.forecast.expectedScore)[0].id);
      } else {
        setProgress(r.value);
        timer = window.setTimeout(pump, 0);
      }
    };
    timer = window.setTimeout(pump, 0);
    return () => { alive = false; window.clearTimeout(timer); };
  }, []);

  const playerStake: Stake | undefined = useMemo(() => {
    const o = state?.options.find((x) => x.id === pick);
    return state && o ? { marketId: state.market.id, optionId: o.id, actorId: design.coalition.leadId, credits, predictedScore: o.forecast.expectedScore } : undefined;
  }, [state, pick, credits, design.coalition.leadId]);

  const closeMarket = () => {
    if (!state || !playerStake) return;
    const prices = marketPrices(state, playerStake);
    const win = winner(state, prices);
    setResult({ win, prices });
    close({
      marketId: state.market.id, missionId: win.design.missionId, designKey: designKey(win.design), adoptedId: win.id, adoptedLabel: win.label,
      price: prices[win.id], stakes: [...state.botStakes, playerStake], playerId: playerStake.actorId,
    });
    if (win.id !== "current") { adopt(win.design); toast(`Council adopted: ${win.label}`, "ok"); }
    onClosed();
  };

  const previous = last?.settlement && last.missionId === design.missionId ? last : undefined;

  return (
    <div className="glass space-y-5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-base">Decision market</h3>
        <span className="rounded-full border border-violet/40 bg-violet/10 px-3 py-0.5 text-xs text-violet-bright">Bet on beliefs</span>
      </div>
      {previous && !result && (
        <div className="rounded-2xl border border-line p-4">
          <p className="mb-2 text-xs uppercase tracking-wider text-faint">Last flight settled the last market</p>
          <SettlementView record={previous} />
        </div>
      )}
      <p className="text-sm text-muted">{state?.market.question ?? "Which design should the council fly?"}</p>
      {!state ? <Simulating progress={progress} /> : (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            {state.options.map((o) => (
              <OptionCard key={o.id} o={o} locked={!!result}
                stakes={[...state.botStakes, ...(playerStake ? [playerStake] : [])].filter((s) => s.optionId === o.id && s.credits > 0)}
                picked={pick === o.id} adopted={result?.win.id === o.id} price={result?.prices[o.id]} onPick={() => setPick(o.id)} />
            ))}
          </div>
          {!result ? (
            <div className="grid items-end gap-4 sm:grid-cols-[1fr_auto]">
              <Slider id="stake" label="Your stake" value={credits} min={0} max={200} step={10} display={`${credits} credits`} onChange={setCredits} />
              <Button variant="primary" onClick={closeMarket}>Close the market</Button>
            </div>
          ) : (
            <p className="flex items-start gap-2 text-sm text-ok"><Icon name="check" size={16} className="mt-0.5 shrink-0" /><span>The council adopts {result.win.label.toLowerCase() === "fly as designed" ? "the design as it is" : result.win.label} at a market score of <span className="num">{Math.round(result.prices[result.win.id])}</span>. Stakes settle after the flight.</span></p>
          )}
        </>
      )}
      <p className="text-xs text-faint">Each option is priced from {state ? state.options[0].forecast.runs : 120} simulated flights. Play credits only, nothing here is real money.</p>
    </div>
  );
}
