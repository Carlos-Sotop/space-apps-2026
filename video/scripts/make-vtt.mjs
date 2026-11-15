// Exports out/spacedao-30s.en.vtt from src/captions.ts (Node strips the types natively).
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { captions as c30 } from "../src/captions.ts";
import { captions180 } from "../src/captions180.ts";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const FPS = 30;
const long = process.argv.includes("180");
const captions = long ? captions180 : c30;

const stamp = (frame) => {
  const ms = Math.round((frame / FPS) * 1000);
  const p = (n, w = 2) => String(n).padStart(w, "0");
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)}.${p(ms % 1000, 3)}`;
};

const body = captions.map((c, i) => `${i + 1}\n${stamp(c.from)} --> ${stamp(c.to)}\n${c.text}\n`).join("\n");
mkdirSync(path.join(ROOT, "out"), { recursive: true });
const out = path.join(ROOT, long ? "out/spacedao-3min.en.vtt" : "out/spacedao-30s.en.vtt");
writeFileSync(out, `WEBVTT\n\n${body}`);
console.log(`wrote ${path.relative(process.cwd(), out)} (${captions.length} cues)`);
