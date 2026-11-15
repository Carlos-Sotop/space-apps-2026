import { useMemo, useState, type ReactNode } from "react";
import { Badge, GlassCard, Icon, InfoButton, RecommendedButton, type IconName } from "@/components/ui";
import { computeResources, recommendStep } from "@/engine";
import type { Module, ModuleCategory } from "@/engine/types";
import { CATEGORY_LABEL, getActor, missionModules } from "@/lib/catalog";
import { fmtKg, fmtMUsd, fmtW } from "@/lib/format";
import { useGame } from "@/store/game";
import { SpacecraftStack } from "./SpacecraftStack";
import { StepTitle, useDesign } from "./useDesign";

/** What a module is for, in the player's words. Tabs group the catalog by job, not by code. */
const FUNCTIONS = ["Power", "Comms", "Science", "Life", "Structure"] as const;
type Fn = (typeof FUNCTIONS)[number];

const FUNCTION_OF: Record<ModuleCategory, Fn> = {
  power: "Power", battery: "Power",
  comms: "Comms",
  instrument: "Science", experiment: "Science",
  habitat: "Life", isru: "Life",
  bus: "Structure", propulsion: "Structure", lander: "Structure", thermal: "Structure",
  computer: "Structure", adcs: "Structure", rover: "Structure",
};

const FUNCTION_ICON: Record<Fn, IconName> = {
  Power: "power", Comms: "comms", Science: "science", Life: "habitat", Structure: "build",
};

const CATEGORY_ICON: Record<ModuleCategory, IconName> = {
  bus: "spacecraft", power: "power", battery: "battery", comms: "comms", computer: "data",
  adcs: "spacecraft", propulsion: "launch", thermal: "sun", lander: "landing",
  instrument: "earth-observation", experiment: "science", habitat: "habitat", isru: "water", rover: "rover",
};

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

/** mass, power and cost as one glanceable row */
function Chip({ icon, children, tone = "" }: { icon: IconName; children: ReactNode; tone?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border border-line bg-white/[0.04] px-1.5 py-0.5 text-[11px] ${tone || "text-muted"}`}>
      <Icon name={icon} size={11} className="shrink-0 opacity-80" />
      <span className="num">{children}</span>
    </span>
  );
}

export function BuildStep() {
  const { design, mission, catalog } = useDesign();
  const toggle = useGame((s) => s.toggleIn);
  const patchDesign = useGame((s) => s.patchDesign);
  const all = useMemo(() => missionModules(mission), [mission]);
  const [tab, setTab] = useState<Fn | "all">("all");
  const [hover, setHover] = useState<string | undefined>();

  const fns = useMemo(() => FUNCTIONS.filter((f) => all.some((m) => FUNCTION_OF[m.category] === f)), [all]);
  const shown = all.filter((m) => tab === "all" || FUNCTION_OF[m.category] === tab);
  const flown = all.filter((m) => design.moduleIds.includes(m.id));
  const missing = mission.requiredCategories.filter((c) => !flown.some((m) => m.category === c));

  // the capacity still free on the rocket: the cyan volume on the ship, and what rideshare sells
  const resources = useMemo(() => computeResources(design, catalog), [design, catalog]);
  const spareMassKg = Math.max(0, resources.mass.capacity - resources.mass.used);

  /** a function tab needs attention when a required category inside it is still missing */
  const needs = (f: Fn) => missing.some((c) => FUNCTION_OF[c] === f);

  return (
    <div>
      <StepTitle title="Build the spacecraft" chip={`${flown.length} modules`}>
        <RecommendedButton onClick={() => patchDesign(recommendStep("build", design, catalog))} />
      </StepTitle>
      <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
        <div className="min-w-0">
          <div role="tablist" aria-label="What the module is for" className="mb-4 flex flex-wrap gap-1.5">
            {(["all", ...fns] as const).map((f) => {
              const on = tab === f;
              const need = f !== "all" && needs(f);
              return (
                <button
                  key={f}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => setTab(f)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] transition ${
                    on ? "border-cyan/70 bg-cyan/15 text-cyan-bright" : "border-line text-muted hover:text-fg"
                  }`}
                >
                  {f !== "all" && <Icon name={FUNCTION_ICON[f]} size={13} />}
                  {f === "all" ? "All" : f}
                  {need && <span className="h-1.5 w-1.5 rounded-full bg-over" title="Something required here is still missing" />}
                </button>
              );
            })}
          </div>

          <div data-coach="build.modules" className="grid gap-3 sm:grid-cols-2">
            {shown.map((m) => {
              const on = design.moduleIds.includes(m.id);
              return (
                <GlassCard
                  key={m.id}
                  selected={on}
                  onSelect={() => toggle("moduleIds", m.id)}
                  label={`${on ? "Remove" : "Add"} ${m.name}`}
                  className="p-3.5"
                  onPointerEnter={() => setHover(m.id)}
                  onPointerLeave={() => setHover((c) => (c === m.id ? undefined : c))}
                  onFocus={() => setHover(m.id)}
                  onBlur={() => setHover((c) => (c === m.id ? undefined : c))}
                >
                  <div className="flex items-start gap-2.5">
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border transition ${
                      on ? "border-cyan/50 bg-cyan/15 text-cyan" : "border-line bg-white/[0.04] text-muted"
                    }`}>
                      <Icon name={CATEGORY_ICON[m.category]} size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-[15px]">{m.name}</h3>
                      {/* one line on what it does; the numbers live in the chips below */}
                      <p className="truncate text-[12px] text-muted">{m.blurb}</p>
                    </div>
                    <InfoButton title={m.name} body={<ModuleInfo m={m} />} sources={m.sources} verified={m.verified} />
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    <Chip icon="mass">{fmtKg(m.massKg)}</Chip>
                    <Chip icon="power" tone={m.generatesW ? "text-ok" : undefined}>
                      {m.generatesW ? `+${fmtW(m.generatesW)}` : fmtW(m.powerW)}
                    </Chip>
                    <Chip icon="budget">{fmtMUsd(m.costMUsd)}</Chip>
                    {m.tier === "advanced" && <Badge tone="blue">Advanced</Badge>}
                    <span className="ml-auto text-[11px] text-faint">{CATEGORY_LABEL[m.category]}</span>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        </div>

        <aside data-coach="build.ship" className="glass h-fit p-4 xl:sticky xl:top-48">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs uppercase tracking-widest text-faint">Your spacecraft</span>
            {spareMassKg > 0 && (
              <span className="num text-[11px] text-cyan" title="Capacity still free on the rocket. Rideshare sells this.">
                {fmtKg(spareMassKg)} spare
              </span>
            )}
          </div>
          <SpacecraftStack design={design} modules={flown} spareMassKg={spareMassKg} highlightModuleId={hover} payloads={[]} />
        </aside>
      </div>
    </div>
  );
}
