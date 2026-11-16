import { useEffect, useRef, useState } from "react";
import { animate, motion, useReducedMotion } from "motion/react";
import { sfx } from "@/components/audio";
import { Badge, Button, GlassCard, Icon, InfoButton, MonogramBadge, StepHeader, type IconName } from "@/components/ui";
import { computeResources } from "@/engine";
import type { RideshareOffer } from "@/engine/types";
import { getActor, missionOffers } from "@/lib/catalog";
import { fmtGbPerDay, fmtKg, fmtMUsd, fmtW } from "@/lib/format";
import { useGame } from "@/store/game";
import { STEPS } from "@/store/steps";
import { useDesign } from "./useDesign";

/** Number that ticks from its last value to the new one. */
function CountUp({ value, fmt }: { value: number; fmt: (n: number) => string }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(value);
  const last = useRef(value);
  useEffect(() => {
    const from = last.current;
    last.current = value;
    const c = animate(from, value, { duration: reduced ? 0 : 0.7, ease: "easeOut", onUpdate: setShown });
    return () => c.stop();
  }, [value, reduced]);
  return <>{fmt(shown)}</>;
}

function Chip({ icon, text, good }: { icon: IconName; text: string; good?: boolean }) {
  return <span className={`num inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${good ? "border-ok/35 bg-ok/10 text-ok" : "border-white/15 text-muted"}`}><Icon name={icon} size={12} />{text}</span>;
}

/** Your payload, accepted payloads and the spare room left, as one bar. */
function CargoBay({ own, seats, capacity }: { own: number; seats: { id: string; kg: number; color: string; name: string }[]; capacity: number }) {
  const total = Math.max(capacity, own + seats.reduce((s, x) => s + x.kg, 0), 1);
  const pct = (kg: number) => `${Math.max(0, (kg / total) * 100)}%`;
  const spare = capacity - own - seats.reduce((s, x) => s + x.kg, 0);
  return (
    <div className="flex h-7 overflow-hidden rounded-lg border border-line bg-white/5" role="img" aria-label={`Your payload ${fmtKg(own)}, ${seats.length} rideshare payloads, ${fmtKg(Math.max(0, spare))} spare`}>
      <div className="h-full bg-violet/70" style={{ width: pct(own) }} title={`Your payload: ${fmtKg(own)}`} />
      {seats.map((s) => (
        <motion.div key={s.id} className="h-full border-l border-[#04050d]/60" style={{ background: s.color }} initial={{ width: 0 }} animate={{ width: pct(s.kg) }} transition={{ duration: 0.4 }} title={`${s.name}: ${fmtKg(s.kg)}`} />
      ))}
      {spare > 0 && <div className="h-full flex-1 bg-cyan/20" style={{ backgroundImage: "repeating-linear-gradient(135deg, rgba(34,211,238,0.25) 0 6px, transparent 6px 12px)" }} title={`Spare: ${fmtKg(spare)}`} />}
    </div>
  );
}

