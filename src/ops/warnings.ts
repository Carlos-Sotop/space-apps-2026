// Forward-looking warnings for Operations. The next turns are played on a copy of the state (no random
// events, storms sheltered), and every problem that would show up becomes one line with a fix, before it
// happens. Every loss is announced this way: the copy loses first.
import type { OpsScenario } from "./scenario";
import type { OpsCtx, OpsState, OpsWarning, Structure } from "./types";
import { defOf, hasTrait, hexDist, hubStructure, hubTile, isActive, statsOf, tileById } from "./util";

/** How many turns ahead the warnings look. */
export const WARNING_TURNS = 3;

const inTurns = (n: number) => (n <= 1 ? "next turn" : `in ${n} turns`);

/** The biggest power user that may be switched off (never the hub). */
function biggestLoad(s: OpsState, sc: OpsScenario, ctx: OpsCtx): Structure | undefined {
  return s.structures
    .filter((st) => isActive(st) && !hasTrait(sc, st, "hub") && statsOf(st, sc, ctx.catalog).powerW > 0)
    .sort((a, b) => statsOf(b, sc, ctx.catalog).powerW - statsOf(a, sc, ctx.catalog).powerW || a.id.localeCompare(b.id))[0];
}

const labelOf = (sc: OpsScenario, st: { kind: string }) => defOf(sc, st.kind)?.label ?? st.kind;

/** One line on how to keep the power on: deploy what is waiting in the cargo bay, else switch off the biggest load. */
function powerFix(s: OpsState, sc: OpsScenario, ctx: OpsCtx): string {
  const waiting = s.inventory.find((i) => defOf(sc, i.kind)?.traits.some((t) => t === "generator" || t === "battery"));
  const load = biggestLoad(s, sc, ctx);
  const parts: string[] = [];
  if (waiting) {
    const d = defOf(sc, waiting.kind);
    parts.push(d?.traits.includes("battery") ? `deploy the ${labelOf(sc, waiting).toLowerCase()} next to the ${sc.hubLabel.toLowerCase()}` : `deploy the ${labelOf(sc, waiting).toLowerCase()} on a sunny tile`);
  }
  if (load) parts.push(`switch off the ${labelOf(sc, load).toLowerCase()} (${Math.round(statsOf(load, sc, ctx.catalog).powerW)} W)`);
  if (!parts.length) return "Cut the power use before the dark.";
  const text = parts.join(" or ");
  return text.charAt(0).toUpperCase() + text.slice(1) + ".";
}

function stormFix(sc: OpsScenario): string {
  if (sc.stormMode === "crew") return "Shelter the crew in a node that turn (1 crew hour).";
  if (sc.stormMode === "downlink") return "The downlink halves that turn: send what you can now.";
  return "Build a regolith berm next to your structures (1 action point), or shelter that turn.";
}

/**
 * Warnings for the turns ahead of this state. `step` plays one turn on a copy with no random events
 * (the core's preview), so the warnings use the same rules as the real turn.
 */
