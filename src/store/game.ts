import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useMemo } from "react";
import { catalog as baseCatalog } from "@/data";
import { councilValues, defaultDesign, simulateFlight } from "@/engine";
import { MAX_SECONDARY } from "@/engine/types";
import type { Blueprint, Catalog, Coalition, FlightResult, LiveContext, MissionDesign, MissionId, Ratification, Values } from "@/engine/types";
import { getMission } from "@/lib/catalog";
import { toOpsLive } from "@/lib/opsLive";
import { fetchLiveRoute } from "@/live/client";
import { applyAction, canRunOps, createOps, type OpsAction, type OpsLive, type OpsState } from "@/ops";
import { recommendedCoalitions } from "@/lib/coalition";
import { SCREENS, type Screen, type StepId } from "./steps";

const EQUAL: Values = { science: 1 / 3, safety: 1 / 3, cost: 1 / 3 };

export type LiveStatus = "idle" | "loading" | "live" | "snapshot";

interface GameState {
  screen: Screen;
  step: StepId;
  missionId: MissionId | null;
  leadId: string | null;
  partnerIds: string[];
  playerValues: Values;
  design: MissionDesign | null;
  live: LiveContext | null;
  liveStatus: LiveStatus;
  result: FlightResult | null;
  seed: number;
  ratification: Ratification | null;
  published: Blueprint[];
  /** Operations phase after arrival (null when the flight never arrived or ops were skipped) */
  ops: OpsState | null;
  opsSeed: number;
  opsLive: OpsLive | null;

  go: (screen: Screen) => void;
  setStep: (step: StepId) => void;
  selectMission: (id: MissionId) => void;
  setLead: (id: string) => void;
  togglePartner: (id: string) => void;
  setPartners: (ids: string[]) => void;
  startControl: () => void;
  setPlayerValues: (v: Values) => void;
  patchDesign: (patch: Partial<MissionDesign>) => void;
  toggleSecondary: (id: string) => void;
  toggleIn: (key: "moduleIds" | "blueprintIds" | "rideshareIds", id: string) => void;
  adoptDesign: (d: MissionDesign) => void;
  setRatification: (r: Ratification | null) => void;
  setLive: (live: LiveContext, status: LiveStatus) => void;
  setLiveStatus: (s: LiveStatus) => void;
  fly: () => void;
  flyAgain: () => void;
  /** after the flight: start Operations if the spacecraft arrived, else go to the debrief */
  afterFlight: () => Promise<void>;
  opsAct: (a: OpsAction) => void;
  finishOps: () => void;
  publish: (bp: Blueprint) => void;
  newMission: () => void;
  devJump: (params: URLSearchParams) => void;
}

const newSeed = () => 1 + Math.floor(Math.random() * 2_000_000_000);

/** Catalog the engine sees: the shipped data plus blueprints the player published. */
export function catalogWith(published: Blueprint[]): Catalog {
  return published.length ? { ...baseCatalog, blueprints: [...baseCatalog.blueprints, ...published] } : baseCatalog;
}

function withValues(design: MissionDesign, playerValues: Values, published: Blueprint[]): MissionDesign {
  return { ...design, values: councilValues(design.coalition, playerValues, catalogWith(published)).values };
}

function coalitionOf(s: Pick<GameState, "leadId" | "partnerIds">): Coalition | null {
  return s.leadId && s.partnerIds.length === 3 ? { leadId: s.leadId, partnerIds: s.partnerIds as [string, string, string] } : null;
}

const safeStorage = {
  getItem: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  setItem: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } },
  removeItem: (k: string) => { try { localStorage.removeItem(k); } catch { /* storage unavailable */ } },
};

