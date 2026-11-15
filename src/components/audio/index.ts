import { useCallback, useState } from "react";

export type SfxName = "hover" | "click" | "select" | "confirm" | "back" | "warning" | "error" | "launch" | "turn" | "storm" | "impact" | "success" | "publish";

const KEY = "spacedao.muted";

function readMuted(): boolean {
  try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
}

/** Sound effect hook point. No audio files yet, so this does nothing. */
export function sfx(name: SfxName): void {
  void name;
}

export function useSound(): { muted: boolean; toggle: () => void } {
  const [muted, setMuted] = useState(readMuted);
  const toggle = useCallback(() => {
    setMuted((m) => {
      try { localStorage.setItem(KEY, m ? "0" : "1"); } catch { /* storage unavailable */ }
      return !m;
    });
  }, []);
  return { muted, toggle };
}
