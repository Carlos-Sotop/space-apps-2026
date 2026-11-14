import { usd } from "@/lib/format";
import type { FlightEvent, FlightResult } from "@/types";

const tone: Record<FlightEvent["kind"], string> = {
  info: "text-zinc-300",
  warning: "text-amber-300",
  failure: "text-red-400",
  success: "text-emerald-300",
};

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md bg-zinc-900 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="text-lg tabular-nums">{value}</div>
    </div>
  );
}

export function FlightLog({ result }: { result: FlightResult }) {
  return (
    <div className="rounded-lg border border-zinc-800 p-4">
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Score" value={result.score.total} />
        <Stat label="Science" value={result.score.science} />
        <Stat label="Customers served" value={result.score.customersServed} />
        <Stat label="Money left" value={usd(result.score.moneyLeftUsd)} />
      </div>
      <ol className="mt-4 space-y-1.5 text-xs">
        {result.events.map((e, i) => (
          <li key={i} className={tone[e.kind]}>
            <span className="mr-2 tabular-nums text-zinc-500">Day {e.day}</span>
            {e.text}
          </li>
        ))}
      </ol>
    </div>
  );
}
