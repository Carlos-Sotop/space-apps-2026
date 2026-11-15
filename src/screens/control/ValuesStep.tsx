import { useState } from "react";
import { councilValues, recommendStep } from "@/engine";
import type { Values } from "@/engine/types";
import { MonogramBadge, RecommendedButton, Slider } from "@/components/ui";
import { getActor } from "@/lib/catalog";
import { fmtPct } from "@/lib/format";
import { useGame } from "@/store/game";
import { useDesign } from "./useDesign";

const KEYS: { key: keyof Values; label: string; color: string }[] = [
  { key: "science", label: "Science", color: "var(--violet-bright)" },
  { key: "safety", label: "Safety", color: "var(--ok)" },
  { key: "cost", label: "Cost", color: "var(--tight)" },
];

function MiniBars({ v }: { v: Values }) {
  return (
    <div className="space-y-1.5">
      {KEYS.map((k) => (
        <div key={k.key} className="flex items-center gap-2">
          <span className="w-12 text-[11px] text-muted">{k.label}</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${v[k.key] * 100}%`, background: k.color }} /></div>
          <span className="num w-9 text-right text-[11px] text-muted">{fmtPct(v[k.key])}</span>
        </div>
      ))}
    </div>
  );
}

export function ValuesStep() {
  const { design, catalog } = useDesign();
  const playerValues = useGame((s) => s.playerValues);
  const setPlayerValues = useGame((s) => s.setPlayerValues);
  const patchDesign = useGame((s) => s.patchDesign);
  const [raw, setRaw] = useState<Values>({ science: playerValues.science * 100, safety: playerValues.safety * 100, cost: playerValues.cost * 100 });

  const applyRecommended = () => {
    const { values: v, ...rest } = recommendStep("charter", design, catalog);
    if (v) {
      setRaw({ science: v.science * 100, safety: v.safety * 100, cost: v.cost * 100 });
      setPlayerValues(v);
    }
    if (Object.keys(rest).length) patchDesign(rest);
  };

  const update = (key: keyof Values, v: number) => {
    const next = { ...raw, [key]: v };
    setRaw(next);
    const sum = next.science + next.safety + next.cost || 1;
    setPlayerValues({ science: next.science / sum, safety: next.safety / sum, cost: next.cost / sum });
  };

  const { values, weights } = councilValues(design.coalition, playerValues, catalog);
  const ids = [design.coalition.leadId, ...design.coalition.partnerIds];

  return (
    <div>
      <div className="mb-5 flex justify-end"><RecommendedButton data-coach="charter.recommended" onClick={applyRecommended} /></div>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="glass space-y-5 p-5" data-coach="charter.vote">
          <div className="text-xs uppercase tracking-widest text-faint">Your vote</div>
          {KEYS.map((k) => <Slider key={k.key} id={`v-${k.key}`} label={k.label} value={raw[k.key]} min={0} max={100} step={1} display={fmtPct(playerValues[k.key])} onChange={(v) => update(k.key, v)} />)}
        </div>
        <div className="glass p-5">
          <div className="mb-4 text-xs uppercase tracking-widest text-faint">Agreed weights</div>
          <div className="space-y-4">
            {KEYS.map((k) => (
              <div key={k.key}>
                <div className="mb-1 flex items-baseline justify-between"><span className="text-sm">{k.label}</span><span className="num font-display text-xl" style={{ color: k.color }}>{fmtPct(values[k.key])}</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${values[k.key] * 100}%`, background: k.color, boxShadow: `0 0 12px ${k.color}` }} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ids.map((id, i) => {
          const a = getActor(id);
          const v: Values = i === 0 ? playerValues : a?.priorities ?? { science: 1 / 3, safety: 1 / 3, cost: 1 / 3 };
          return (
            <div key={id} className="glass p-4">
              <div className="mb-3 flex items-center gap-3">
                <MonogramBadge actor={a} fallbackName={id} size={36} />
                <div className="min-w-0 flex-1"><div className="truncate text-sm">{i === 0 ? "You" : a?.shortName ?? id}</div><div className="text-[11px] text-muted">Vote weight <span className="num text-violet-bright">{fmtPct(weights[id] ?? 0)}</span></div></div>
              </div>
              <MiniBars v={v} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
