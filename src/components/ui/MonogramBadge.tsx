import type { Actor } from "@/engine/types";

interface Props {
  actor?: Pick<Actor, "shortName" | "color" | "flag">;
  /** used when the actor is missing from the catalog */
  fallbackName?: string;
  size?: number;
  showFlag?: boolean;
}

/** Circle with the actor's initials in its color plus a flag emoji. Replaces logos, which the rules forbid. */
export function MonogramBadge({ actor, fallbackName = "?", size = 44, showFlag = true }: Props) {
  const color = actor?.color ?? "#8b93c9";
  const text = (actor?.shortName ?? fallbackName).replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase();
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center rounded-full font-display" style={{
      width: size, height: size, fontSize: size * 0.32, letterSpacing: "0.04em",
      color, background: `color-mix(in srgb, ${color} 16%, transparent)`, border: `1.5px solid color-mix(in srgb, ${color} 70%, transparent)`,
      boxShadow: `0 0 ${size / 3}px color-mix(in srgb, ${color} 25%, transparent)`,
    }}>
      {text}
      {showFlag && actor?.flag && (
        <span className="absolute -bottom-1 -right-1 rounded-full bg-bg/90 leading-none" style={{ fontSize: size * 0.34, padding: 1 }} aria-hidden="true">{actor.flag}</span>
      )}
    </span>
  );
}
