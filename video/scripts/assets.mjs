// Resolves audio and clips that exist in public/ and writes src/assets.json (paths + durations).
// Missing files are left out: audio stays silent and clips render a placeholder frame.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUB = path.join(ROOT, "public");
const CLIPS = ["opentech", "data", "rideshare", "review", "sign", "flight", "missions", "rocky", "ops", "debrief", "intro", "coalition", "design", "nasalive"];

const probe = (file) =>
  +execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString().trim();

// Speech inside a narration take: [start, end] seconds, pauses under 0.45 s count as speech so the music
// only rises in real silences (Soundtrack ducks on these, not on the whole file).
const speechOf = (file) => {
  const log = spawnSync("ffmpeg", ["-hide_banner", "-i", file, "-af", "silencedetect=noise=-38dB:d=0.45", "-f", "null", "-"]).stderr.toString();
  const out = [];
  let from = 0;
  for (const m of log.matchAll(/silence_start: ([\d.]+)[\s\S]*?silence_end: ([\d.]+)/g)) {
    if (+m[1] > from) out.push([+from.toFixed(3), +(+m[1]).toFixed(3)]);
    from = +m[2];
  }
  const dur = probe(file);
  if (dur > from + 0.05) out.push([+from.toFixed(3), +dur.toFixed(3)]);
  return out;
};

const audio = {};
const addAudio = (key, rel, speech = false) => {
  const abs = path.join(PUB, rel);
  if (!existsSync(abs)) return;
  audio[key] = { src: rel, seconds: probe(abs) };
  if (speech) audio[key].speech = speechOf(abs);
};
addAudio("music", "audio/music.mp3");
addAudio("music180", "audio/music180.mp3");
// 3-minute narration: one continuous take
addAudio("vo180", "audio/vo/vo180.wav", true);
// 30 s narration: one continuous take, kept as WAV (the render encodes the mix to AAC 320 kb/s)
addAudio("vo30", "audio/vo/vo30.wav", true);
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
console.log(`music: ${audio.music ? "ok" : "missing (silent)"}`);
for (const v of ["vo30", "vo180"]) console.log(`${v}: ${audio[v] ? `ok (${audio[v].seconds.toFixed(2)} s, ${audio[v].speech.length} speech runs)` : "missing"}`);
console.log(`clips: ${Object.keys(clips).length}/${CLIPS.length}${Object.keys(clips).length < CLIPS.length ? ` (placeholders: ${CLIPS.filter((c) => !clips[c]).join(", ")})` : ""}`);
