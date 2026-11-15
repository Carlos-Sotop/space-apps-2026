import { Suspense, lazy, useMemo, useState, type ReactNode } from "react";
import { Badge, GlassCard, Icon, InfoButton, LiveBadge, hasIcon, type IconName } from "@/components/ui";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { TopBar } from "@/components/hud/TopBar";
import { MissionArt } from "@/components/MissionArt";
import { hasWebgl } from "@/three/missions/webgl";

/**
 * The scenes carry three.js, so they load on demand and only where WebGL exists. Both
 * halves come from the same module, so the browser fetches that chunk once: the views that
 * sit in the cards, and the canvas they are painted into. Until it arrives the SVG shows.
 */
const MissionSceneView = lazy(() => import("@/three/missions/MissionScenes").then((m) => ({ default: m.MissionSceneView })));
const MissionSceneCanvas = lazy(() => import("@/three/missions/MissionScenes").then((m) => ({ default: m.MissionSceneCanvas })));
import { useCatalog, useGame } from "@/store/game";
import { useLiveRoute } from "@/live/useLive";
import { fmtDays, fmtKm } from "@/lib/format";
import { missionClient } from "@/lib/edition";
import type { Mission, ModuleCategory, Objective, OrbitClass } from "@/engine/types";

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

/** Plain words for the orbit the mission has to reach: it is what sizes the rocket. */
const ORBIT_LABEL: Record<OrbitClass, string> = {
  LEO: "Low Earth orbit",
  ISS: "Station orbit",
  SSO: "Sun-synchronous",
  GTO: "Geo transfer",
  TLI: "Trans-lunar",
};

/** Module categories that already have an icon of their own. */
const CATEGORY_ICON: Partial<Record<ModuleCategory, IconName>> = {
  bus: "spacecraft",
  power: "power",
  battery: "battery",
  comms: "comms",
  computer: "data",
  adcs: "spacecraft",
  propulsion: "launch",
  thermal: "sun",
  lander: "landing",
  instrument: "earth-observation",
  experiment: "science",
  habitat: "habitat",
  isru: "water",
  rover: "rover",
};

/** Objectives that name modules rather than categories: match on the id. */
const ID_HINT: [string, IconName][] = [
  ["ice", "water"],
  ["rover", "rover"],
  ["mesh", "link"],
  ["pq", "shield"],
  ["night", "battery"],
  ["plant", "habitat"],
  ["food", "habitat"],
  ["fire", "storm"],
  ["flood", "water"],
  ["crop", "earth-observation"],
  ["ship", "globe"],
  ["health", "science"],
  ["regolith", "landing"],
];

function objectiveIcon(o: Objective): IconName {
  const hinted = ID_HINT.find(([key]) => o.id.includes(key));
  if (hinted) return hinted[1];
  const category = o.requires.categories?.find((c) => CATEGORY_ICON[c]);
  if (category) return CATEGORY_ICON[category] as IconName;
  const direct = o.requires.categories?.find((c) => hasIcon(c));
  if (direct) return direct as IconName;
  return "science";
}

