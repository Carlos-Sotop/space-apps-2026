import { MonogramBadge } from "@/components/ui/MonogramBadge";
import type { Coalition } from "@/engine/types";
import { actorName, getActor } from "@/lib/catalog";

export function CoalitionBar({ coalition, size = 30 }: { coalition: Coalition; size?: number }) {
  const ids = [coalition.leadId, ...coalition.partnerIds];
  return (
    <ul className="flex items-center -space-x-1.5" aria-label="Coalition members">
      {ids.map((id, i) => (
        <li key={id} title={`${actorName(id)}${i === 0 ? " (you)" : ""}`} className={`rounded-full ${i === 0 ? "ring-2 ring-violet-bright/70" : ""}`}>
          <MonogramBadge actor={getActor(id)} fallbackName={id} size={size} showFlag={false} />
        </li>
      ))}
    </ul>
  );
}
