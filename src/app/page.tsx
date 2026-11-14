import { catalog, startingBudget, unverifiedCount } from "@/data/catalog";
import { usd } from "@/lib/format";
import { MissionPlanner } from "@/ui/MissionPlanner";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Lander Manifest</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Pick a lander, a landing site and the payloads, then fly the mission. Starting money: {usd(startingBudget.startUsd)}.
        </p>
        {unverifiedCount > 0 && (
          <p className="mt-2 text-xs text-amber-300">{unverifiedCount} catalog entries are placeholders without sources.</p>
        )}
      </header>
      <MissionPlanner catalog={catalog} budget={startingBudget} />
    </main>
  );
}
