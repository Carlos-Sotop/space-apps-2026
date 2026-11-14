import { Badge, GlassCard, Icon, InfoButton, LiveBadge } from "@/components/ui";
import { TopBar } from "@/components/hud/TopBar";
import { MissionArt } from "@/components/MissionArt";
import { useCatalog, useGame } from "@/store/game";
import { useLiveRoute } from "@/live/useLive";
import { fmtDays, fmtKm } from "@/lib/format";
import { missionClient } from "@/lib/edition";
import type { Mission } from "@/engine/types";

function MissionLive({ id }: { id: string }) {
  const iss = useLiveRoute("iss");
  const live = useGame((s) => s.live);
  if (id === "orbital-lab")
    return <LiveBadge source="NASA SSC" snapshot={iss.snapshot} date={iss.fetchedAt} href="https://sscweb.gsfc.nasa.gov/" />;
  if (id === "moon-base-zero" && live?.moonDistanceKm)
    return <LiveBadge source="JPL Horizons" snapshot={live.snapshot} date={live.fetchedAt} href="https://ssd.jpl.nasa.gov/horizons/app.html" />;
  if (id === "earth-guardian" && live?.earthEvents.length)
    return <LiveBadge source="NASA EONET" snapshot={live.snapshot} date={live.fetchedAt} href="https://eonet.gsfc.nasa.gov/" />;
  return null;
}

function liveLine(id: string, issAlt: number, moonKm?: number, events?: number): string | null {
  if (id === "orbital-lab") return `ISS now at ${fmtKm(issAlt)}`;
  if (id === "moon-base-zero" && moonKm) return `Moon is ${fmtKm(moonKm)} away today`;
  if (id === "earth-guardian" && events) return `${events} open hazards on Earth`;
  return null;
}

function MissionInfo({ m }: { m: Mission }) {
  return (
    <>
      <p>{m.briefing}</p>
      <div>
        <div className="mb-2 text-xs uppercase tracking-widest text-faint">Objectives</div>
        <ul className="space-y-2">
          {[m.primaryObjective, ...m.secondaryObjectives].map((o) => (
            <li key={o.id} className="rounded-lg border border-line bg-white/[0.03] px-3 py-2">
              <div className="text-sm text-fg">{o.title}</div>
              <div className="text-xs text-muted">{o.summary}</div>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

function Dots({ n }: { n: number }) {
  return (
    <span className="flex gap-1" role="img" aria-label={`Difficulty ${n} of 3`}>
      {[1, 2, 3].map((i) => <span key={i} className={`h-2 w-2 rounded-full ${i <= n ? "bg-violet-bright shadow-[0_0_8px_var(--violet)]" : "bg-white/15"}`} />)}
    </span>
  );
}

export default function MissionSelect() {
  const catalog = useCatalog();
  const select = useGame((s) => s.selectMission);
  const go = useGame((s) => s.go);
  const live = useGame((s) => s.live);
  const iss = useLiveRoute("iss");

  return (
    <div className="pb-10">
      <TopBar title="Choose a mission" onBack={() => go("intro")} />
      <div className="mx-auto grid max-w-7xl gap-5 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        {catalog.missions.map((m) => {
          const line = liveLine(m.id, iss.altitudeKm, live?.moonDistanceKm, live?.earthEvents.length);
          return (
            <GlassCard key={m.id} onSelect={() => select(m.id)} label={`Select ${m.name}`} className="group overflow-hidden">
              <div className="relative h-36 overflow-hidden border-b border-line"><MissionArt id={m.id} /></div>
              <div className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-display min-h-[2.75rem] text-base leading-snug">{m.name}</h2>
                  <InfoButton title={m.name} body={<MissionInfo m={m} />} sources={m.sources} verified={m.verified} />
                </div>
                <p className="truncate text-sm text-muted">{m.tagline}</p>
                <div className="flex items-center justify-between">
                  <Dots n={m.difficulty} />
                  <span className="num text-xs text-muted">{fmtDays(m.durationDays)}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {missionClient(m.id) && <Badge tone="violet">Commissioned by {missionClient(m.id)}</Badge>}
                  <MissionLive id={m.id} />
                </div>
                {line && <p className="num truncate text-[11px] text-faint">{line}</p>}
              </div>
            </GlassCard>
          );
        })}
        <div className="glass relative flex flex-col overflow-hidden opacity-55" aria-disabled="true">
          <div className="grid h-36 place-items-center border-b border-line bg-gradient-to-b from-[#2a1210] to-[#0a0b1e]">
            <Icon name="lock" size={34} className="text-muted" />
          </div>
          <div className="space-y-3 p-4">
            <h2 className="font-display text-base leading-snug">Mars Outpost</h2>
            <p className="truncate text-sm text-muted">Season 2</p>
            <Badge>Coming soon</Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
