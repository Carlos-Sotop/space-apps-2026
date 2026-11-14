import { useEffect, useState } from "react";
import { useGame } from "@/store/game";
import { fetchLiveContext, fetchLiveRoute, snapshots } from "./client";

let started = false;

/** Loads the live context once per session into the game store. Returns the current context. */
export function useLive() {
  const live = useGame((s) => s.live);
  const status = useGame((s) => s.liveStatus);
  const setLive = useGame((s) => s.setLive);
  const setLiveStatus = useGame((s) => s.setLiveStatus);

  useEffect(() => {
    if (started) return;
    started = true;
    setLiveStatus("loading");
    fetchLiveContext().then((ctx) => setLive(ctx, ctx.snapshot ? "snapshot" : "live"));
  }, [setLive, setLiveStatus]);

  return { live, status };
}

/** Small live feeds for badges (ISS position, Moon distance). Starts from the snapshot, then upgrades. */
export function useLiveRoute<K extends keyof typeof snapshots>(name: K) {
  const [data, setData] = useState<(typeof snapshots)[K]>(snapshots[name]);
  useEffect(() => {
    let alive = true;
    fetchLiveRoute(name).then((d) => alive && setData(d));
    return () => { alive = false; };
  }, [name]);
  return data;
}
