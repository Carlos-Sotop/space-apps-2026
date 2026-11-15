// Records the running game into public/clips/<name>.mp4 (1920x1080, constant 30 fps, ~4 s each).
// Usage: APP_URL=http://localhost:5173/play node capture/capture.mjs [shot ...]   (no args = all shots)
// APP_URL may also be the first CLI arg if it starts with http. Set it to the site root if /play is not merged yet.
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, renameSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, "../public/clips");
const TMP = process.env.CAPTURE_TMP ?? path.join(HERE, ".frames");
const args = process.argv.slice(2);
const APP = (args.find((a) => a.startsWith("http")) ?? process.env.APP_URL ?? "http://localhost:5173/play").replace(/\/$/, "");
const wanted = args.filter((a) => !a.startsWith("http"));
const W = 1920, H = 1080, SECONDS = 4;
const MOON = "mission=moon-base-zero";

mkdirSync(OUT, { recursive: true });

const wait = (page, ms) => page.waitForTimeout(ms);

// visible cursor dot so viewers see what is hovered or clicked
const CURSOR_JS = `
(() => {
  const d = document.createElement("div");
  d.style.cssText = "position:fixed;z-index:2147483647;width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:50%;background:rgba(103,232,249,.35);border:2px solid rgba(103,232,249,.9);box-shadow:0 0 18px rgba(34,211,238,.6);pointer-events:none;transition:transform .12s";
  addEventListener("DOMContentLoaded", () => document.body.appendChild(d));
  addEventListener("mousemove", (e) => { d.style.left = e.clientX + "px"; d.style.top = e.clientY + "px"; }, true);
  addEventListener("mousedown", () => (d.style.transform = "scale(.6)"), true);
  addEventListener("mouseup", () => (d.style.transform = "scale(1)"), true);
  const s = document.createElement("style");
  s.textContent = "html{scrollbar-width:none}";
  document.documentElement.appendChild(s);
})();`;

async function moveTo(page, loc) {
  const box = await loc.boundingBox();
  if (!box) return false;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 18 });
  return true;
}

async function hoverFirst(page, selector) {
  const loc = page.locator(selector).first();
  if (await loc.count()) await moveTo(page, loc).catch(() => {});
}

async function clickText(page, re) {
  const loc = page.getByRole("button", { name: re }).first();
  if (!(await loc.count())) return false;
  await moveTo(page, loc).catch(() => {});
  await wait(page, 250);
  await loc.click({ timeout: 2000 }).catch(() => {});
  return true;
}

const scroll = (page, dy) => page.mouse.wheel(0, dy);

