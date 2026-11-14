import { computeResources } from "@/engine";
import type { RideshareOffer } from "@/engine/types";
import { Badge, GlassCard, Icon, InfoButton, MonogramBadge } from "@/components/ui";
import { getActor, missionOffers } from "@/lib/catalog";
import { fmtGbPerDay, fmtKg, fmtMUsd, fmtW } from "@/lib/format";
import { useGame } from "@/store/game";
import { StepTitle, useDesign } from "./useDesign";

function Spare({ label, spare, used, capacity, text }: { label: string; spare: number; used: number; capacity: number; text: string }) {
  const tone = spare < 0 ? "var(--over)" : spare / (capacity || 1) < 0.1 ? "var(--tight)" : "var(--ok)";
  const pct = Math.min(100, Math.max(0, (used / (capacity || 1)) * 100));
  return (
    <div className="glass flex-1 p-4">
      <div className="text-xs uppercase tracking-widest text-faint">{label}</div>
      <div className="num font-display mt-1 text-2xl sm:text-3xl" style={{ color: tone }}>{text}</div>
      {capacity > 0 && (
        <div className="mt-3" role="img" aria-label={`${Math.round(pct)}% used`}>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: tone }} /></div>
        </div>
      )}
    </div>
  );
}

const GAUGES = [
  { key: "mass", label: "mass", fmt: fmtKg },
  { key: "power", label: "power", fmt: fmtW },
  { key: "data", label: "data", fmt: fmtGbPerDay },
] as const;

export function RideshareStep() {
  const { design, mission, catalog } = useDesign();
  const toggle = useGame((s) => s.toggleIn);
  const report = computeResources(design, catalog);
  const spareMass = report.mass.capacity - report.mass.used;
  const sparePower = report.power.capacity - report.power.used;

  /** Whether the seat fits, what it leaves over, or which resource it breaks and by how much. */
  const check = (o: RideshareOffer) => {
    const r = computeResources({ ...design, rideshareIds: [...design.rideshareIds, o.id] }, catalog);
    const broken = GAUGES.find((g) => r[g.key].status === "over");
    if (broken) return { ok: false as const, text: `Over on ${broken.label} by ${broken.fmt(r[broken.key].used - r[broken.key].capacity)}` };
    return { ok: true as const, text: `Leaves ${fmtKg(r.mass.capacity - r.mass.used)} and ${fmtW(r.power.capacity - r.power.used)}` };
  };
  const offers = missionOffers(mission);
  const accepted = offers.filter((o) => design.rideshareIds.includes(o.id));
  const income = accepted.reduce((a, o) => a + o.paysMUsd, 0);
  const science = accepted.reduce((a, o) => a + o.scienceValue, 0);

  return (
    <div>
      <StepTitle title="Spare capacity market" chip="Fill empty seats, fund the mission" />
      <div className="mb-5 flex flex-col gap-4 sm:flex-row">
        <Spare label="Spare mass" spare={spareMass} used={report.mass.used} capacity={report.mass.capacity} text={`${spareMass < 0 ? "-" : ""}${fmtKg(Math.abs(spareMass))}`} />
        <Spare label="Spare power" spare={sparePower} used={report.power.used} capacity={report.power.capacity} text={`${sparePower < 0 ? "-" : ""}${fmtW(Math.abs(sparePower))}`} />
        <Spare label="Treasury left" spare={report.budget.capacity - report.budget.used} used={report.budget.used} capacity={report.budget.capacity} text={fmtMUsd(report.budget.capacity - report.budget.used)} />
      </div>
      <p className="mb-4 text-sm text-muted" aria-live="polite">
        {accepted.length
          ? <><span className="text-fg">{accepted.length} seat{accepted.length > 1 ? "s" : ""} filled</span>: <span className="num text-ok">+{fmtMUsd(income)}</span> into the treasury, <span className="num text-violet-bright">+{science}</span> shared science, +{10 * accepted.length} collaboration score.</>
          : "No seats filled yet. Each partner payload pays the treasury and adds to your collaboration score."}
      </p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {offers.map((o) => {
          const on = design.rideshareIds.includes(o.id);
          const c = on ? null : check(o);
          const ok = on || !!c?.ok;
          const a = getActor(o.actorId);
          return (
            <GlassCard key={o.id} selected={on} disabled={!ok} onSelect={() => toggle("rideshareIds", o.id)} label={`${on ? "Remove" : "Accept"} ${o.payloadName}`} className="p-4">
              <div className="flex items-start gap-3">
                <MonogramBadge actor={a} fallbackName={o.actorId} size={38} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="line-clamp-2 text-[15px] leading-snug">{o.payloadName}</h3>
                    <InfoButton title={o.payloadName} body={<><p>{o.blurb}</p><p className="text-sm text-muted">Offered by {a?.name ?? o.actorId}. They pay {fmtMUsd(o.paysMUsd)} into the treasury for the seat.</p></>} sources={o.sources} verified={o.verified} />
                  </div>
                  <p className="truncate text-xs text-muted">{a?.shortName ?? o.actorId}</p>
                </div>
              </div>
              <dl className="num mt-3 grid grid-cols-4 gap-2 text-xs">
                <div><dt className="text-faint">Mass</dt><dd>{fmtKg(o.massKg)}</dd></div>
                <div><dt className="text-faint">Power</dt><dd>{fmtW(o.powerW)}</dd></div>
                <div><dt className="text-faint">Pays</dt><dd className="text-ok">{fmtMUsd(o.paysMUsd)}</dd></div>
                <div><dt className="text-faint">Science</dt><dd>+{o.scienceValue}</dd></div>
              </dl>
              <div className="mt-3">
                {on ? <Badge tone="ok"><Icon name="check" size={12} /> Accepted</Badge> : ok ? <Badge tone="ok">Fits</Badge> : <Badge tone="over">Will not fit</Badge>}
                {c && <p className={`mt-2 text-xs ${ok ? "text-faint" : "text-over"}`}>{c.text}</p>}
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
