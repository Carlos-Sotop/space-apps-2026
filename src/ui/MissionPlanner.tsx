"use client";

import { useMemo, useState } from "react";
import { usd } from "@/lib/format";
import { resourceUse } from "@/sim/resources";
import { simulate } from "@/sim/simulate";
import type { Budget, Catalog, FlightResult, Manifest } from "@/types";
import { FlightLog } from "./FlightLog";
import { ResourceBar } from "./ResourceBar";

function newSeed(): number {
  const seed = new Uint32Array(1);
  crypto.getRandomValues(seed);
  return seed[0];
}

const field = "mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm";
const heading = "text-xs uppercase tracking-wide text-zinc-400";

export function MissionPlanner({ catalog, budget }: { catalog: Catalog; budget: Budget }) {
  const [manifest, setManifest] = useState<Manifest>({
    landerId: catalog.landers[0]?.id ?? "",
    siteId: catalog.sites[0]?.id ?? "",
    payloadIds: [],
  });
  const [result, setResult] = useState<FlightResult | null>(null);
  const use = useMemo(() => resourceUse(manifest, catalog, budget), [manifest, catalog, budget]);
  const tooHeavy = use.massKg.used > use.massKg.limit;
  const overBudget = use.costUsd.used > use.costUsd.limit;

  const change = (next: Partial<Manifest>) => {
    setResult(null);
    setManifest((m) => ({ ...m, ...next }));
  };
  const toggle = (id: string) =>
    change({
      payloadIds: manifest.payloadIds.includes(id)
        ? manifest.payloadIds.filter((x) => x !== id)
        : [...manifest.payloadIds, id],
    });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <section className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={heading}>Lander</span>
            <select className={field} value={manifest.landerId} onChange={(e) => change({ landerId: e.target.value })}>
              {catalog.landers.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={heading}>Landing site</span>
            <select className={field} value={manifest.siteId} onChange={(e) => change({ siteId: e.target.value })}>
              {catalog.sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div>
          <h2 className={`${heading} mb-2`}>Payloads</h2>
          <ul className="divide-y divide-zinc-800 rounded-lg border border-zinc-800">
            {catalog.payloads.map((p) => (
              <li key={p.id}>
                <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-zinc-900">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-emerald-400"
                    checked={manifest.payloadIds.includes(p.id)}
                    onChange={() => toggle(p.id)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{p.name}</span>
                    <span className="block text-xs text-zinc-500">
                      {p.owner}, {p.kind}
                    </span>
                  </span>
                  <span className="text-right text-xs tabular-nums text-zinc-400">
                    {p.massKg} kg, {p.powerW} W, {p.dataMbPerDay} MB/day
                    {p.paysUsd > 0 && <span className="block text-emerald-300">pays {usd(p.paysUsd)}</span>}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <aside className="space-y-4">
        <div className="space-y-3 rounded-lg border border-zinc-800 p-4">
          <ResourceBar label="Mass" unit="kg" usage={use.massKg} />
          <ResourceBar label="Power" unit="W" usage={use.powerW} />
          <ResourceBar label="Heat" unit="W" usage={use.heatW} />
          <ResourceBar label="Data" unit="MB/day" usage={use.dataMbPerDay} />
          <ResourceBar label="Cost" unit="USD" usage={use.costUsd} money />
        </div>
        <button
          type="button"
          disabled={tooHeavy || overBudget}
          onClick={() => setResult(simulate(manifest, catalog, budget, newSeed()))}
          className="w-full rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Fly
        </button>
        {tooHeavy && <p className="text-xs text-red-400">Too heavy for this lander.</p>}
        {!tooHeavy && overBudget && <p className="text-xs text-red-400">Not enough money for this flight.</p>}
        {result && <FlightLog result={result} />}
      </aside>
    </div>
  );
}
