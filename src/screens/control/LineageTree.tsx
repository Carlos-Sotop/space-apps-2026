import type { Blueprint } from "@/engine/types";
import { getActor } from "@/lib/catalog";

interface Props {
  blueprints: Blueprint[];
  adopted: string[];
  onToggle: (id: string) => void;
}

/** Fork tree: parents on the left, forks to the right. Only blueprints that are part of a family are drawn. */
export function LineageTree({ blueprints, adopted, onToggle }: Props) {
  const byId = new Map(blueprints.map((b) => [b.id, b]));
  const depth = (b: Blueprint, seen = new Set<string>()): number => {
    if (!b.parentId || seen.has(b.id)) return 0;
    seen.add(b.id);
    const p = byId.get(b.parentId);
    return p ? 1 + depth(p, seen) : 0;
  };
  const family = blueprints.filter((b) => b.parentId || blueprints.some((o) => o.parentId === b.id));
  if (!family.length) return null;

  const cols = new Map<number, Blueprint[]>();
  family.forEach((b) => { const d = depth(b); cols.set(d, [...(cols.get(d) ?? []), b]); });
  const pos = new Map<string, { x: number; y: number }>();
  const maxD = Math.max(...cols.keys());
  const rows = Math.max(...[...cols.values()].map((c) => c.length));
  cols.forEach((list, d) => list.forEach((b, i) => pos.set(b.id, { x: 50 + d * 110, y: 34 + i * 62 + ((rows - list.length) * 62) / 2 })));
  const w = 100 + maxD * 110, h = 20 + rows * 62;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ maxHeight: 260 }} role="group" aria-label="Fork lineage of open designs">
      {family.map((b) => {
        const p = b.parentId ? pos.get(b.parentId) : null;
        const c = pos.get(b.id);
        if (!p || !c) return null;
        return <path key={`e-${b.id}`} d={`M${p.x + 18} ${p.y} C${p.x + 60} ${p.y} ${c.x - 60} ${c.y} ${c.x - 18} ${c.y}`} fill="none" stroke="#8b5cf6" strokeOpacity="0.6" strokeWidth="1.5" />;
      })}
      {family.map((b) => {
        const c = pos.get(b.id)!;
        const a = getActor(b.authorId);
        const on = adopted.includes(b.id);
        const color = a?.color ?? "#8b93c9";
        return (
          <g key={b.id} transform={`translate(${c.x} ${c.y})`} role="button" tabIndex={0} aria-pressed={on} aria-label={`${b.name} by ${a?.shortName ?? b.authorId}`} className="cursor-pointer outline-none [&:focus-visible>circle]:stroke-white"
            onClick={() => onToggle(b.id)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onToggle(b.id))}>
            <circle r="18" fill={on ? color : "#0b0d24"} fillOpacity={on ? 0.35 : 1} stroke={color} strokeWidth={on ? 2.5 : 1.5} />
            <text textAnchor="middle" dy="4" fontSize="10" fill={color} fontFamily="var(--font-display)">{(a?.shortName ?? b.authorId).slice(0, 2).toUpperCase()}</text>
            <text textAnchor="middle" y="32" fontSize="9" fill="var(--fg-muted)">{b.name.length > 18 ? `${b.name.slice(0, 17)}…` : b.name}</text>
          </g>
        );
      })}
    </svg>
  );
}
