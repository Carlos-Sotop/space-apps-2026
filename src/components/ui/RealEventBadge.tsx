import { Icon } from "./Icon";

interface Props {
  /** e.g. "NASA DONKI" */
  source?: string;
  /** link to the source record */
  href?: string;
  className?: string;
}

/** Marks an in-game event that comes from a real NASA record, not from the game's own script. */
export function RealEventBadge({ source = "NASA DONKI", href, className = "" }: Props) {
  const body = (
    <>
      <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-cyan" />
      <span className="num tracking-wide">REAL EVENT · {source}</span>
      {href && <Icon name="external" size={11} />}
    </>
  );
  const cls = `inline-flex items-center gap-1.5 rounded-full border border-cyan/50 bg-cyan/10 px-2 py-0.5 text-[10.5px] uppercase text-cyan ${className}`;
  return href ? (
    <a href={href} target="_blank" rel="noreferrer noopener" className={`${cls} hover:brightness-125`} title={`Open the ${source} record`}>{body}</a>
  ) : (
    <span className={cls}>{body}</span>
  );
}
