import { AnimatePresence, motion } from "motion/react";
import { sfx } from "@/components/audio";
import { Badge, GlassCard, Icon, InfoButton, MonogramBadge, StepHeader, type IconName } from "@/components/ui";
import { blueprintFit, reciprocityDue } from "@/engine";
import type { Blueprint, ModuleCategory, StatKey } from "@/engine/types";
import { actorName, getActor, getModule } from "@/lib/catalog";
import { fmtKg, fmtMUsd, fmtW } from "@/lib/format";
import { describeModifiers } from "@/lib/modifiers";
import { useGame } from "@/store/game";
import { STEPS } from "@/store/steps";
import { LineageTree } from "./LineageTree";
import { useDesign } from "./useDesign";

const GAIN: Record<StatKey, { icon: IconName; label: string }> = {
  launchCost: { icon: "budget", label: "launch cost" },
  launchCapacity: { icon: "mass", label: "lift" },
  launchReliability: { icon: "launch", label: "launch" },
  moduleMass: { icon: "mass", label: "mass" },
  moduleCost: { icon: "budget", label: "cost" },
  modulePower: { icon: "power", label: "power use" },
  powerGeneration: { icon: "power", label: "power" },
  downlinkRate: { icon: "data", label: "downlink" },
  scienceValue: { icon: "science", label: "science" },
  landingReliability: { icon: "landing", label: "landing" },
  lifetime: { icon: "lifetime", label: "life" },
  treasury: { icon: "funding", label: "treasury" },
};

/** What a design must carry for an open design to attach, in plain words. */
const HOST: Partial<Record<ModuleCategory, string>> = {
  computer: "a flight computer", power: "a solar array", rover: "a rover", lander: "a lander",
  experiment: "an experiment", comms: "a radio", instrument: "an instrument", bus: "a bus",
};

function Chip({ icon, text, tone }: { icon: IconName; text: string; tone: "ok" | "tight" | "over" }) {
  const cls = { ok: "border-ok/35 bg-ok/10 text-ok", tight: "border-tight/35 bg-tight/10 text-tight", over: "border-over/40 bg-over/10 text-over" }[tone];
  return <span className={`num inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${cls}`}><Icon name={icon} size={12} />{text}</span>;
}

function gains(b: Blueprint) {
  return b.modifiers.map((m) => {
    const pct = m.op === "mul" ? Math.round((m.value - 1) * 100) : Math.round(m.value * 100);
    // lower mass or cost is a gain; for everything else higher is better
    const good = m.stat === "moduleMass" || m.stat === "moduleCost" || m.stat === "launchCost" || m.stat === "modulePower" ? pct < 0 : pct > 0;
    return { icon: GAIN[m.stat].icon, text: `${pct > 0 ? "+" : ""}${pct}% ${GAIN[m.stat].label}`, good };
  });
}

function costs(b: Blueprint) {
  const i = b.integration ?? {};
  return [
    i.massKg ? { icon: "mass" as const, text: `+${fmtKg(i.massKg)}` } : null,
    i.powerW ? { icon: "power" as const, text: `+${fmtW(i.powerW)}` } : null,
    i.costMUsd ? { icon: "budget" as const, text: fmtMUsd(i.costMUsd) } : null,
  ].filter((x) => !!x);
}

function BlueprintInfo({ b, parent }: { b: Blueprint; parent?: Blueprint }) {
  const c = costs(b);
  return (
    <>
      <p>{b.summary}</p>
      <p className="text-sm text-muted">Shared by <span className="text-fg">{getActor(b.authorId)?.name ?? b.authorId}</span>{parent && <>, forked from <span className="text-fg">{parent.name}</span></>}.</p>
      <p className="num text-sm text-violet-bright">{describeModifiers(b.modifiers)}</p>
      {c.length > 0 && <p className="text-sm text-muted">Integrating it costs {c.map((x) => x.text).join(", ")}: adapters, extra load and test work on your spacecraft.</p>}
      <p className="text-sm text-muted">Open designs are free to use. Adopting one credits its author, and you share your own design back at the Debrief.</p>
      {b.example && <p className="text-sm text-muted">Example: the design is made up for the game; the technology behind it is real (see sources).</p>}
      {b.contentHash && <p className="num break-all text-xs text-faint">Content hash {b.contentHash}</p>}
    </>
  );
}

