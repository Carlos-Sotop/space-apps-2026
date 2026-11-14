import { describe, expect, it } from "vitest";
import { catalog } from "../data";
import { defaultDesign, simulateFlight } from "../engine";
import { recommendedCoalitions } from "../lib/coalition";
import { applyAction, canRunOps, createOps, finalScore, type OpsAction, type OpsState } from "../ops";
import type { ScoreSubmission } from "./types";
import { verifySubmission } from "./verify";

const mission = catalog.missions.find((m) => m.id === "moon-base-zero")!;
const lead = catalog.actors[0].id;
const rec = recommendedCoalitions(mission, lead)[0];
const design = defaultDesign(mission.id, { leadId: lead, partnerIds: rec.partnerIds as [string, string, string] }, catalog);

/** Plays operations by only advancing and taking the first option of each card. */
function idlePlay(seedFlight: number, seedOps: number): { sub: ScoreSubmission; ops: OpsState | null } {
  const flight = simulateFlight(design, catalog, seedFlight);
  let ops: OpsState | null = null;
  if (canRunOps(flight)) {
    ops = createOps(design, catalog, { flight, seed: seedOps });
    const ctx = { design, catalog };
    for (let i = 0; i < 80 && ops.status === "running"; i++) {
      const a: OpsAction = ops.pendingEvent ? { type: "choose", eventId: ops.pendingEvent.id, optionId: ops.pendingEvent.options[1].id } : { type: "advance" };
      ops = applyAction(ops, a, ctx);
    }
  }
  const sub: ScoreSubmission = {
    playerName: "Test Crew", country: "BR", mode: "solo", crewSize: 1, design, customBlueprints: [], flightSeed: seedFlight, live: null,
    ops: ops ? { seed: seedOps, live: null, actions: ops.actions } : null,
  };
  return { sub, ops };
}

describe("verifySubmission", () => {
  it("recomputes the same final score the client saw", () => {
    const { sub, ops } = idlePlay(42, 7);
    const res = verifySubmission(sub, catalog);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.row.total).toBe(finalScore(simulateFlight(design, catalog, 42), ops).total);
    expect(res.row.manifest_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("rejects an operations log with an impossible move", () => {
    const { sub } = idlePlay(42, 7);
    if (!sub.ops) return;
    sub.ops.actions = [{ type: "deploy", moduleId: "not-a-module", tileId: "nowhere" }, ...sub.ops.actions];
    expect(verifySubmission(sub, catalog)).toMatchObject({ ok: false });
  });

  it("rejects unfinished operations and bad names", () => {
    const { sub } = idlePlay(42, 7);
    if (sub.ops) expect(verifySubmission({ ...sub, ops: { ...sub.ops, actions: sub.ops.actions.slice(0, 2) } }, catalog)).toMatchObject({ ok: false });
    expect(verifySubmission({ ...sub, playerName: "<script>" }, catalog)).toMatchObject({ ok: false });
  });

  it("ignores a score the client claims: only the replay counts", () => {
    const { sub } = idlePlay(42, 7);
    const forged = { ...sub, total: 1000, grade: "S" } as ScoreSubmission;
    const a = verifySubmission(sub, catalog), b = verifySubmission(forged, catalog);
    expect(a.ok && b.ok && a.row.total === b.row.total).toBe(true);
  });
});
