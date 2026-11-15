// Resolves audio and clips that exist in public/ and writes src/assets.json (paths + durations).
// Missing files are left out: audio stays silent and clips render a placeholder frame.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUB = path.join(ROOT, "public");
const CLIPS = ["opentech", "data", "rideshare", "review", "sign", "flight", "missions", "rocky", "ops", "debrief", "intro", "coalition", "design", "nasalive"];
const VO = Array.from({ length: 9 }, (_, i) => `vo_${String(i + 1).padStart(2, "0")}`);

const probe = (file) =>
  +execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString().trim();

const audio = {};
const addAudio = (key, rel) => {
  const abs = path.join(PUB, rel);
  if (existsSync(abs)) audio[key] = { src: rel, seconds: probe(abs) };
};
addAudio("music", "audio/music.mp3");
addAudio("music180", "audio/music180.mp3");
for (let i = 1; i <= 60; i++) addAudio(`vo180_${String(i).padStart(2, "0")}`, `audio/vo/vo180_${String(i).padStart(2, "0")}.mp3`);
for (const v of VO) addAudio(v, `audio/vo/${v}.mp3`);
for (const f of readdirSync(path.join(PUB, "audio/sfx"))) if (f.endsWith(".mp3")) addAudio(`sfx_${f.slice(0, -4)}`, `audio/sfx/${f}`);

const clips = {};
for (const c of CLIPS) {
  const rel = `clips/${c}.mp4`;
  if (!existsSync(path.join(PUB, rel))) continue;
  clips[c] = { src: rel, seconds: probe(path.join(PUB, rel)) };
  // cursor track written by capture/capture.mjs: the camera in ClipView follows it
  const track = path.join(PUB, `clips/${c}.json`);
  if (existsSync(track)) clips[c].track = JSON.parse(readFileSync(track, "utf8"));
}

writeFileSync(path.join(ROOT, "src/assets.json"), JSON.stringify({ audio, clips }, null, 2));
const missingVo = VO.filter((v) => !audio[v]);
console.log(`music: ${audio.music ? "ok" : "missing (silent)"}`);
console.log(`vo: ${VO.length - missingVo.length}/${VO.length}${missingVo.length ? ` (missing ${missingVo.join(", ")})` : ""}`);
console.log(`clips: ${Object.keys(clips).length}/${CLIPS.length}${Object.keys(clips).length < CLIPS.length ? ` (placeholders: ${CLIPS.filter((c) => !clips[c]).join(", ")})` : ""}`);