// each shot: [url path, interaction]
const SHOTS = {
  missions: [`/?screen=missions`, async (p) => {
    await wait(p, 500);
    await hoverFirst(p, "[data-coach*='mission']");
    await wait(p, 900);
    await p.mouse.move(1200, 520, { steps: 25 });
    await wait(p, 1200);
  }],
  rocky: [`/?mode=guided&screen=coalition&${MOON}`, async (p) => {
    await wait(p, 800);
    await hoverFirst(p, "[data-coach*='rocky']");
    await scroll(p, 220);
    await wait(p, 1200);
    await p.mouse.move(900, 500, { steps: 20 });
  }],
  intro: ["", async (p) => {
    await wait(p, 1200);
    for (let i = 0; i < 3; i++) {
      if (!(await clickText(p, /start|play|next|continue|begin|skip/i))) break;
      await wait(p, 900);
    }
  }],
  coalition: [`/?mode=quick&screen=coalition&mission=moon-base-zero`, async (p) => {
    await wait(p, 800);
    await hoverFirst(p, "[data-coach*='coalition']");
    await scroll(p, 260);
    await wait(p, 1200);
    await p.mouse.move(1000, 520, { steps: 20 });
  }],
  design: [`/?mode=quick&screen=control&${MOON}&step=build`, async (p) => {
    await wait(p, 800);
    await hoverFirst(p, "[data-coach*='build'] >> nth=0");
    await wait(p, 900);
    await scroll(p, 300);
    await wait(p, 1000);
  }],
  nasalive: [`/?mode=quick&screen=control&${MOON}&step=build`, async (p) => {
    await wait(p, 900);
    const chip = p.getByRole("button", { name: /nasa live/i }).first();
    if (await chip.count()) {
      await moveTo(p, chip).catch(() => {});
      await wait(p, 300);
      await chip.click({ timeout: 2000 }).catch(() => {});
    }
    await wait(p, 1800);
  }],
  opentech: [`/?mode=quick&screen=control&${MOON}&step=opentech`, async (p) => {
    await wait(p, 600);
    await hoverFirst(p, "[data-coach*='opentech'] >> nth=0");
    await wait(p, 700);
    await scroll(p, 300);
    await wait(p, 900);
    await clickText(p, /adopt|share|open/i);
  }],
  data: [`/?mode=quick&screen=control&${MOON}&step=objectives`, async (p) => {
    await wait(p, 600);
    await hoverFirst(p, "[data-coach*='objective'] >> nth=0");
    await wait(p, 800);
    await scroll(p, 260);
    await wait(p, 900);
  }],
  rideshare: [`/?mode=quick&screen=control&${MOON}&step=rideshare`, async (p) => {
    await wait(p, 600);
    await hoverFirst(p, "[data-coach*='rideshare'] >> nth=0");
    await wait(p, 800);
    await scroll(p, 300);
    await wait(p, 800);
    await clickText(p, /book|reserve|add|adopt/i);
  }],
  review: [`/?mode=quick&screen=control&${MOON}&step=council`, async (p) => {
    await wait(p, 800);
    await scroll(p, 240);
    await wait(p, 1000);
    await clickText(p, /go\b|approve|continue/i);
    await wait(p, 900);
  }],
  sign: [`/?mode=quick&screen=control&${MOON}&step=council`, async (p) => {
    await wait(p, 800);
    await scroll(p, 700);
    await wait(p, 900);
    await clickText(p, /sign/i);
    await wait(p, 1200);
  }],
  flight: [`/?screen=flight&${MOON}`, async (p) => {
    await wait(p, 900);
    await p.mouse.move(1000, 500, { steps: 20 });
    await wait(p, 1200);
    await p.mouse.move(800, 560, { steps: 30 });
  }],
  ops: [`/?screen=ops&${MOON}`, async (p) => {
    await wait(p, 800);
    await p.mouse.move(1000, 540, { steps: 20 });
    await clickText(p, /start|next|continue|run/i);
    await wait(p, 1200);
  }],
  debrief: [`/?screen=debrief&${MOON}`, async (p) => {
    await wait(p, 800);
    await scroll(p, 400);
    await wait(p, 1000);
    await scroll(p, 400);
    await wait(p, 600);
  }],
};

async function record(browser, name, [route, interact]) {
  const dir = path.join(TMP, name);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const ctx = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: 1,
    recordVideo: { dir, size: { width: W, height: H } },
  });
  await ctx.addInitScript(CURSOR_JS);
  const page = await ctx.newPage();
  try {
    await page.goto(APP + route, { waitUntil: "networkidle", timeout: 30_000 });
    await wait(page, 600);
    const t0 = Date.now();
    await interact(page).catch((e) => console.warn(`${name}: interaction warning: ${e.message.split("\n")[0]}`));
    const left = SECONDS * 1000 - (Date.now() - t0);
    if (left > 0) await wait(page, left);
  } finally {
    await page.close();
    await ctx.close();
  }
  const webm = readdirSync(dir).find((f) => f.endsWith(".webm"));
  if (!webm) throw new Error("no video recorded");
  const raw = path.join(dir, "raw.webm");
  renameSync(path.join(dir, webm), raw);
  const out = path.join(OUT, `${name}.mp4`);
  // drop the first 0.6 s (page load), keep ~4 s, constant 30 fps
  execFileSync("ffmpeg", ["-v", "error", "-y", "-ss", "0.6", "-i", raw, "-t", String(SECONDS), "-vf", `fps=30,scale=${W}:${H}:flags=lanczos,format=yuv420p`, "-c:v", "libx264", "-crf", "14", "-preset", "slow", "-an", out]);
  console.log(`${name}: ok -> ${path.relative(process.cwd(), out)}`);
}

const names = wanted.length ? wanted : Object.keys(SHOTS);
const browser = await chromium.launch();
const failed = [];
for (const name of names) {
  if (!SHOTS[name]) {
    console.warn(`unknown shot: ${name}`);
    continue;
  }
  try {
    await record(browser, name, SHOTS[name]);
  } catch (e) {
    failed.push(name);
    console.error(`${name}: FAILED ${e.message.split("\n")[0]}`);
  }
}
await browser.close();
if (failed.length) console.log(`failed: ${failed.join(", ")}`);
