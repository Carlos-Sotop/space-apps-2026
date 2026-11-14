import { computeResources } from "@/engine";
import type { Destination, LaunchVehicle } from "@/engine/types";
import { Badge, GlassCard, Icon, InfoButton, MonogramBadge } from "@/components/ui";
import { getActor, missionVehicles } from "@/lib/catalog";
import { fmtKg, fmtMUsd, fmtPct, fmtSeconds } from "@/lib/format";
import { useGame } from "@/store/game";
import { StepTitle, useDesign } from "./useDesign";

function Meter({ label, value, max = 1, text }: { label: string; value: number; max?: number; text?: string }) {
  return (
    <div className="flex items-center gap-2 text-[11px] text-muted">
      <span className="w-14">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(1, value / max) * 100}%` }} /></div>
      <span className="num w-10 text-right">{text ?? fmtPct(value)}</span>
    </div>
  );
}

function DestInfo({ d }: { d: Destination }) {
  return (
    <>
      <p>{d.tradeoff}</p>
      <ul className="num space-y-1 text-sm text-muted">
        <li>Orbit class: <span className="text-fg">{d.orbitClass}</span></li>
        <li>Sunlight: <span className="text-fg">{fmtPct(d.sunlightFraction)}</span></li>
        <li>Direct link to Earth: <span className="text-fg">{fmtPct(d.earthLinkFraction)}</span></li>
        <li>Light time to Earth: <span className="text-fg">{fmtSeconds(d.lightTimeS)}</span></li>
        <li>Arrival success factor: <span className="text-fg">{d.arrivalFactor}</span></li>
      </ul>
    </>
  );
}

function VehicleCard({ v, reason }: { v: LaunchVehicle; reason: string | null }) {
  const { design, mission } = useDesign();
  const patch = useGame((s) => s.patchDesign);
  const dest = mission.destinations.find((d) => d.id === design.destinationId) ?? mission.destinations[0];
  const selected = design.launchVehicleId === v.id;
  const cap = (v.capacityKg[dest.orbitClass] ?? 0) * dest.capacityFactor;
  return (
    <GlassCard selected={selected} disabled={!!reason && !selected} onSelect={() => patch({ launchVehicleId: v.id })} label={`Select ${v.name}`} className="p-4">
      <div className="flex items-start gap-3">
        <MonogramBadge actor={getActor(v.providerId)} fallbackName={v.providerId} size={38} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate text-[15px]">{v.name}</h3>
            <InfoButton title={v.name} body={<p>{v.blurb}{v.reusable ? " Its booster can fly again." : ""}</p>} sources={v.sources} verified={v.verified} />
          </div>
          <p className="truncate text-[13px] text-muted">{v.blurb}</p>
        </div>
      </div>
      <dl className="num mt-3 grid grid-cols-3 gap-2 text-xs">
        <div><dt className="text-faint">To {dest.orbitClass}</dt><dd className="text-fg">{cap > 0 ? fmtKg(cap) : "none"}</dd></div>
        <div><dt className="text-faint">Price</dt><dd className="text-fg">{fmtMUsd(v.costMUsd)}</dd></div>
        <div><dt className="text-faint">Reliability</dt><dd className="text-fg">{fmtPct(v.reliability, 1)}</dd></div>
      </dl>
      {reason && <p className="mt-2 flex items-center gap-1.5 text-xs text-over"><Icon name="lock" size={12} /> {reason}</p>}
    </GlassCard>
  );
}

export function LaunchStep() {
  const { design, mission, catalog } = useDesign();
  const patch = useGame((s) => s.patchDesign);

  const reasonFor = (v: LaunchVehicle): string | null => {
    const g = computeResources({ ...design, launchVehicleId: v.id }, catalog).mass;
    if (g.capacity <= 0) return "Cannot reach this orbit";
    if (g.used > g.capacity) return `Too heavy by ${fmtKg(g.used - g.capacity)}`;
    return null;
  };

  return (
    <div className="space-y-8">
      <div>
        <StepTitle title="Where are we going?" />
        <div className="grid gap-4 md:grid-cols-3">
          {mission.destinations.map((d) => (
            <GlassCard key={d.id} selected={design.destinationId === d.id} onSelect={() => patch({ destinationId: d.id })} label={`Select ${d.name}`} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-[15px] leading-snug">{d.name}</h3>
                <InfoButton title={d.name} body={<DestInfo d={d} />} />
              </div>
              <p className="mt-1 truncate text-[13px] text-muted">{d.tradeoff}</p>
              <div className="mt-3 space-y-1.5">
                <Meter label="Sunlight" value={d.sunlightFraction} />
                <Meter label="Earth link" value={d.earthLinkFraction} />
                <Meter label="Science" value={d.scienceFactor} max={1.5} text={`x${d.scienceFactor}`} />
              </div>
              <div className="mt-2"><Badge>{d.orbitClass}</Badge></div>
            </GlassCard>
          ))}
        </div>
      </div>
      <div>
        <StepTitle title="Pick a rocket" />
        <div className="grid gap-4 sm:grid-cols-2">
          {missionVehicles(mission).map((v) => <VehicleCard key={v.id} v={v} reason={reasonFor(v)} />)}
        </div>
      </div>
    </div>
  );
}