export function warningsFor(s: OpsState, sc: OpsScenario, ctx: OpsCtx, step: (s: OpsState) => OpsState): OpsWarning[] {
  if (s.status !== "running") return [];
  const out: OpsWarning[] = [];
  const add = (w: OpsWarning) => {
    if (!out.some((x) => x.id === w.id)) out.push(w);
  };
  const ahead: OpsState[] = [];
  let cur = s;
  for (let k = 0; k < WARNING_TURNS && cur.status === "running" && cur.turn <= s.maxTurns; k++) {
    const next = step(cur);
    ahead.push(next);
    if (next.turn === cur.turn) break; // last turn played
    cur = next;
  }
  const hub = hubStructure(s, sc);
  const hubName = sc.hubLabel.toLowerCase();

  // a loss ahead: the copy lost
  const lost = ahead.findIndex((x) => x.status === "lost");
  if (lost >= 0) {
    const frozen = (ahead[lost]!.frozenTurns ?? 0) >= 2;
    add({
      id: "loss",
      severity: "danger",
      text: `The ${hubName} will be lost ${inTurns(lost + 1)}: ${ahead[lost]!.lostReason ?? "it cannot keep going."}`,
      fix: frozen ? powerFix(s, sc, ctx) : `Repair the ${hubName} (1 action point) and keep it powered.`,
      turnsLeft: lost + 1,
    });
  }

  // energy runs out
  const dark = ahead.findIndex((x) => x.frozenTurns > 0);
  if (dark >= 0) {
    const env = s.schedule[s.turn - 1 + dark];
    const night = !!env && env.sunFactor <= 0.5;
    add({
      id: "battery-empty",
      severity: dark <= 1 ? "danger" : "warn",
      text: `Battery empty ${inTurns(dark + 1)}${night ? ": the dark is coming" : ": power use is above what you make"}.`,
      fix: powerFix(s, sc, ctx),
      turnsLeft: dark + 1,
    });
  }

  // structures the power logic will switch off
  const cutAt = ahead.findIndex((x) => x.lastReport?.effects.some((e) => e.kind === "power-out" && e.structureIds.length > 0));
  if (cutAt >= 0 && dark < 0) {
    const ids = ahead[cutAt]!.lastReport!.effects.flatMap((e) => (e.kind === "power-out" ? e.structureIds : []));
    const names = [...new Set(ids.map((id) => s.structures.find((x) => x.id === id)).filter((x): x is Structure => !!x).map((x) => labelOf(sc, x)))];
    add({ id: "power-short", severity: "warn", text: `Power short ${inTurns(cutAt + 1)}: ${names.join(", ") || "science"} will switch off.`, fix: powerFix(s, sc, ctx), turnsLeft: cutAt + 1 });
  }

  // the hub wearing down
  if (hub && hub.health > 0) {
    const end = ahead[ahead.length - 1];
    const later = end?.structures.find((x) => x.id === hub.id)?.health ?? hub.health;
    if (hub.health <= 35 || later <= 25)
      add({
        id: "hub-health",
        severity: later <= 25 ? "danger" : "warn",
        text: `The ${hubName} is at ${Math.round(hub.health)} health${later < hub.health ? ` and falling to ${Math.round(later)}` : ""}.`,
        fix: `Repair the ${hubName} (1 action point, +40 health).`,
      });
  }
  for (const st of s.structures) {
    if (st === hub || st.health <= 0 || st.health > 25 || hasTrait(sc, st, "overlay")) continue;
    add({ id: `health:${st.id}`, severity: "warn", text: `${labelOf(sc, st)} is at ${Math.round(st.health)} health.`, fix: `Repair it (1 action point, +40 health).` });
  }

  // the consumable runs out
  const need = s.structures.filter(isActive).reduce((sum, st) => sum + (defOf(sc, st.kind)?.consumeKgPerTurn ?? 0), 0);
  if (need > 0) {
    const short = ahead.findIndex((x) => x.waterKg < need);
    const hubNeeds = !!hub && (defOf(sc, hub.kind)?.consumeKgPerTurn ?? 0) > 0;
    if (short >= 0)
      add({
        id: "consumable",
        severity: hubNeeds && short <= 1 ? "danger" : "warn",
        text: `${sc.consumable.label} runs out ${inTurns(short + 1)}${hubNeeds ? `: the ${hubName} will start failing` : ": experiments will stop"}.`,
        fix: sc.missionId === "moon-base-zero" ? "Drill ice on a shadowed tile." : sc.missionId === "earth-guardian" ? "Stop retasking imagers: each move burns propellant." : "Unload the next resupply ship.",
        turnsLeft: short + 1,
      });
  }

  // storms ahead
  for (let k = 1; k <= WARNING_TURNS; k++) {
    const env = s.schedule[s.turn - 1 + k];
    if (!env?.storm) continue;
    add({ id: "storm", severity: "warn", text: `Solar storm ${inTurns(k)}${env.storm.liveSource ? " (a real NASA record)" : ""}.`, fix: stormFix(sc), turnsLeft: k });
    break;
  }

  // data that cannot get home
  const spill = ahead.findIndex((x) => x.dataLostGb > s.dataLostGb + 0.5);
  if (spill >= 0) {
    const lostGb = Math.round(ahead[spill]!.dataLostGb - s.dataLostGb);
    add({ id: "data-full", severity: "warn", text: `Data storage full ${inTurns(spill + 1)}: ${lostGb} Gb will be lost.`, fix: "Deploy an antenna or a relay terminal, or switch off an instrument.", turnsLeft: spill + 1 });
  }
  const near = sc.nearHubRange ?? 1;
  const mesh = s.structures.some((st) => isActive(st) && hasTrait(sc, st, "mesh"));
  if (!mesh && Number.isFinite(near)) {
    const home = hubTile(s);
    const far = s.structures.find((st) => {
      const t = tileById(s, st.tileId);
      return isActive(st) && hasTrait(sc, st, "instrument") && !!t && hexDist(t, home) > near;
    });
    if (far) add({ id: `far:${far.id}`, severity: "warn", text: `${labelOf(sc, far)} is too far from the ${hubName}: its data is not collected.`, fix: `Move it next to the ${hubName}, or deploy a surface mesh.` });
  }

  // modules still in the cargo bay
  if (s.inventory.length)
    add({ id: "cargo", severity: "info", text: `${s.inventory.length} module${s.inventory.length > 1 ? "s" : ""} still in the cargo bay.`, fix: "Deploy them: 1 action point each." });

  const rank = { danger: 0, warn: 1, info: 2 } as const;
  return out.sort((a, b) => rank[a.severity] - rank[b.severity] || (a.turnsLeft ?? 9) - (b.turnsLeft ?? 9));
}
