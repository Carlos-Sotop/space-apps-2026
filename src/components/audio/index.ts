import { useSyncExternalStore } from "react";

export type SfxName = "hover" | "click" | "select" | "confirm" | "back" | "warning" | "error" | "launch" | "turn" | "storm" | "impact" | "success" | "publish";

// Files in public/audio/ (credits in README "References"): Kenney CC0 UI and sci-fi packs,
// NASA SLS engine test audio (public domain), music by Scott Buckley (CC BY 4.0).
const VOLUME: Record<SfxName, number> = {
  hover: 0.15, click: 0.35, select: 0.45, confirm: 0.5, back: 0.35, warning: 0.5, error: 0.5,
  launch: 0.7, turn: 0.4, storm: 0.55, impact: 0.6, success: 0.55, publish: 0.55,
};
const MUSIC_SRC = "/audio/music-ambient.ogg";
const MUSIC_VOLUME = 0.22;
const KEY = "spacedao.muted";

function readMuted(): boolean {
  try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
}

let muted = readMuted();
let unlocked = false;
const listeners = new Set<() => void>();
const pool = new Map<SfxName, HTMLAudioElement>();
let music: HTMLAudioElement | null = null;
const lastPlayed = new Map<SfxName, number>();

const canPlay = () => typeof window !== "undefined" && typeof Audio !== "undefined";

/** Music belongs to the game only: never on the landing page. */
const inGame = () => typeof location !== "undefined" && location.pathname.startsWith("/play");

function startMusic() {
  if (!canPlay() || muted || !unlocked || !inGame()) return;
  if (!music) {
    music = new Audio(MUSIC_SRC);
    music.loop = true;
    music.volume = MUSIC_VOLUME;
  }
  void music.play().catch(() => { /* blocked until a gesture */ });
}

// Browsers only allow audio after a user gesture: unlock on the first one.
if (canPlay()) {
  const unlock = () => {
    if (unlocked) return;
    unlocked = true;
    startMusic();
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);

  // A video's own soundtrack wins: duck the music while any <video> plays, bring it back after.
  document.addEventListener("play", (e) => {
    if (e.target instanceof HTMLVideoElement) music?.pause();
  }, true);
  const resumeAfterVideo = (e: Event) => {
    if (e.target instanceof HTMLVideoElement) startMusic();
  };
  document.addEventListener("pause", resumeAfterVideo, true);
  document.addEventListener("ended", resumeAfterVideo, true);
}

/** Play a short sound effect. Silent when muted, before the first gesture, or if the file fails. */
export function sfx(name: SfxName): void {
  if (!canPlay() || muted || !unlocked) return;
  const now = performance.now();
  if (now - (lastPlayed.get(name) ?? 0) < 60) return; // no machine-gun repeats
  lastPlayed.set(name, now);
  let base = pool.get(name);
  if (!base) {
    base = new Audio(`/audio/${name}.ogg`);
    base.preload = "auto";
    pool.set(name, base);
  }
  const node = base.paused ? base : (base.cloneNode(true) as HTMLAudioElement);
  node.volume = VOLUME[name];
  node.currentTime = 0;
  void node.play().catch(() => { /* ignore */ });
}

function setMuted(next: boolean) {
  muted = next;
  try { localStorage.setItem(KEY, next ? "1" : "0"); } catch { /* storage unavailable */ }
  if (next) music?.pause();
  else if (unlocked) startMusic();
  listeners.forEach((l) => l());
}

export function useSound(): { muted: boolean; toggle: () => void } {
  const value = useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => muted,
    () => false,
  );
  return { muted: value, toggle: () => setMuted(!muted) };
}
