import { Icon } from "@/components/ui";
import type { Source } from "@/engine/types";

function origin(source: Source): string {
  const hay = `${source.title} ${source.url}`.toLowerCase();
  if (hay.includes("donki")) return "NASA DONKI";
  if (hay.includes("eonet")) return "NASA EONET";
  if (hay.includes("firms")) return "NASA FIRMS";
  if (hay.includes("dsn")) return "NASA DSN";
  return "NASA";
}

/** Marks an event that comes from a real, live NASA record. Links to the record. */
export function LiveEventBadge({ source }: { source: Source }) {
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noreferrer noopener"
      title={`Open the record: ${source.title}`}
      className="num inline-flex max-w-full items-center gap-1.5 rounded-full border border-cyan/40 bg-cyan/10 px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-cyan hover:brightness-125"
    >
      <span className="pulse-dot h-1.5 w-1.5 shrink-0 rounded-full bg-cyan" />
      Real event · {origin(source)}
      <Icon name="external" size={11} />
    </a>
  );
}
