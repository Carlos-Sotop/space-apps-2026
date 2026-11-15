import { Flag } from "@/components/ui";
import type { Blueprint } from "@/engine/types";
import { getActor } from "@/lib/catalog";

interface Props {
  blueprints: Blueprint[];
  adopted: string[];
  onToggle: (id: string) => void;
}

const R = 18;

/** Fork tree: originals on the left, forks to the right. Only blueprints that are part of a family are drawn. */
export function LineageTree({ blueprints, adopted, onToggle }: Props) {
  const byId = new Map(blueprints.map((b) => [b.id, b]));
  const depth = (b: Blueprint, seen = new Set<string>()): number => {
    if (!b.parentId || seen.has(b.id)) return 0;
    seen.add(b.id);
    const p = byId.get(b.parentId);
    return p ? 1 + depth(p, seen) : 0;
  };
  const family = blueprints.filter((b) => (b.parentId && byId.has(b.parentId)) || blueprints.some((o) => o.parentId === b.id));
  if (!family.length) return <p className="text-sm text-muted">No forks yet on this mission. Publish yours at the Debrief to start one.</p>;

  const cols = new Map<number, Blueprint[]>();
  family.forEach((b) => { const d = depth(b); cols.set(d, [...(cols.get(d) ?? []), b]); });
  const pos = new Map<string, { x: number; y: number }>();
  const maxD = Math.max(...cols.keys());
  const rows = Math.max(...[...cols.values()].map((c) => c.length));
  cols.forEach((list, d) => list.forEach((b, i) => pos.set(b.id, { x: 62 + d * 125, y: 34 + i * 62 + ((rows - list.length) * 62) / 2 })));
  const w = 124 + maxD * 125, h = 20 + rows * 62;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ maxHeight: 300 }} role="group" aria-label="Fork lineage of open designs">
      {family.map((b) => {
        const p = b.parentId ? pos.get(b.parentId) : null;
        const c = pos.get(b.id);
        if (!p || !c) return null;
        const live = adopted.includes(b.id) && adopted.includes(b.parentId ?? "");
        return <path key={`e-${b.id}`} d={`M${p.x + R} ${p.y} C${p.x + 60} ${p.y} ${c.x - 60} ${c.y} ${c.x - R} ${c.y}`} fill="none" stroke={live ? "var(--cyan)" : "#8b5cf6"} strokeOpacity={live ? 0.9 : 0.55} strokeWidth="1.5" />;
      })}
      {family.map((b) => {
        const c = pos.get(b.id)!;
        const a = getActor(b.authorId);
        const on = adopted.includes(b.id);
        return (
          <g key={b.id} transform={`translate(${c.x} ${c.y})`} role="button" tabIndex={0} aria-pressed={on} aria-label={`${b.name} by ${a?.shortName ?? b.authorId}`} className="cursor-pointer outline-none [&:focus-visible>circle]:stroke-white"
            onClick={() => onToggle(b.id)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onToggle(b.id))}>
            <circle r={R + 3} fill="none" stroke={on ? "var(--cyan)" : (a?.color ?? "#8b93c9")} strokeWidth={on ? 2.5 : 1.25} strokeOpacity={on ? 1 : 0.7} />
            <foreignObject x={-R} y={-R} width={R * 2} height={R * 2} style={{ pointerEvents: "none" }}>
              <Flag code={a?.country} size={R * 2} />
            </foreignObject>
            <text textAnchor="middle" y="36" fontSize="10" fill={on ? "var(--cyan-bright)" : "var(--fg-muted)"}>{b.name.length > 22 ? `${b.name.slice(0, 21)}…` : b.name}</text>
          </g>
        );
      })}
    </svg>
  );
}
