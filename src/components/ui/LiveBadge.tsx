import { Icon } from "./Icon";

interface Props {
  /** e.g. "NASA DONKI" */
  source: string;
  snapshot?: boolean;
  /** ISO date of the snapshot or fetch */
  date?: string;
  /** link to the source record */
  href?: string;
}

const shortDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "");

export function LiveBadge({ source, snapshot, date, href }: Props) {
  const live = !snapshot;
  const body = (
    <>
      <span className={`h-1.5 w-1.5 rounded-full ${live ? "pulse-dot bg-cyan" : "bg-faint"}`} />
      <span className="num tracking-wide">{live ? `LIVE · ${source}` : `SNAPSHOT · ${shortDate(date) || source}`}</span>
      {href && <Icon name="external" size={11} />}
    </>
  );
  const cls = `inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10.5px] uppercase ${
    live ? "border-cyan/40 bg-cyan/10 text-cyan" : "border-line bg-white/5 text-muted"
  }`;
  return href ? (
    <a href={href} target="_blank" rel="noreferrer noopener" className={`${cls} hover:brightness-125`} title={`Open the ${source} record`}>{body}</a>
  ) : (
    <span className={cls}>{body}</span>
  );
}
