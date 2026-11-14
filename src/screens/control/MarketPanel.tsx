import { useEffect, useMemo, useRef, useState } from "react";
import { Badge, Button, Icon, InfoButton, MonogramBadge, Slider } from "@/components/ui";
import { toast } from "@/components/ui/Toast";
import type { Actor } from "@/engine/types";
import { getActor } from "@/lib/catalog";
import { fmtPct } from "@/lib/format";
import { useGame } from "@/store/game";
import {
  designKey, lmsrTrade, runMarketSteps, trade, useLedger, winner, FORECAST_RUNS, LMSR_B,
  type MarketOption, type MarketRecord, type MarketState, type OptionKind, type Side, type Trade,
} from "./market";
import { useDesign } from "./useDesign";

const KIND: Record<OptionKind, { label: string; tone: "neutral" | "ok" | "violet" }> = {
  current: { label: "Current", tone: "neutral" },
  cheaper: { label: "Cheaper", tone: "ok" },
  upgrade: { label: "Upgrade", tone: "violet" },
};

const signedCredits = (n: number) => `${n >= 0 ? "+" : "-"}${Math.abs(Math.round(n))}`;
const name = (id: string) => getActor(id)?.shortName ?? id;

function SideArrow({ side, size = 12 }: { side: Side; size?: number }) {
  return <Icon name="arrow" size={size} style={{ transform: `rotate(${side === "higher" ? -90 : 90}deg)` }} />;
}

/* ------------------------------------------------------------------ */
/* Settle after the flight: the flight result settles the open market  */
/* ------------------------------------------------------------------ */

function playerPayoutText(r: MarketRecord): string | undefined {
  const s = r.settlement;
  if (!s) return undefined;
  const mine = s.payouts.find((p) => p.actorId === r.playerId);
  if (!s.sameDesign || mine?.refunded) return "Market settled: your play credits came back";
  if (!mine) return `Market settled at a score of ${s.actualScore}`;
  return `Market settled: ${signedCredits(mine.net)} play credits for your call`;
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
      const mine = last.settlement.payouts.find((p) => p.actorId === last.playerId);
      if (text) toast(text, (mine?.net ?? 0) >= 0 ? "ok" : "warn");
      useLedger.getState().markAnnounced(last.marketId);
    }
  });
}
wireSettlement();
if (import.meta.hot) import.meta.hot.dispose(() => unsubscribe?.());

/** How a market settled: the real score against the market's price, and what each trade brought back. */
export function SettlementView({ record }: { record: MarketRecord }) {
  const reputation = useLedger((s) => s.reputation);
  const s = record.settlement;
  if (!s) return null;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
        <span>Flight scored <span className="num text-fg">{s.actualScore}</span></span>
        <span className="text-muted">Market said <span className="num">{Math.round(record.prices[record.adoptedId] ?? 0)}</span> for {record.adoptedLabel}</span>
      </div>
      {s.payouts.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {s.payouts.map((p, i) => {
            const tone = p.refunded ? "text-muted" : p.net >= 0 ? "text-ok" : "text-over";
            const rep = reputation[p.actorId];
            return (
              <li key={`${p.actorId}-${i}`} className="flex items-center gap-2 rounded-full border border-line bg-glass px-2 py-1"
                title={`${name(p.actorId)} paid ${Math.round(p.credits)} credits on "${p.side}"${rep ? `. Record ${signedCredits(rep.net)} over ${rep.markets} market${rep.markets > 1 ? "s" : ""}` : ""}`}>
                <MonogramBadge actor={getActor(p.actorId)} fallbackName={p.actorId} size={22} showFlag={false} />
                <span className={`num text-xs ${tone}`}>{p.refunded ? "back" : signedCredits(p.net)}</span>
              </li>
            );
          })}
        </ul>
      )}
      {!s.sameDesign && <p className="text-xs text-muted">The design changed after the market closed, so every trade was refunded.</p>}
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

