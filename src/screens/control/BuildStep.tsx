import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Badge, Button, GlassCard, Icon, InfoButton, RecommendedButton, type IconName } from "@/components/ui";
import { AnchoredBubble } from "@/components/tutorial";
import { batteryShortWh, computeResources, recommendStep, validateDesign } from "@/engine";
import type { MissionDesign, Module, ModuleCategory } from "@/engine/types";
import { CATEGORY_LABEL, getActor, missionModules } from "@/lib/catalog";
import { fmtKg, fmtMUsd, fmtW } from "@/lib/format";
import { useGame } from "@/store/game";
import { useGuide } from "@/store/guide";
import { SpacecraftStack } from "./SpacecraftStack";
import { useDesign } from "./useDesign";

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

/**
 * The night-power warning, right under the gauges: the player sees the shortfall while building,
 * instead of meeting it as a refusal at the review.
 */
function NightPowerWarning({ design, shortWh, onShowMe }: { design: MissionDesign; shortWh: number; onShowMe: () => void }) {
  void design;
  return (
    <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-tight/45 bg-tight/10 px-4 py-3" role="status" aria-live="polite">
      <Icon name="warning" size={16} className="shrink-0 text-tight" />
      <p className="m-0 min-w-0 flex-1 text-sm text-fg">
        <span className="num">Night power short by {fmtWh(shortWh)}.</span> Add a bigger battery or cut the night load.
      </p>
      <Button size="sm" onClick={onShowMe}><Icon name="arrow" size={14} /> Show me</Button>
    </div>
  );
}

const fmtWh = (wh: number) => `${Math.round(wh).toLocaleString("en-US")} Wh`;

export function BuildStep() {
  const { design, mission, catalog } = useDesign();
  const toggle = useGame((s) => s.toggleIn);
  const patchDesign = useGame((s) => s.patchDesign);
  const focus = useGuide((s) => s.focus);
  const showMe = useGuide((s) => s.showMe);
  const clearFocus = useGuide((s) => s.clearFocus);
  const flashGauges = useGuide((s) => s.flashGauges);
  const all = useMemo(() => missionModules(mission), [mission]);
  const [tab, setTab] = useState<Fn | "all">("all");
  const [hover, setHover] = useState<string | undefined>();

  // what the dark period still needs, so the player can fix it before the council ever sees it
  const issues = useMemo(() => validateDesign(design, catalog), [design, catalog]);
  const shortWh = batteryShortWh(issues);

  // the module "Show me where" asked us to point at, if it is one this mission offers
  const spot = focus?.step === "build" && focus.moduleId && all.some((m) => m.id === focus.moduleId) ? focus : null;
  // open the tab that holds it, so the card is on screen
  useEffect(() => {
    if (!spot?.moduleId) return;
    const m = all.find((x) => x.id === spot.moduleId);
    if (m) setTab(FUNCTION_OF[m.category]);
  }, [spot?.moduleId, all]);
  // the pointer is answered once the part is aboard
  useEffect(() => {
    if (spot?.moduleId && design.moduleIds.includes(spot.moduleId)) clearFocus();
  }, [spot?.moduleId, design.moduleIds, clearFocus]);

  const showBattery = () => {
    const best = all
      .filter((m) => (m.storageWh ?? 0) > 0 && !design.moduleIds.includes(m.id))
      .sort((a, b) => (b.storageWh ?? 0) - (a.storageWh ?? 0))[0];
    showMe({
      step: "build",
      moduleId: best?.id,
      pose: "point",
      text: best ? `The ${best.name} carries the base through the night. Tap to add it.` : "Open Power and cut what runs at night.",
    });
    if (!best) setTab("Power");
  };

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
      {/* no title here: Mission Control already heads every step with a big one */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <span className="rounded-full border border-violet/40 bg-violet/10 px-3 py-0.5 text-xs text-violet-bright">{flown.length} modules</span>
        <RecommendedButton data-coach="build.recommended" onClick={() => patchDesign(recommendStep("build", design, catalog))} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
        <div className="min-w-0">
          {shortWh > 0 && <NightPowerWarning design={design} shortWh={shortWh} onShowMe={showBattery} />}
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
            {shown.map((m, n) => {
              const on = design.moduleIds.includes(m.id);
              const pointed = spot?.moduleId === m.id;
              return (
                <GlassCard
                  key={m.id}
                  selected={on}
                  data-coach={pointed ? "build.focus" : n === 0 ? "build.module" : undefined}
                  onSelect={() => { if (!on) flashGauges(["power", "mass", "budget"]); toggle("moduleIds", m.id); }}
                  label={`${on ? "Remove" : "Add"} ${m.name}`}
                  className={`p-3.5 ${pointed ? "ring-2 ring-cyan" : ""}`}
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
      {spot && (
        <AnchoredBubble anchor="build.focus" pose={spot.pose} tipKey={`build:${spot.moduleId ?? "step"}`} spotlight>
          <p className="m-0 text-[15px] leading-snug text-fg">{spot.text}</p>
          <div className="mt-3 flex justify-end">
            <Button size="sm" onClick={clearFocus}>Got it</Button>
          </div>
        </AnchoredBubble>
      )}
    </div>
  );
}