export function OpenTechStep() {
  const { design, catalog } = useDesign();
  const toggle = useGame((s) => s.toggleIn);
  const setStep = useGame((s) => s.setStep);
  const byId = new Map(catalog.blueprints.map((b) => [b.id, b]));
  const fits = new Map(catalog.blueprints.map((b) => [b.id, blueprintFit(b, design, catalog)]));
  // only designs this mission could carry; the ones that fit right now come first
  const list = catalog.blueprints
    .filter((b) => (fits.get(b.id)?.optionIds.length ?? 0) > 0)
    .sort((a, b) => Number(!!fits.get(b.id)?.ok) - Number(!!fits.get(a.id)?.ok));
  const adopted = design.blueprintIds.map((id) => byId.get(id)).filter((b): b is Blueprint => !!b);
  // credit flows up the fork chain: adopting a fork also credits the authors it was built on
  const credited = new Set<string>();
  adopted.forEach((b) => { for (let cur: Blueprint | undefined = b, n = 0; cur && n < 8; cur = cur.parentId ? byId.get(cur.parentId) : undefined, n++) credited.add(cur.authorId); });
  const owed = reciprocityDue(design);
  const idx = STEPS.findIndex((s) => s.id === "opentech");

  const onToggle = (b: Blueprint) => {
    sfx(design.blueprintIds.includes(b.id) ? "click" : "select");
    toggle("blueprintIds", b.id);
  };

  return (
    <div>
      <StepHeader eyebrow={idx >= 0 ? `Step ${idx + 1} of ${STEPS.length}` : undefined} title="Open Tech Registry" subtitle="Free designs shared by other agencies. Adopt one, credit its author, share yours back." />

      <AnimatePresence>
        {owed && (
          <motion.div
            key="owed" data-coach="opentech.owed"
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-cyan/40 bg-cyan/10 px-4 py-3" aria-live="polite"
          >
            <Icon name="fork" size={18} className="shrink-0 text-cyan" />
            <span className="min-w-0 flex-1 text-sm">You owe the registry <span className="num text-cyan-bright">{adopted.length}</span> design{adopted.length > 1 ? "s" : ""} back: publish yours at the Debrief.</span>
            <span className="flex items-center gap-1.5" aria-label={`Credited: ${[...credited].map(actorName).join(", ")}`}>
              {[...credited].map((id) => <MonogramBadge key={id} actor={getActor(id)} fallbackName={id} size={22} />)}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <div className="grid gap-3 sm:grid-cols-2" data-coach="opentech.cards">
          {list.map((b) => {
            const on = design.blueprintIds.includes(b.id);
            const fit = fits.get(b.id)!;
            const parent = b.parentId ? byId.get(b.parentId) : undefined;
            const hostCat = getModule(fit.optionIds[0] ?? "")?.category;
            const needs = `Needs ${(hostCat && HOST[hostCat]) ?? "a host module"}`;
            const a = getActor(b.authorId);
            return (
              <GlassCard key={b.id} selected={on} disabled={!fit.ok && !on} onSelect={() => onToggle(b)} label={`${on ? "Remove" : "Adopt"} ${b.name}`} className="flex flex-col p-4">
                <div className="flex items-start gap-3">
                  <MonogramBadge actor={a} fallbackName={b.authorId} size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="line-clamp-2 text-[15px] leading-snug">{b.name}</h3>
                      <InfoButton title={b.name} body={<BlueprintInfo b={b} parent={parent} />} sources={b.sources} />
                    </div>
                    <p className="flex min-w-0 items-center gap-1 text-xs text-muted">
                      {parent && <Icon name="fork" size={12} className="shrink-0" />}
                      <span className="truncate">{parent ? `${actorName(b.authorId)}, forked from ${actorName(parent.authorId)}` : `Shared by ${actorName(b.authorId)}`}{b.provenance && <span className="text-cyan"> · {b.provenance}</span>}</span>
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {gains(b).map((g, i) => <Chip key={`g${i}`} icon={g.icon} text={g.text} tone={g.good ? "ok" : "tight"} />)}
                  {costs(b).map((c, i) => <Chip key={`c${i}`} icon={c.icon} text={c.text} tone="tight" />)}
                </div>
                <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                  {b.example ? <Badge>Example</Badge> : <Badge tone="cyan">Real design</Badge>}
                  {fit.ok ? (
                    <span className={`flex shrink-0 items-center gap-1 rounded-full border px-3 py-1 text-xs ${on ? "border-cyan/60 bg-cyan/10 text-cyan" : "border-white/15 text-muted"}`}>{on ? <><Icon name="check" size={14} /> Adopted</> : "Adopt"}</span>
                  ) : (
                    <button type="button" onClick={(e) => { e.stopPropagation(); setStep("build"); }} className="pointer-events-auto relative z-10 flex shrink-0 items-center gap-1 rounded-full border border-over/50 bg-over/10 px-3 py-1 text-xs text-over hover:bg-over/20">
                      <Icon name="build" size={13} /> {on ? `Does nothing. ${needs}` : needs}
                    </button>
                  )}
                </div>
              </GlassCard>
            );
          })}
        </div>
        <aside className="glass h-fit p-4" data-coach="opentech.lineage">
          <div className="mb-3 text-xs uppercase tracking-widest text-faint">Who built on whom</div>
          <LineageTree blueprints={list} adopted={design.blueprintIds} onToggle={(id) => { const b = byId.get(id); if (b && (fits.get(id)?.ok || design.blueprintIds.includes(id))) onToggle(b); }} />
          <p className="mt-3 text-xs text-faint">Each line runs from a design to the fork built on it.</p>
        </aside>
      </div>
    </div>
  );
}
