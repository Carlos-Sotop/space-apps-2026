import { computeResources } from "@/engine";
import type { RideshareOffer } from "@/engine/types";
import { Badge, GlassCard, Icon, InfoButton, MonogramBadge } from "@/components/ui";
import { getActor, missionOffers } from "@/lib/catalog";
import { fmtKg, fmtMUsd, fmtW } from "@/lib/format";
import { useGame } from "@/store/game";
import { StepTitle, useDesign } from "./useDesign";

function Spare({ label, value, text }: { label: string; value: number; text: string }) {
  const tone = value < 0 ? "var(--over)" : "var(--ok)";
  return (
    <div className="glass flex-1 p-4">
      <div className="text-xs uppercase tracking-widest text-faint">{label}</div>
      <div className="num font-display mt-1 text-2xl sm:text-3xl" style={{ color: tone }}>{text}</div>
    </div>
  );
}

export function RideshareStep() {
  const { design, mission, catalog } = useDesign();
  const toggle = useGame((s) => s.toggleIn);
  const report = computeResources(design, catalog);
  const spareMass = report.mass.capacity - report.mass.used;
  const sparePower = report.power.capacity - report.power.used;

  const fits = (o: RideshareOffer) => {
    const r = computeResources({ ...design, rideshareIds: [...design.rideshareIds, o.id] }, catalog);
    return r.mass.status !== "over" && r.power.status !== "over" && r.data.status !== "over";
  };

  return (
    <div>
      <StepTitle title="Spare capacity market" chip="Fill empty seats, fund the mission" />
      <div className="mb-5 flex flex-col gap-4 sm:flex-row">
        <Spare label="Spare mass" value={spareMass} text={`${spareMass < 0 ? "-" : ""}${fmtKg(Math.abs(spareMass))}`} />
        <Spare label="Spare power" value={sparePower} text={`${sparePower < 0 ? "-" : ""}${fmtW(Math.abs(sparePower))}`} />
        <Spare label="Treasury left" value={report.budget.capacity - report.budget.used} text={fmtMUsd(report.budget.capacity - report.budget.used)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {missionOffers(mission).map((o) => {
          const on = design.rideshareIds.includes(o.id);
          const ok = on || fits(o);
          const a = getActor(o.actorId);
          return (
            <GlassCard key={o.id} selected={on} disabled={!ok} onSelect={() => toggle("rideshareIds", o.id)} label={`${on ? "Remove" : "Accept"} ${o.payloadName}`} className="p-4">
              <div className="flex items-start gap-3">
                <MonogramBadge actor={a} fallbackName={o.actorId} size={38} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="truncate text-[15px]">{o.payloadName}</h3>
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
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
