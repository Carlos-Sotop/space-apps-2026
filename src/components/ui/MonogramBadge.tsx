import type { Actor } from "@/engine/types";
import { Flag } from "./Flag";

interface Props {
  actor?: Pick<Actor, "shortName" | "color" | "country">;
  /** used when the actor is missing from the catalog */
  fallbackName?: string;
  size?: number;
  /** kept for API compatibility; the flag is always the badge itself */
  showFlag?: boolean;
  /** render the actor's short name next to the flag */
  showName?: boolean;
}

/** Rounded SVG flag with the actor color as a thin ring. Replaces logos and letter monograms, which the rules forbid. */
export function MonogramBadge({ actor, fallbackName = "?", size = 44, showName = false }: Props) {
  const color = actor?.color ?? "#8b93c9";
  const badge = <Flag code={actor?.country} size={size} ring={color} className="m-[1.5px]" />;
  if (!showName) return badge;
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      {badge}
      <span className="truncate font-display text-xs">{actor?.shortName ?? fallbackName}</span>
    </span>
  );
}