const known = (id: string, ids: string[]) => ids.includes(id);

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      screen: "intro",
      step: "values",
      missionId: null,
      leadId: null,
      partnerIds: [],
      playerValues: EQUAL,
      design: null,
      live: null,
      liveStatus: "idle",
      result: null,
      seed: 1,
      ratification: null,
      published: [],
      ops: null,
      opsSeed: 1,
      opsLive: null,

      go: (screen) => set({ screen }),
      setStep: (step) => set({ step }),

      selectMission: (id) => set({ missionId: id, leadId: null, partnerIds: [], design: null, result: null, ratification: null, step: "values", screen: "coalition" }),
      setLead: (id) => set((s) => ({ leadId: id, partnerIds: s.partnerIds.filter((p) => p !== id) })),
      togglePartner: (id) => set((s) => {
        if (id === s.leadId) return s;
        if (s.partnerIds.includes(id)) return { partnerIds: s.partnerIds.filter((p) => p !== id) };
        return s.partnerIds.length >= 3 ? s : { partnerIds: [...s.partnerIds, id] };
      }),
      setPartners: (ids) => set((s) => ({ partnerIds: ids.filter((p) => p !== s.leadId).slice(0, 3) })),

      startControl: () => {
        const s = get();
        const coalition = coalitionOf(s);
        if (!s.missionId || !coalition) return;
        const cat = catalogWith(s.published);
        set({
          design: withValues(defaultDesign(s.missionId, coalition, cat), s.playerValues, s.published),
          result: null, ratification: null, step: "values", screen: "control",
        });
      },

      setPlayerValues: (v) => set((s) => ({ playerValues: v, design: s.design ? withValues(s.design, v, s.published) : s.design, ratification: null })),

      patchDesign: (patch) => set((s) => (s.design ? { design: { ...s.design, ...patch }, ratification: null } : s)),

      toggleSecondary: (id) => set((s) => {
        if (!s.design) return s;
        const has = s.design.secondaryObjectiveIds.includes(id);
        if (!has && s.design.secondaryObjectiveIds.length >= MAX_SECONDARY) return s;
        const ids = has ? s.design.secondaryObjectiveIds.filter((x) => x !== id) : [...s.design.secondaryObjectiveIds, id];
        return { design: { ...s.design, secondaryObjectiveIds: ids }, ratification: null };
      }),

      toggleIn: (key, id) => set((s) => {
        if (!s.design) return s;
        const list = s.design[key];
        return { design: { ...s.design, [key]: list.includes(id) ? list.filter((x) => x !== id) : [...list, id] }, ratification: null };
      }),

      adoptDesign: (d) => set({ design: d, ratification: null }),
      setRatification: (r) => set({ ratification: r }),
      setLive: (live, status) => set({ live, liveStatus: status }),
      setLiveStatus: (liveStatus) => set({ liveStatus }),

      fly: () => {
        const s = get();
        if (!s.design) return;
        const seed = newSeed();
        set({ seed, ops: null, opsLive: null, result: simulateFlight(s.design, catalogWith(s.published), seed, s.live ?? undefined), screen: "flight" });
      },

      afterFlight: async () => {
        const s = get();
        if (!s.design || !s.result || !canRunOps(s.result)) { set({ ops: null, screen: "debrief" }); return; }
        const dsn = await fetchLiveRoute("dsn").catch(() => null);
        const opsLive = toOpsLive(s.live, dsn);
        const opsSeed = newSeed();
        const ops = createOps(s.design, catalogWith(s.published), { flight: s.result, seed: opsSeed, live: opsLive });
        set({ ops, opsSeed, opsLive, screen: "ops" });
      },

      opsAct: (a) => set((s) => (s.ops && s.design ? { ops: applyAction(s.ops, a, { design: s.design, catalog: catalogWith(s.published) }) } : s)),

      finishOps: () => set({ screen: "debrief" }),
      flyAgain: () => get().fly(),

      publish: (bp) => set((s) => ({ published: [...s.published, bp] })),

      newMission: () => set({ missionId: null, leadId: null, partnerIds: [], design: null, result: null, ratification: null, step: "values", screen: "missions" }),

      devJump: (params) => {
        const screen = params.get("screen") as Screen | null;
        if (!screen || !SCREENS.includes(screen)) return;
        const s = get();
        if (!["intro", "story", "missions"].includes(screen)) {
          const missionId = (params.get("mission") as MissionId | null) ?? s.missionId ?? undefined;
          const mission = getMission(missionId ?? "") ?? baseCatalog.missions[0];
          const rec = recommendedCoalitions(mission, baseCatalog.actors[0].id)[0];
          set({ missionId: mission.id, leadId: s.leadId ?? baseCatalog.actors[0].id, partnerIds: s.partnerIds.length === 3 && params.get("mission") === null ? s.partnerIds : rec?.partnerIds ?? [] });
          if (screen !== "coalition") get().startControl();
          const step = params.get("step") as StepId | null;
          if (step) set({ step });
          if (screen === "flight" || screen === "debrief" || screen === "ops") get().fly();
          if (screen === "ops") { void get().afterFlight(); return; }
        }
        set({ screen });
      },
    }),
    {
      name: "spacedao-v1",
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ missionId: s.missionId, leadId: s.leadId, partnerIds: s.partnerIds, playerValues: s.playerValues, design: s.design, published: s.published }),
      // Drop saved state that no longer matches the catalog (data lanes replace catalog files often).
      merge: (saved, current) => {
        const p = (saved ?? {}) as Partial<GameState>;
        const actorIds = baseCatalog.actors.map((a) => a.id);
        const valid = !!p.design && !!getMission(p.design.missionId) && [p.design.coalition.leadId, ...p.design.coalition.partnerIds].every((id) => known(id, actorIds));
        return {
          ...current,
          missionId: p.missionId && getMission(p.missionId) ? p.missionId : null,
          leadId: p.leadId && known(p.leadId, actorIds) ? p.leadId : null,
          partnerIds: (p.partnerIds ?? []).filter((id) => known(id, actorIds)),
          playerValues: p.playerValues ?? EQUAL,
          published: p.published ?? [],
          design: valid ? p.design! : null,
        };
      },
    },
  ),
);

/** Catalog including the player's published blueprints; use this instead of importing `catalog` in screens. */
export function useCatalog(): Catalog {
  const published = useGame((s) => s.published);
  return useMemo(() => catalogWith(published), [published]);
}