/** Each council member's forecasting record: credits won or lost over settled markets. */
function RecordRow({ ids }: { ids: string[] }) {
  const reputation = useLedger((s) => s.reputation);
  const known = ids.filter((id) => reputation[id]);
  if (!known.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
      <span className="uppercase tracking-wider text-faint">Forecasting record</span>
      {known.map((id) => {
        const r = reputation[id];
        return (
          <span key={id} className="flex items-center gap-1" title={`${name(id)}: ${signedCredits(r.net)} credits over ${r.markets} market${r.markets > 1 ? "s" : ""}. Better records trade bigger.`}>
            <MonogramBadge actor={getActor(id)} fallbackName={id} size={20} showFlag={false} />
            <span className={`num ${r.net >= 0 ? "text-ok" : "text-over"}`}>{signedCredits(r.net)}</span>
          </span>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* The market                                                          */
/* ------------------------------------------------------------------ */

const MARKET_SOURCES = [
  { title: "Robin Hanson, Shall We Vote on Values, But Bet on Beliefs? (2013)", url: "https://mason.gmu.edu/~rhanson/futarchy2013.pdf" },
  { title: "Robin Hanson, Logarithmic Market Scoring Rules for Modular Combinatorial Information Aggregation (2002)", url: "https://mason.gmu.edu/~rhanson/mktscore.pdf" },
  { title: "MetaDAO documentation: futarchy on Solana", url: "https://docs.metadao.fi/" },
];

/** What sits behind the info button: how the market prices, decides and settles. */
function MarketInfo() {
  return (
    <div className="space-y-3 text-sm text-fg/90">
      <p>Vote on values, bet on beliefs. The values step set what the council wants; this market asks which design will deliver it.</p>
      <p>Each option starts at the score forecast from {FORECAST_RUNS} simulated flights of the game engine. A market maker using Hanson&apos;s logarithmic market scoring rule (LMSR, liquidity {LMSR_B.toLocaleString("en-US")} credits) quotes the price. Buying &ldquo;higher&rdquo; raises it and &ldquo;lower&rdquo; lowers it; near the middle of the scale, moving 50 points costs about 100 credits.</p>
      <p>The council adopts the option with the highest price.</p>
      <p>After the flight, only the adopted option&apos;s market settles: each &ldquo;higher&rdquo; share pays the score divided by 1,000 in credits, each &ldquo;lower&rdquo; share pays the rest. Trades in the other options come back, because their condition never happened.</p>
      <p>Each member keeps a forecasting record of credits won or lost. A better record lets a member trade bigger next time, from half to double.</p>
      <p>Decision markets like this run DAO proposals on Solana today (MetaDAO). Here they use play credits only; nothing is real money.</p>
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

/** Market price as a bar, with a tick where the simulation alone put it. */
function PriceBar({ price, forecast }: { price: number; forecast: number }) {
  return (
    <div className="relative h-2 rounded-full bg-white/10">
      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.min(100, price / 10)}%`, background: "var(--violet-bright)" }} />
      <span className="absolute -top-1 h-4 w-0.5 rounded-full bg-fg/70" style={{ left: `calc(${Math.min(100, forecast / 10)}% - 1px)` }} title={`Forecast ${Math.round(forecast)}`} />
    </div>
  );
}

function OptionCard({ o, price, trades, picked, adopted, locked, onPick }: {
  o: MarketOption; price: number; trades: Trade[]; picked: boolean; adopted: boolean; locked: boolean; onPick: () => void;
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
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-xs text-muted">Market score</span>
        <span className="flex items-baseline gap-2">
          <span className="num text-[11px] text-faint">forecast {Math.round(o.forecast.expectedScore)}</span>
          <span className="num text-lg leading-none text-fg">{Math.round(price)}</span>
        </span>
      </div>
      <PriceBar price={price} forecast={o.forecast.expectedScore} />
      <div className="mt-3 flex items-center justify-between text-xs text-muted">
        <span>Success</span><span className="num text-fg">{fmtPct(o.forecast.successProbability)}</span>
      </div>
      <div className="mt-3 flex min-h-6 flex-wrap items-center gap-2">
        {trades.map((t, i) => (
          <span key={`${t.actorId}-${i}`} className={`flex items-center gap-1 ${t.side === "higher" ? "text-ok" : "text-over"}`}
            title={`${name(t.actorId)} paid ${Math.round(t.credits)} credits on ${t.side}: ${Math.round(t.from)} to ${Math.round(t.to)}`}>
            <MonogramBadge actor={getActor(t.actorId)} fallbackName={t.actorId} size={22} showFlag={false} />
            <SideArrow side={t.side} />
            <span className="num text-[11px]">{Math.round(t.credits)}</span>
          </span>
        ))}
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
  const opened = useRef({ design, catalog, live, record: useLedger.getState().reputation });
  const [state, setState] = useState<MarketState | null>(null);
  const [progress, setProgress] = useState(0);
  const [pick, setPick] = useState<string>("current");
  const [side, setSide] = useState<Side>("higher");
  const [credits, setCredits] = useState(100);
  const [closed, setClosed] = useState<{ win: MarketOption; prices: Record<string, number>; trades: Trade[] } | null>(null);

  useEffect(() => {
    const { design: d, catalog: c, live: l, record } = opened.current;
    const partners = d.coalition.partnerIds.map((id) => c.actors.find((a) => a.id === id)).filter((a): a is Actor => !!a);
    const steps = runMarketSteps(d, partners, c, l ?? undefined, undefined, record);
    let alive = true;
    let timer = 0;
    const pump = () => {
      if (!alive) return;
      const t0 = performance.now();
      let r = steps.next();
      while (!r.done && performance.now() - t0 < 12) r = steps.next();
      if (r.done) {
        setState(r.value);
        setPick(winner(r.value.options, r.value.book.prices).id);
      } else {
        setProgress(r.value);
        timer = window.setTimeout(pump, 0);
      }
    };
    timer = window.setTimeout(pump, 0);
    return () => { alive = false; window.clearTimeout(timer); };
  }, []);

  const preview = useMemo(() => {
    const price = state?.book.prices[pick];
    return price === undefined ? undefined : lmsrTrade(price, side === "higher" ? 1000 : 0, credits);
  }, [state, pick, side, credits]);

  const playerId = design.coalition.leadId;
  const prices = closed?.prices ?? state?.book.prices ?? {};
  const trades = closed?.trades ?? state?.book.trades ?? [];

  const closeMarket = () => {
    if (!state) return;
    const final = trade(state.book, playerId, pick, side === "higher" ? 1000 : 0, credits);
    const win = winner(state.options, final.prices);
    setClosed({ win, prices: final.prices, trades: final.trades });
    close({
      marketId: state.market.id, missionId: win.design.missionId, designKey: designKey(win.design), adoptedId: win.id, adoptedLabel: win.label,
      prices: final.prices, trades: final.trades, playerId,
    });
    if (win.id !== "current") { adopt(win.design); toast(`Council adopted: ${win.label}`, "ok"); }
    onClosed();
  };

  const previous = last?.settlement && last.missionId === design.missionId ? last : undefined;
  const pickedOption = state?.options.find((o) => o.id === pick);

  return (
    <div className="glass space-y-5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-base">Decision market</h3>
        <span className="flex items-center gap-2">
          <span className="rounded-full border border-violet/40 bg-violet/10 px-3 py-0.5 text-xs text-violet-bright">Bet on beliefs</span>
          <InfoButton title="Decision market" body={<MarketInfo />} sources={MARKET_SOURCES} />
        </span>
      </div>
      {previous && !closed && (
        <div className="rounded-2xl border border-line p-4">
          <p className="mb-2 text-xs uppercase tracking-wider text-faint">Last flight settled the last market</p>
          <SettlementView record={previous} />
        </div>
      )}
      <RecordRow ids={[design.coalition.leadId, ...design.coalition.partnerIds]} />
      <p className="text-sm text-muted">{state?.market.question ?? "Which design should the council fly?"}</p>
      {!state ? <Simulating progress={progress} /> : (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            {state.options.map((o) => (
              <OptionCard key={o.id} o={o} price={prices[o.id] ?? o.forecast.expectedScore} locked={!!closed}
                trades={trades.filter((t) => t.optionId === o.id)}
                picked={pick === o.id} adopted={closed?.win.id === o.id} onPick={() => setPick(o.id)} />
            ))}
          </div>
          {!closed ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted">Your call on <span className="text-fg">{pickedOption?.label}</span></span>
                <div className="flex gap-1.5" role="group" aria-label="Your call">
                  {(["higher", "lower"] as Side[]).map((sd) => (
                    <Button key={sd} size="sm" variant={side === sd ? "primary" : "ghost"} aria-pressed={side === sd} onClick={() => setSide(sd)}>
                      <SideArrow side={sd} size={14} /> {sd === "higher" ? "Higher" : "Lower"}
                    </Button>
                  ))}
                </div>
                <span className="text-muted">than <span className="num text-fg">{Math.round(state.book.prices[pick] ?? 0)}</span></span>
              </div>
              <div className="grid items-end gap-4 sm:grid-cols-[1fr_auto]">
                <div>
                  <Slider id="stake" label="Your stake" value={credits} min={0} max={200} step={10} display={`${credits} credits`} onChange={setCredits} />
                  <p className="num mt-1 min-h-4 text-[11px] text-muted">{preview ? `Moves the price ${Math.round(preview.from)} to ${Math.round(preview.to)}` : ""}</p>
                </div>
                <Button variant="primary" onClick={closeMarket}>Close the market</Button>
              </div>
            </div>
          ) : (
            <p className="flex items-start gap-2 text-sm text-ok"><Icon name="check" size={16} className="mt-0.5 shrink-0" /><span>The council adopts {closed.win.id === "current" ? "the design as it is" : closed.win.label} at a market score of <span className="num">{Math.round(closed.prices[closed.win.id])}</span>. Trades settle after the flight.</span></p>
          )}
        </>
      )}
      <p className="text-xs text-faint">Prices start at {state ? state.options[0].forecast.runs : 120} simulated flights per option; a market maker (LMSR) moves them as members trade. Play credits only, nothing here is real money.</p>
    </div>
  );
}
