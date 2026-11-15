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

type AudioEntry = { src: string; seconds: number; speech?: [number, number][] };
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

// 3-minute cut, retimed to the v2 narration (one take, vo180.wav from frame 100; Dayon 2026-11-15).
// Each span starts ~12 frames before its first word. Never above 3:00.
export const TOTAL180 = 5385;
export const T180 = {
  s01: [0, 437], // countdown + "I've spent my life around rockets... Five agencies..."
  s02: [437, 938], // "But the way we work together has barely changed..."
  s03: [938, 1964], // reveal: "Then I saw SpaceDAO..." (impact on 938, word on 950)
  s04: [1964, 2217], // "You can't build that in a weekend..."
  s05: [2217, 2615], // "Pick a real mission..."
  s06: [2615, 3332], // "Before launch... four-of-four multi-signature... quantum-safe... room full of lawyers"
  s07: [3332, 3875], // "Then you fly... solar storms are real..."
  s08: [3875, 4775], // "Then the debrief... what a blockchain gives... No tokens. No money."
  s09: [4775, 5030], // "All of it runs on live NASA data..."
  s10: [5030, 5385], // "I've waited my whole life for this... Space belongs to humanity... Play SpaceDAO."
} as const;
