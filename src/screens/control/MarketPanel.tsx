import { useMemo, useState } from "react";
import { Badge, Button, Icon, MonogramBadge, Slider } from "@/components/ui";
import { toast } from "@/components/ui/Toast";
import type { Stake } from "@/engine/types";
import { getActor } from "@/lib/catalog";
import { fmtPct } from "@/lib/format";
import { useGame } from "@/store/game";
import { buildMarket, marketPrices, runMarket, winner, type MarketOption, type MarketState } from "./market";
import { useDesign } from "./useDesign";

function Bar({ label, value, max, text, color }: { label: string; value: number; max: number; text: string; color: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-muted"><span>{label}</span><span className="num text-fg">{text}</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.min(1, value / max) * 100}%`, background: color }} /></div>
    </div>
  );
}

export function MarketPanel({ onSettled }: { onSettled: () => void }) {
  const { design, mission, catalog } = useDesign();
  const live = useGame((s) => s.live);
  const adopt = useGame((s) => s.adoptDesign);
  const [state] = useState<MarketState>(() => runMarket(buildMarket(design, mission, catalog), design.coalition.partnerIds, catalog, live ?? undefined));
  const best = useMemo(() => [...state.options].sort((a, b) => b.forecast.expectedScore - a.forecast.expectedScore)[0], [state]);
  const [pick, setPick] = useState(best.id);
  const [credits, setCredits] = useState(100);
  const [result, setResult] = useState<{ win: MarketOption; prices: Record<string, number> } | null>(null);

  const optionFor = (id: string) => state.options.find((o) => o.id === id)!;
  const playerStake: Stake = { marketId: state.market.id, optionId: pick, actorId: design.coalition.leadId, credits, predictedScore: optionFor(pick).forecast.expectedScore };

  const settle = () => {
    const prices = marketPrices(state, playerStake);
    const win = winner(state, prices);
    setResult({ win, prices });
    if (win.id !== "current") { adopt(win.design); toast(`Council adopted: ${win.label}`, "ok"); }
    onSettled();
  };

  return (
    <div className="glass space-y-5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-base">Decision market</h3>
        <span className="rounded-full border border-violet/40 bg-violet/10 px-3 py-0.5 text-xs text-violet-bright">Bet on beliefs</span>
      </div>
      <p className="text-sm text-muted">{state.market.question}</p>
      <div className="grid gap-4 md:grid-cols-2">
        {state.options.map((o) => {
          const stakes = [...state.botStakes, playerStake].filter((s) => s.optionId === o.id);
          return (
            <button key={o.id} type="button" disabled={!!result} onClick={() => setPick(o.id)} aria-pressed={pick === o.id}
              className={`rounded-2xl border p-4 text-left transition ${pick === o.id ? "border-violet-bright/70 bg-glass-strong shadow-glow" : "border-line bg-glass hover:bg-glass-strong"} ${result?.win.id === o.id ? "ring-2 ring-ok/60" : ""}`}>
              <div className="mb-3 flex items-center justify-between gap-2"><span className="truncate text-sm font-medium">{o.label}</span>{result?.win.id === o.id && <Badge tone="ok">Adopted</Badge>}</div>
              <div className="space-y-3">
                <Bar label="Predicted score" value={o.forecast.expectedScore} max={1000} text={String(Math.round(o.forecast.expectedScore))} color="var(--violet-bright)" />
                <Bar label="Success probability" value={o.forecast.successProbability} max={1} text={fmtPct(o.forecast.successProbability)} color="var(--ok)" />
              </div>
              <div className="mt-3 flex min-h-8 flex-wrap items-center gap-2">
                {stakes.map((s) => (
                  <span key={s.actorId} className="flex items-center gap-1" title={`${getActor(s.actorId)?.shortName ?? s.actorId} stakes ${s.credits} credits`}>
                    <MonogramBadge actor={getActor(s.actorId)} fallbackName={s.actorId} size={24} showFlag={false} /><span className="num text-[11px] text-muted">{s.credits}</span>
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
      {state.options.length > 1 && !result && (
        <div className="grid items-end gap-4 sm:grid-cols-[1fr_auto]">
          <Slider id="stake" label="Your stake in play credits" value={credits} min={0} max={200} step={10} display={`${credits} credits`} onChange={setCredits} />
          <Button variant="primary" onClick={settle}>Settle the market</Button>
        </div>
      )}
      {state.options.length === 1 && !result && <Button variant="primary" onClick={settle}>Keep this design</Button>}
      {result && (
        <p className="flex items-center gap-2 text-sm text-ok"><Icon name="check" size={16} /> The council adopts: {result.win.label} (market score <span className="num">{Math.round(result.prices[result.win.id])}</span>).</p>
      )}
      <p className="text-xs text-faint">Play credits only. Nothing here is real money.</p>
    </div>
  );
}
