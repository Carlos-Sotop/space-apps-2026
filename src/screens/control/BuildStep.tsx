import { useMemo, useState } from "react";
import { Badge, GlassCard, Icon, InfoButton } from "@/components/ui";
import type { Module, ModuleCategory } from "@/engine/types";
import { CATEGORY_LABEL, getActor, missionModules } from "@/lib/catalog";
import { fmtKg, fmtMUsd, fmtW } from "@/lib/format";
import { useGame } from "@/store/game";
import { SpacecraftStack } from "./SpacecraftStack";
import { StepTitle, useDesign } from "./useDesign";

function ModuleInfo({ m }: { m: Module }) {
  const rows: [string, string][] = [
    ["Mass", fmtKg(m.massKg)], ["Power draw", fmtW(m.powerW)], ["Cost", fmtMUsd(m.costMUsd)], ["Reliability", `${(m.reliability * 100).toFixed(1)}%`],
  ];
  if (m.generatesW) rows.push(["Generates", fmtW(m.generatesW)]);
  if (m.storageWh) rows.push(["Storage", `${m.storageWh} Wh`]);
  if (m.dataGbPerDay) rows.push(["Data produced", `${m.dataGbPerDay} Gb/day`]);
  if (m.downlinkGbPerDay) rows.push(["Downlink", `${m.downlinkGbPerDay} Gb/day`]);
  if (m.scienceValue) rows.push(["Science value", `${m.scienceValue} pts`]);
  if (m.payloadCapacityKg) rows.push(["Carries up to", fmtKg(m.payloadCapacityKg)]);
  return (
    <>
      <p>{m.blurb}</p>
      {m.heritage && <p className="text-sm text-muted">Heritage: <span className="text-fg">{m.heritage}</span></p>}
      {m.providerId && <p className="text-sm text-muted">Provider: <span className="text-fg">{getActor(m.providerId)?.name ?? m.providerId}</span></p>}
      <dl className="num grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
        {rows.map(([k, v]) => <div key={k} className="flex justify-between"><dt className="text-faint">{k}</dt><dd>{v}</dd></div>)}
      </dl>
    </>
  );
}

export function BuildStep() {
  const { design, mission } = useDesign();
  const toggle = useGame((s) => s.toggleIn);
  const all = useMemo(() => missionModules(mission), [mission]);
  const cats = useMemo(() => [...new Set(all.map((m) => m.category))], [all]);
  const [tab, setTab] = useState<ModuleCategory | "all">("all");
  const shown = all.filter((m) => tab === "all" || m.category === tab);
  const flown = all.filter((m) => design.moduleIds.includes(m.id));
  const missing = mission.requiredCategories.filter((c) => !flown.some((m) => m.category === c));

  return (
    <div>
      <StepTitle title="Build the spacecraft" chip={`${flown.length} modules`} />
      <div className="grid gap-6 xl:grid-cols-[1fr_280px]">
        <div className="min-w-0">
          <div role="tablist" aria-label="Module categories" className="mb-4 flex flex-wrap gap-1.5">
            {(["all", ...cats] as const).map((c) => {
              const req = c !== "all" && mission.requiredCategories.includes(c);
              const need = c !== "all" && missing.includes(c);
              return (
                <button key={c} type="button" role="tab" aria-selected={tab === c} onClick={() => setTab(c)} className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] transition ${tab === c ? "border-violet-bright/60 bg-violet/20 text-fg" : "border-line text-muted hover:text-fg"}`}>
                  {c === "all" ? "All" : CATEGORY_LABEL[c]}
                  {req && <span className={`h-1.5 w-1.5 rounded-full ${need ? "bg-over" : "bg-ok"}`} title={need ? "Required, missing" : "Required, covered"} />}
                </button>
              );
            })}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {shown.map((m) => {
              const on = design.moduleIds.includes(m.id);
              return (
                <GlassCard key={m.id} selected={on} onSelect={() => toggle("moduleIds", m.id)} label={`${on ? "Remove" : "Add"} ${m.name}`} className="p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-[15px]">{m.name}</h3>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-faint">{CATEGORY_LABEL[m.category]}{m.tier === "advanced" && <Badge tone="blue">Advanced</Badge>}</div>
                    </div>
                    <InfoButton title={m.name} body={<ModuleInfo m={m} />} sources={m.sources} verified={m.verified} />
                  </div>
                  <div className="num mt-2.5 flex items-center justify-between text-xs text-muted">
                    <span>{fmtKg(m.massKg)}</span><span>{m.generatesW ? `+${fmtW(m.generatesW)}` : fmtW(m.powerW)}</span><span>{fmtMUsd(m.costMUsd)}</span>
                    {on ? <Icon name="check" size={15} className="text-ok" /> : <Icon name="plus" size={15} className="text-faint" />}
                  </div>
                </GlassCard>
              );
            })}
          </div>
        </div>
        <aside className="glass h-fit p-4 xl:sticky xl:top-48">
          <div className="mb-2 text-xs uppercase tracking-widest text-faint">Your spacecraft</div>
          <SpacecraftStack modules={flown} />
        </aside>
      </div>
    </div>
  );
}
