import { useState } from "react";
import { Icon, LiveBadge, Modal } from "@/components/ui";
import { useLiveRoute } from "@/live/useLive";
import { useGame } from "@/store/game";

interface Row {
  id: string;
  name: string;
  feeds: string;
  href: string;
  snapshot: boolean;
  at?: string;
}

const time = (iso?: string) => (iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "");

function NasaLiveCard() {
  const live = useGame((s) => s.live);
  const moon = useLiveRoute("moon");
  const iss = useLiveRoute("iss");
  const dsn = useLiveRoute("dsn");
  const apod = useLiveRoute("apod");
  const ctxSnapshot = live ? live.snapshot : true;
  const rows: Row[] = [
    { id: "donki", name: "DONKI", feeds: "Solar flares and storms", href: "https://kauai.ccmc.gsfc.nasa.gov/DONKI/", snapshot: ctxSnapshot, at: live?.fetchedAt },
    { id: "eonet", name: "EONET", feeds: "Fires, floods and storms on Earth", href: "https://eonet.gsfc.nasa.gov/", snapshot: ctxSnapshot, at: live?.fetchedAt },
    { id: "horizons", name: "JPL Horizons", feeds: "Earth to Moon distance", href: "https://ssd.jpl.nasa.gov/horizons/", snapshot: moon.snapshot, at: moon.fetchedAt },
    { id: "sscweb", name: "SSCWeb ISS", feeds: "Where the station is now", href: "https://sscweb.gsfc.nasa.gov/", snapshot: iss.snapshot, at: iss.fetchedAt },
    { id: "dsn", name: "DSN Now", feeds: "Deep Space Network dishes", href: "https://eyes.nasa.gov/dsn/dsn.html", snapshot: dsn.snapshot, at: dsn.fetchedAt },
    { id: "apod", name: "APOD", feeds: "Astronomy picture of the day", href: "https://apod.nasa.gov/apod/", snapshot: apod.snapshot, at: apod.fetchedAt },
  ];
  return (
    <div>
      <p className="mb-3 text-sm text-muted">The game reads these NASA sources. When one cannot be reached, it shows a saved snapshot instead.</p>
      <ul className="divide-y divide-white/10" data-coach="nasa.sources">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <a href={r.href} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1.5 text-sm text-fg hover:text-cyan-bright">{r.name} <Icon name="external" size={12} /></a>
              <div className="truncate text-xs text-muted">{r.feeds}</div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <LiveBadge source={r.name} snapshot={r.snapshot} date={r.at} />
              <span className="num text-[11px] text-muted">{time(r.at)}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** TopBar chip: shows whether NASA data is live and opens the list of sources. */
export function NasaLiveChip() {
  const [open, setOpen] = useState(false);
  const status = useGame((s) => s.liveStatus);
  const live = status === "live";
  return (
    <>
      <button
        type="button"
        data-coach="topbar.nasa-live"
        aria-label={`NASA data: ${live ? "live" : "snapshot"}. Open sources`}
        onClick={() => setOpen(true)}
        className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-2.5 text-xs transition hover:brightness-125 ${live ? "border-cyan/50 bg-cyan/10 text-cyan" : "border-line bg-glass text-muted"}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${live ? "pulse-dot bg-cyan" : "bg-faint"}`} />
        <span className="hidden sm:inline">NASA live</span>
        <Icon name="antenna" size={14} className="sm:hidden" />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="NASA live data">
        <NasaLiveCard />
      </Modal>
    </>
  );
}
