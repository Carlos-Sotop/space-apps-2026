import { staticFile } from "remotion";
import { loadFont as loadMichroma } from "@remotion/google-fonts/Michroma";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import data from "./assets.json";

export const FPS = 30;
export const TOTAL = 840;

export const DISPLAY = loadMichroma("normal", { subsets: ["latin"] }).fontFamily;
export const SANS = loadInter("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin"] }).fontFamily;
export const MONO = loadMono("normal", { weights: ["400", "500", "700"], subsets: ["latin"] }).fontFamily;

export const C = {
  bg: "#04050d",
  bgDeep: "#0a0b1e",
  text: "#eef0ff",
  muted: "#9aa0c3",
  faint: "#5d6390",
  violet: "#8b5cf6",
  violetBright: "#a78bfa",
  blue: "#3b82f6",
  blueBright: "#60a5fa",
  cyan: "#22d3ee",
  cyanBright: "#67e8f9",
  glass: "rgba(12,14,34,0.72)",
  line: "rgba(255,255,255,0.12)",
  over: "#fb7185",
  ok: "#34d399",
};

// scene spans in frames [from, to), retimed to the v2 narration (one take, vo30.wav from frame 24; Dayon 2026-11-15)
export const T = {
  earth: [0, 108], // "Space doesn't belong to one nation."
  belong: [108, 172], // "It belongs to all of us."
  treaty: [172, 300], // "Yet today, space exploration remains divided."
  reveal: [300, 400], // impact on 300, "Enter SpaceDAO" on 304
  share: [400, 498], // "...to share technology, resources, and knowledge."
  sign: [498, 545], // "Decide together."
  flight: [545, 588], // "Launch together."
  montage: [588, 718], // "Design your mission with live NASA data. Play SpaceDAO."
  end: [718, 840], // "Space belongs to humanity." + wordmark + URL
} as const;

type AudioEntry = { src: string; seconds: number };
// written by capture/capture.mjs: capture size, an optional focus rect [x, y, w, h], cursor moves [t, x, y]
export type Track = { w: number; h: number; rect: [number, number, number, number] | null; moves: [number, number, number][] };
type ClipEntry = AudioEntry & { track?: Track };
const assets = data as unknown as { audio: Record<string, AudioEntry>; clips: Record<string, ClipEntry> };
export const clipTrack = (name: string): Track | undefined => assets.clips[name]?.track;

export const audio = (name: string): AudioEntry | undefined => assets.audio[name];
export const audioSrc = (name: string): string | undefined => {
  const a = assets.audio[name];
  return a ? staticFile(a.src) : undefined;
};
export const clipSrc = (name: string): string | undefined => {
  const c = assets.clips[name];
  return c ? staticFile(c.src) : undefined;
};

// 3-minute cut: one span per voice-over line (vo180_01 ... vo180_10), frames at 30 fps
export const TOTAL180 = 5400;
export const T180 = {
  s01: [0, 600],
  s02: [600, 1350],
  s03: [1350, 2250],
  s04: [2250, 2700],
  s05: [2700, 3300],
  s06: [3300, 3750],
  s07: [3750, 4350],
  s08: [4350, 4800],
  s09: [4800, 5160],
  s10: [5160, 5400],
} as const;
