import { useMemo, useState } from "react";
import { Button, Icon, toast } from "@/components/ui";
import { countryOptions, submitScore } from "@/lib/leaderboard";
import { NAME_RE } from "@/leaderboard/types";
import { useGame } from "@/store/game";

const safeGet = (k: string) => { try { return localStorage.getItem(k) ?? ""; } catch { return ""; } };
const safeSet = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } };

/** Debrief card: send this run to the global leaderboard. The server replays it before it counts. */
export function RankingSubmit() {
  const { design, result, seed, live, ops, opsSeed, opsLive, published, go } = useGame();
  const [name, setName] = useState(() => safeGet("spacedao-nick"));
  const [country, setCountry] = useState(() => safeGet("spacedao-country") || "INT");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [rank, setRank] = useState(0);
  const options = useMemo(countryOptions, []);
  if (!design || !result) return null;
  const opsUnfinished = ops?.status === "running";
  const valid = NAME_RE.test(name.trim());

  const send = async () => {
    setState("sending");
    safeSet("spacedao-nick", name.trim());
    safeSet("spacedao-country", country);
    try {
      const used = published.filter((b) => design.blueprintIds.includes(b.id));
      const r = await submitScore({
        playerName: name.trim(), country, mode: "solo", crewSize: 1, design, customBlueprints: used, flightSeed: seed, live,
        ops: ops ? { seed: opsSeed, live: opsLive, actions: ops.actions } : null,
      });
      setRank(r.rank);
      setState("done");
    } catch (e) {
      toast(e instanceof Error && e.message.length < 90 ? e.message : "The leaderboard is offline. Try again later.", "warn");
      setState("idle");
    }
  };

  return (
    <div className="glass flex flex-col gap-3 p-5 sm:flex-row sm:items-end" data-coach="debrief.leaderboard">
      <div className="flex-1">
        <h2 className="font-display mb-1 flex items-center gap-2 text-sm"><Icon name="trophy" size={16} className="text-tight" /> Global leaderboard</h2>
        <p className="m-0 text-xs text-muted">{state === "done" ? `You are #${rank || "?"} on this mission. The server replayed your run to check it.` : "Use a nickname, not your real name. The server replays your run before it counts."}</p>
      </div>
      {state === "done" ? (
        <Button variant="primary" onClick={() => go("leaderboard")}>See the leaderboard <Icon name="arrow" size={16} /></Button>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="nick">Nickname</label>
          <input id="nick" value={name} maxLength={24} onChange={(e) => setName(e.target.value)} placeholder="Nickname" className="h-10 w-40 rounded-[var(--radius-ctl)] border border-line bg-white/5 px-3 text-sm outline-none focus:border-violet-bright/60" />
          <label className="sr-only" htmlFor="country">Country</label>
          <select id="country" value={country} onChange={(e) => setCountry(e.target.value)} className="h-10 max-w-44 rounded-[var(--radius-ctl)] border border-line bg-[#0b0d24] px-2 text-sm outline-none">
            {options.map((o) => <option key={o.code} value={o.code}>{o.name}</option>)}
          </select>
          <Button variant="primary" disabled={!valid || state === "sending" || opsUnfinished} onClick={send}>{state === "sending" ? "Checking…" : "Submit"}</Button>
        </div>
      )}
    </div>
  );
}
