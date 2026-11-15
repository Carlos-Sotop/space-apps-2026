// Prepares the renders for the website: public/video/ in the app repo.
// Usage: node scripts/publish.mjs <path to the app's public/video> [30s|3min ...]
//
// Each mp4 must stay under 25 MiB, Cloudflare's limit for one static asset (a bigger file fails the deploy).
// It tries CRF 23 first; if that is too big it falls back to a two-pass encode sized to fit.
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "out");
const [target, ...only] = process.argv.slice(2);
if (!target) {
  console.error("usage: node scripts/publish.mjs <app>/public/video [30s|3min]");
  process.exit(1);
}
mkdirSync(target, { recursive: true });

const LIMIT = 24 * 1024 * 1024; // a margin under 25 MiB
const AUDIO_KBPS = 320;
const LOUDNORM = "loudnorm=I=-14:TP=-1.5:LRA=11";
// poster: a frame of the reveal (30 s: the climax lands on frame 300; 3 min: on frame 1350).
// copy: keep the render's video stream as is (when the master already fits under the limit) and only re-encode
// the audio. Both get Dayon's web loudness, loudnorm I=-14 TP=-1.5 LRA=11, as AAC 320 kb/s.
const VIDEOS = [
  { id: "30s", poster: 345, copy: true },
  { id: "3min", poster: 980 },
];

// AudioToolbox AAC (macOS) holds a constant bitrate; ffmpeg's own AAC encoder averages under the target
const AAC = execFileSync("ffmpeg", ["-hide_banner", "-encoders"]).toString().includes("aac_at") ? ["-c:a", "aac_at", "-aac_at_mode", "cbr"] : ["-c:a", "aac"];
const run = (args) => execFileSync("ffmpeg", ["-v", "error", "-y", ...args], { stdio: "inherit" });
const seconds = (file) => +execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString().trim();
const videoSeconds = (file) => +execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=duration", "-of", "csv=p=0", file]).toString().trim();
const mib = (file) => (statSync(file).size / 1024 / 1024).toFixed(1);

for (const v of VIDEOS) {
  if (only.length && !only.includes(v.id)) continue;
  const src = path.join(OUT, `spacedao-${v.id}.mp4`);
  if (!existsSync(src)) {
    console.warn(`skip ${v.id}: ${path.relative(process.cwd(), src)} not rendered`);
    continue;
  }
  const mp4 = path.join(target, `spacedao-${v.id}.mp4`);
  // loudnorm and the AAC encoder pad the end; cut the audio at the picture's last frame
  const audioArgs = [...AAC, "-b:a", `${AUDIO_KBPS}k`, "-ar", "48000", "-af", LOUDNORM, "-t", String(videoSeconds(src))];
  const common = ["-pix_fmt", "yuv420p", "-movflags", "+faststart", ...audioArgs];
  if (v.copy) run(["-i", src, "-c:v", "copy", "-movflags", "+faststart", ...audioArgs, mp4]);
  else run(["-i", src, "-c:v", "libx264", "-preset", "slow", "-crf", "23", ...common, mp4]);
  // too big: two-pass sized to the limit (x264 overshoots a few percent, hence the 0.93), keeping 1080p,
  // which looked closer to the master than 720p at the same bitrate on the 3-minute cut
  for (let fit = 0.93; statSync(mp4).size > LIMIT && fit > 0.6; fit -= 0.08) {
    const kbps = Math.floor(((LIMIT * 8) / seconds(src) / 1000) * fit) - AUDIO_KBPS;
    console.log(`${v.id}: ${mib(mp4)} MiB is over the limit; two-pass at ${kbps} kb/s`);
    const log = path.join(OUT, `pass-${v.id}`);
    run(["-i", src, "-c:v", "libx264", "-preset", "slow", "-b:v", `${kbps}k`, "-pass", "1", "-passlogfile", log, "-an", "-f", "mp4", "/dev/null"]);
    run(["-i", src, "-c:v", "libx264", "-preset", "slow", "-b:v", `${kbps}k`, "-pass", "2", "-passlogfile", log, ...common, mp4]);
  }
  if (statSync(mp4).size > 25 * 1024 * 1024) throw new Error(`${v.id}: ${mib(mp4)} MiB is over Cloudflare's 25 MiB asset limit`);
  run(["-ss", (v.poster / 30).toFixed(3), "-i", src, "-frames:v", "1", "-q:v", "3", path.join(target, `spacedao-${v.id}.jpg`)]);
  const vtt = path.join(OUT, `spacedao-${v.id}.en.vtt`);
  if (existsSync(vtt)) copyFileSync(vtt, path.join(target, `spacedao-${v.id}.en.vtt`));
  else console.warn(`${v.id}: no captions at ${path.relative(process.cwd(), vtt)} (run npm run vtt${v.id === "3min" ? "180" : ""})`);
  console.log(`${v.id}: ${mib(mp4)} MiB -> ${mp4}`);
}
