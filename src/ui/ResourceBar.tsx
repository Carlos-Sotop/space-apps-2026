import { round1, usd } from "@/lib/format";
import type { Usage } from "@/types";

export function ResourceBar({ label, unit, usage, money = false }: { label: string; unit: string; usage: Usage; money?: boolean }) {
  const { used, limit } = usage;
  const share = limit > 0 ? used / limit : used > 0 ? 1 : 0;
  const over = used > limit;
  const show = (n: number) => (money ? usd(n) : `${round1(n)} ${unit}`);
  return (
    <div>
      <div className="flex justify-between gap-2 text-xs">
        <span className="text-zinc-400">{label}</span>
        <span className={`tabular-nums ${over ? "text-red-400" : "text-zinc-200"}`}>
          {show(used)} of {show(limit)}
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`h-full rounded-full ${over ? "bg-red-500" : "bg-emerald-400"}`}
          style={{ width: `${Math.min(100, share * 100)}%` }}
        />
      </div>
    </div>
  );
}