export function RideshareStep() {
  const { design, mission, catalog } = useDesign();
  const toggle = useGame((s) => s.toggleIn);
  const setStep = useGame((s) => s.setStep);
  const report = computeResources(design, catalog);
  const offers = missionOffers(mission);
  const accepted = offers.filter((o) => design.rideshareIds.includes(o.id));
  const income = accepted.reduce((s, o) => s + o.paysMUsd, 0);
  const seatKg = accepted.reduce((s, o) => s + o.massKg, 0);
  const spareMass = report.mass.capacity - report.mass.used;
  const sparePower = report.power.capacity - report.power.used;
  const idx = STEPS.findIndex((s) => s.id === "rideshare");

  /** Whether the seat fits, what it leaves over, or which resource it breaks and by how much. */
  const check = (o: RideshareOffer) => {
    const r = computeResources({ ...design, rideshareIds: [...design.rideshareIds, o.id] }, catalog);
    if (r.mass.status === "over") return { ok: false, text: `${fmtKg(r.mass.used - r.mass.capacity)} too heavy` };
    if (r.power.status === "over") return { ok: false, text: `${fmtW(r.power.used - r.power.capacity)} short on power` };
    return { ok: true, text: r.data.status === "over" ? "Fits, but data will pile up" : `Leaves ${fmtKg(r.mass.capacity - r.mass.used)}` };
  };
  const checks = new Map(offers.map((o) => [o.id, design.rideshareIds.includes(o.id) ? null : check(o)]));
  const full = offers.every((o) => design.rideshareIds.includes(o.id) || !checks.get(o.id)?.ok);

  const onToggle = (o: RideshareOffer) => {
    sfx(design.rideshareIds.includes(o.id) ? "click" : "select");
    toggle("rideshareIds", o.id);
  };

  return (
    <div>
      <StepHeader eyebrow={idx >= 0 ? `Step ${idx + 1} of ${STEPS.length}` : undefined} title="Rideshare market" subtitle="Your rocket has spare room. Rent it to other teams' experiments and earn budget." />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-[1.6fr_1fr_1fr]">
        <div className="glass col-span-2 p-4 lg:col-span-1" data-coach="rideshare.spare">
          <div className="flex items-baseline justify-between gap-3">
            <div className="text-xs uppercase tracking-widest text-faint">Spare room</div>
            <div className="num text-xs text-muted">of {fmtKg(report.mass.capacity)}</div>
          </div>
          <div className="num font-display mb-3 mt-1 text-2xl sm:text-3xl" style={{ color: spareMass < 0 ? "var(--over)" : spareMass > 0 ? "var(--cyan)" : "var(--tight)" }}>
            <CountUp value={spareMass} fmt={(n) => `${n < 0 ? "-" : ""}${fmtKg(Math.abs(n))}`} />
          </div>
          <CargoBay own={report.mass.used - seatKg} capacity={report.mass.capacity} seats={accepted.map((o) => ({ id: o.id, kg: o.massKg, color: getActor(o.actorId)?.color ?? "#8b93c9", name: o.payloadName }))} />
        </div>
        <div className="glass p-4">
          <div className="text-xs uppercase tracking-widest text-faint">Spare power</div>
          <div className="num font-display mt-1 text-2xl sm:text-3xl" style={{ color: sparePower < 0 ? "var(--over)" : "var(--fg)" }}>
            <CountUp value={sparePower} fmt={(n) => `${n < 0 ? "-" : ""}${fmtW(Math.abs(n))}`} />
          </div>
        </div>
        <div className="glass p-4" data-coach="rideshare.earned">
          <div className="text-xs uppercase tracking-widest text-faint">Earned</div>
          <div className="num font-display mt-1 text-2xl text-ok sm:text-3xl">+<CountUp value={income} fmt={fmtMUsd} /></div>
          {income === 0 && <p className="mt-2 text-xs text-muted">Each payload pays into your budget</p>}
          {income > 0 && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-muted">You earned {fmtMUsd(income)}: spend it in Build</span>
              <Button className="!h-8 !px-3 text-xs" onClick={() => setStep("build")}><Icon name="build" size={14} /> Build</Button>
            </motion.div>
          )}
        </div>
      </div>

      {full && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-tight/40 bg-tight/10 px-4 py-3" data-coach="rideshare.full">
          <Icon name="warning" size={18} className="shrink-0 text-tight" />
          <span className="min-w-0 flex-1 text-sm">No room for another payload: a bigger spacecraft or rocket opens seats.</span>
          <Button className="!h-8 !px-3 text-xs" onClick={() => setStep("build")}>Bigger spacecraft</Button>
          <Button className="!h-8 !px-3 text-xs" onClick={() => setStep("launch")}>Bigger rocket</Button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" data-coach="rideshare.offers">
        {offers.map((o) => {
          const on = design.rideshareIds.includes(o.id);
          const c = checks.get(o.id);
          const ok = on || !!c?.ok;
          const a = getActor(o.actorId);
          return (
            <GlassCard key={o.id} selected={on} disabled={!ok} onSelect={() => onToggle(o)} label={`${on ? "Remove" : "Accept"} ${o.payloadName}`} className="flex flex-col p-4">
              <div className="flex items-start gap-3">
                <MonogramBadge actor={a} fallbackName={o.actorId} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="line-clamp-2 text-[15px] leading-snug">{o.payloadName}</h3>
                    <InfoButton
                      title={o.payloadName}
                      body={<>
                        <p>{o.blurb}</p>
                        <p className="text-sm text-muted">Offered by {a?.name ?? o.actorId}. They pay {fmtMUsd(o.paysMUsd)} into the treasury for the seat, and their payload uses {fmtKg(o.massKg)}, {fmtW(o.powerW)} and {fmtGbPerDay(o.dataGbPerDay)} of your downlink.</p>
                        {o.example && <p className="text-sm text-muted">Example: the request is made up for the game; the satellite it builds on is real (see sources).</p>}
                      </>}
                      sources={o.sources}
                      verified={o.verified}
                    />
                  </div>
                  <p className="truncate text-xs text-muted">{a?.shortName ?? o.actorId}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Chip icon="funding" text={`+${fmtMUsd(o.paysMUsd)}`} good />
                <Chip icon="science" text={`+${o.scienceValue}`} good />
                <Chip icon="mass" text={fmtKg(o.massKg)} />
                <Chip icon="power" text={fmtW(o.powerW)} />
                <Chip icon="data" text={fmtGbPerDay(o.dataGbPerDay)} />
              </div>
              <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                {o.example ? <Badge>Example</Badge> : <span />}
                {on ? <Badge tone="cyan"><Icon name="check" size={12} /> On board</Badge>
                  : <span className={`truncate text-xs ${ok ? "text-ok" : "text-over"}`}>{c?.text}</span>}
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
