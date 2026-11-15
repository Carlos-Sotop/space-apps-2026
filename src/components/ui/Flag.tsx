import { Icon } from "./Icon";

const FLAGS = import.meta.glob<string>("../../../node_modules/flag-icons/flags/4x3/*.svg", { query: "?no-inline", import: "default", eager: true });

const URLS: Record<string, string> = {};
for (const [path, url] of Object.entries(FLAGS)) URLS[path.slice(path.lastIndexOf("/") + 1, -4)] = url;

interface Props {
  /** ISO 3166-1 alpha-2 (case-insensitive); "EU" gives the European flag */
  code?: string | null;
  size?: number;
  /** thin ring around the flag, any CSS color */
  ring?: string;
  className?: string;
}

/** Rounded SVG flag. Unknown or international codes fall back to a globe icon. */
export function Flag({ code, size = 32, ring, className = "" }: Props) {
  const url = code ? URLS[code.toLowerCase()] : undefined;
  const style = { width: size, height: size, boxShadow: ring ? `0 0 0 1.5px ${ring}` : undefined };
  return (
    <span className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 ${className}`} style={style} role="img" aria-label={code ?? "International"}>
      {url ? <img src={url} alt="" draggable={false} className="h-full w-full object-cover" /> : <Icon name="globe" size={Math.round(size * 0.6)} className="text-muted" />}
    </span>
  );
}