/** The three things the player will actually do: the primary goal and two of the options. */
function willDo(m: Mission): Objective[] {
  return [m.primaryObjective, ...m.secondaryObjectives].slice(0, 3);
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
      <div>
        <div className="mb-2 text-xs uppercase tracking-widest text-faint">Where it flies</div>
        <ul className="space-y-2">
          {m.destinations.map((d) => (
            <li key={d.id} className="rounded-lg border border-line bg-white/[0.03] px-3 py-2">
              <div className="text-sm text-fg">{d.name}</div>
              <div className="text-xs text-muted">{d.tradeoff}</div>
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
      {[1, 2, 3].map((i) => (
        <span key={i} className={`h-2 w-2 rounded-full ${i <= n ? "bg-violet-bright shadow-[0_0_8px_var(--violet)]" : "bg-white/15"}`} />
      ))}
    </span>
  );
}

/** A small fact with an icon: difficulty, how long it runs, where it goes. */
function Fact({ icon, children }: { icon: IconName; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-muted">
      <Icon name={icon} size={13} className="shrink-0 text-faint" />
      <span className="num truncate">{children}</span>
    </span>
  );
}

export default function MissionSelect() {
  const catalog = useCatalog();
  const select = useGame((s) => s.selectMission);
  const go = useGame((s) => s.go);
  const live = useGame((s) => s.live);
  const iss = useLiveRoute("iss");
  const webgl = useMemo(hasWebgl, []);
  /** the card the pointer or the keyboard is on: it dollies its camera in and lifts */
  const [active, setActive] = useState<string | null>(null);

  return (
    <div className="pb-10">
      <TopBar title="Choose a mission" onBack={() => go("intro")} />
      <div className="mx-auto grid max-w-7xl gap-4 px-4 sm:px-6 lg:grid-cols-3 lg:gap-5">
        {catalog.missions.map((m, i) => {
          const line = liveLine(m.id, iss.altitudeKm, live?.moonDistanceKm, live?.earthEvents.length);
          const orbit = m.destinations[0]?.orbitClass;
          const on = active === m.id;
          return (
            <GlassCard
              key={m.id}
              onSelect={() => select(m.id)}
              label={`Select ${m.name}`}
              data-coach="missions.card"
              className={`group flex flex-col overflow-hidden lg:min-h-[calc(100dvh-10rem)] ${
                on ? "-translate-y-1 ring-2 ring-cyan shadow-select" : ""
              }`}
              onPointerEnter={() => setActive(m.id)}
              onPointerLeave={() => setActive((c) => (c === m.id ? null : c))}
              onFocus={() => setActive(m.id)}
              onBlur={() => setActive((c) => (c === m.id ? null : c))}
            >
              <div className="flex h-full flex-col">
              {/* the scene paints over this SVG; the SVG is what remains without WebGL */}
              <div className="relative h-44 shrink-0 overflow-hidden border-b border-line sm:h-52 lg:h-auto lg:flex-1 lg:min-h-[14rem]">
                <MissionArt id={m.id} />
                {webgl && (
                  <Suspense fallback={null}>
                    <MissionSceneView id={m.id} active={on} index={i + 1} />
                  </Suspense>
                )}
              </div>

              <div className="flex shrink-0 flex-col gap-3 p-4 sm:p-5">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-display text-lg leading-tight sm:text-xl">{m.name}</h2>
                  <InfoButton title={m.name} body={<MissionInfo m={m} />} sources={m.sources} verified={m.verified} />
                </div>
                <p className="truncate text-sm text-muted">{m.tagline}</p>

                <div>
                  <div className="mb-1.5 text-[10.5px] uppercase tracking-widest text-faint">You will</div>
                  <ul className="space-y-1.5">
                    {willDo(m).map((o) => (
                      <li key={o.id} className="flex items-center gap-2">
                        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-cyan/30 bg-cyan/10 text-cyan">
                          <Icon name={objectiveIcon(o)} size={13} />
                        </span>
                        <span className="truncate text-[13px] text-fg">{o.title}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <span className="inline-flex items-center gap-1.5">
                    <Icon name="sparkle" size={13} className="shrink-0 text-faint" />
                    <Dots n={m.difficulty} />
                  </span>
                  <Fact icon="lifetime">{fmtDays(m.durationDays)}</Fact>
                  {orbit && <Fact icon="launch">{ORBIT_LABEL[orbit]}</Fact>}
                </div>

                <div className="flex min-h-[1.75rem] flex-wrap items-center gap-2">
                  {missionClient(m.id) && <Badge tone="violet">Commissioned by {missionClient(m.id)}</Badge>}
                  <MissionLive id={m.id} />
                </div>
                {line && <p className="num truncate text-[11px] text-faint">{line}</p>}
              </div>
              </div>
            </GlassCard>
          );
        })}
      </div>
      {webgl && (
        <ErrorBoundary fallback={null}>
          <Suspense fallback={null}>
            <MissionSceneCanvas />
          </Suspense>
        </ErrorBoundary>
      )}
    </div>
  );
}
