import { staticFile } from "remotion";
import { loadFont as loadMichroma } from "@remotion/google-fonts/Michroma";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import data from "./assets.json";

export const FPS = 30;
export const TOTAL = 900;

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
};

// scene spans in frames [from, to)
export const T = {
  earth: [0, 120],
  belong: [120, 210],
  treaty: [210, 300],
  reveal: [300, 450],
  share: [450, 570],
  sign: [570, 660],
  flight: [660, 720],
  montage: [720, 840],
  end: [840, 900],
} as const;

type AudioEntry = { src: string; seconds: number };
const assets = data as { audio: Record<string, AudioEntry>; clips: Record<string, AudioEntry> };

export const audio = (name: string): AudioEntry | undefined => assets.audio[name];
export const audioSrc = (name: string): string | undefined => {
  const a = assets.audio[name];
  return a ? staticFile(a.src) : undefined;
};
export const clipSrc = (name: string): string | undefined => {
  const c = assets.clips[name];
  return c ? staticFile(c.src) : undefined;
};
