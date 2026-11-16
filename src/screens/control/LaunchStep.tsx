import { massOverKg } from "@/engine";
import type { Destination, LaunchVehicle } from "@/engine/types";
import { Badge, GlassCard, Icon, InfoButton, MonogramBadge } from "@/components/ui";
import { getActor, missionVehicles } from "@/lib/catalog";
import { fmtKg, fmtMUsd, fmtPct, fmtSeconds } from "@/lib/format";
import { useGame } from "@/store/game";
import { DestinationVisual } from "./DestinationVisual";
import { useDesign } from "./useDesign";

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

/** Why a rocket does not fit this design. Only a rocket that cannot reach the orbit is locked. */
interface Fit { locked: boolean; text: string }

function VehicleCard({ v, fit }: { v: LaunchVehicle; fit: Fit | null }) {
  const { design, mission } = useDesign();
  const patch = useGame((s) => s.patchDesign);
  const dest = mission.destinations.find((d) => d.id === design.destinationId) ?? mission.destinations[0];
  const selected = design.launchVehicleId === v.id;
  const actor = getActor(v.providerId);
  const kg = (n?: number) => (n && n > 0 ? fmtKg(n) : "n/a");
  const specs: { key: string; label: string; value: string; on?: boolean }[] = [
    { key: "LEO", label: "To LEO", value: kg(v.capacityKg.LEO ?? v.capacityKg.ISS), on: dest.orbitClass !== "TLI" },
    { key: "TLI", label: "To Moon (TLI)", value: kg(v.capacityKg.TLI), on: dest.orbitClass === "TLI" },
    { key: "cost", label: "Cost", value: fmtMUsd(v.costMUsd) },
    { key: "rel", label: "Reliability", value: fmtPct(v.reliability, 1) },
  ];
  return (
    <GlassCard selected={selected} disabled={!!fit?.locked && !selected} onSelect={() => patch({ launchVehicleId: v.id })} label={`Select ${v.name}`} className="p-4" data-coach="launch.rocket">
      <div className="flex items-start gap-3">
        <MonogramBadge actor={actor} fallbackName={v.providerId} size={38} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0"><h3 className="truncate text-[15px]">{v.name}</h3><div className="truncate text-xs text-muted">{actor?.shortName ?? v.providerId}</div></div>
            <InfoButton title={v.name} body={<p>{v.blurb}{v.reusable ? " Its booster can fly again." : ""}</p>} sources={v.sources} verified={v.verified} />
          </div>
          <p className="truncate text-[13px] text-muted">{v.blurb}</p>
        </div>
      </div>
      <dl className="num mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs sm:grid-cols-4">
        {specs.map((sp) => (
          <div key={sp.key} className={sp.on ? "rounded-md bg-cyan/10 px-1.5 py-0.5 -mx-1.5" : ""}><dt className={sp.on ? "text-cyan" : "text-faint"}>{sp.label}</dt><dd className="text-fg">{sp.value}</dd></div>
        ))}
      </dl>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10" role="img" aria-label={`Reliability ${fmtPct(v.reliability, 1)}`}><div className="h-full rounded-full bg-brand" style={{ width: `${v.reliability * 100}%` }} /></div>
      {fit && <p className="mt-2 flex items-center gap-1.5 text-xs text-over"><Icon name={fit.locked ? "lock" : "warning"} size={12} /> {fit.text}</p>}
    </GlassCard>
  );
}

export function LaunchStep() {
  const { design, mission, catalog } = useDesign();
  const patch = useGame((s) => s.patchDesign);

  const dest = mission.destinations.find((d) => d.id === design.destinationId) ?? mission.destinations[0];

  // A rocket too small for today's spacecraft stays pickable: the mass gauge turns red and says why.
  const fitFor = (v: LaunchVehicle): Fit | null => {
    if (!((v.capacityKg[dest.orbitClass] ?? 0) > 0)) return { locked: true, text: "Cannot reach this orbit" };
    const over = massOverKg({ ...design, launchVehicleId: v.id }, catalog);
    return over > 0 ? { locked: false, text: `Too heavy by ${fmtKg(over)}` } : null;
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display mb-4 text-lg sm:text-xl">Where will your mission go?</h2>
        <div className="mb-4"><DestinationVisual dest={dest} /></div>
        <div className="grid gap-4 md:grid-cols-3" data-coach="launch.destinations">
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
        <h2 className="font-display mb-4 text-lg sm:text-xl">Pick a rocket</h2>
        <div className="grid gap-4 sm:grid-cols-2" data-coach="launch.rockets">
          {missionVehicles(mission).map((v) => <VehicleCard key={v.id} v={v} fit={fitFor(v)} />)}
        </div>
      </div>
    </div>
  );
}
