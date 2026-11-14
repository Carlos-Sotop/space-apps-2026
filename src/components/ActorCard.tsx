import type { Actor } from "@/engine/types";
import { Badge } from "@/components/ui/Badge";
import { GlassCard } from "@/components/ui/GlassCard";
import { Icon, type IconName } from "@/components/ui/Icon";
import { InfoButton } from "@/components/ui/InfoDrawer";
import { MonogramBadge } from "@/components/ui/MonogramBadge";
import { COVERAGE } from "@/lib/coalition";
import { fmtMUsd } from "@/lib/format";
import { describeModifiers } from "@/lib/modifiers";

function Pips({ n }: { n: number }) {
  return (
    <span className="flex gap-0.5" aria-hidden="true">
      {[1, 2, 3].map((i) => <span key={i} className={`h-1 w-1 rounded-full ${i <= n ? "bg-violet-bright" : "bg-white/12"}`} />)}
    </span>
  );
}

export function ActorInfoBody({ actor }: { actor: Actor }) {
  return (
    <>
      <p className="text-muted">{actor.name}</p>
      <ul className="list-disc space-y-1 pl-5">{actor.highlights.map((h) => <li key={h}>{h}</li>)}</ul>
      <div className="rounded-xl border border-line bg-white/[0.03] p-3">
        <div className="text-xs uppercase tracking-widest text-faint">Perk: {actor.perk.name}</div>
        <p className="mt-1">{actor.perk.description}</p>
        <p className="num mt-1 text-sm text-violet-bright">{describeModifiers(actor.perk.modifiers)}</p>
      </div>
      <p className="text-sm text-muted">Adds <span className="num text-fg">{fmtMUsd(actor.contributionMUsd)}</span> to the mission treasury.</p>
    </>
  );
}

interface Props {
  actor: Actor;
  selected?: boolean;
  disabled?: boolean;
  badge?: string;
  onSelect: () => void;
}

/** One line of text, a monogram, five capability pips and the perk. Depth lives in the info drawer. */
export function ActorCard({ actor, selected, disabled, badge, onSelect }: Props) {
  return (
    <GlassCard onSelect={onSelect} selected={selected} disabled={disabled} label={`${actor.shortName}: ${actor.tagline}`} className="p-4">
      <div className="flex items-start gap-3">
        <MonogramBadge actor={actor} size={46} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display truncate text-sm">{actor.shortName}</h3>
            <div className="flex items-center gap-1.5">
              {badge && <Badge tone="violet">{badge}</Badge>}
              <InfoButton title={actor.shortName} body={<ActorInfoBody actor={actor} />} sources={actor.sources} verified={actor.verified} />
            </div>
          </div>
          <p className="mt-0.5 truncate text-[13px] text-muted">{actor.tagline}</p>
        </div>
      </div>
      <ul className="mt-3 flex items-center justify-between gap-1" aria-label="Capabilities">
        {COVERAGE.map((c) => (
          <li key={c.key} title={`${c.label}: ${actor.capabilities[c.key] ?? 0} of 3`} className={`flex flex-col items-center gap-1 ${actor.capabilities[c.key] ? "text-fg" : "text-faint"}`}>
            <Icon name={c.key as IconName} size={16} />
            <Pips n={actor.capabilities[c.key] ?? 0} />
          </li>
        ))}
      </ul>
      <div className="mt-3"><Badge tone="blue" className="max-w-full truncate">{actor.perk.name}</Badge></div>
    </GlassCard>
  );
}
