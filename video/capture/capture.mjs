// Records the running game into public/clips/<name>.mp4 (1920x1080, constant 30 fps).
// Usage: APP_URL=http://localhost:5173/play node capture/capture.mjs [shot ...]   (no args = all shots)
// APP_URL may also be the first CLI arg if it starts with http.
//
// Needs the Vite dev server (npm run dev): the flight, ops and debrief shots reach the game store through
// /src/store/game.ts to make the flight succeed, so they do not work against a production build.
// Chrome runs headless in its new mode, which draws WebGL on the GPU (the old headless shell falls back to
// software and the 3D scenes stutter at about 13 fps).
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, "../public/clips");
const TMP = process.env.CAPTURE_TMP ?? path.join(HERE, ".frames");
const args = process.argv.slice(2);
const APP = (args.find((a) => a.startsWith("http")) ?? process.env.APP_URL ?? "http://localhost:5173/play").replace(/\/$/, "");
const wanted = args.filter((a) => !a.startsWith("http"));

// The game is laid out for a 900 px tall window. Playwright records at the CSS size, so the page is captured at
// 1600x900 and scaled to 1920x1080 (no clip is shown wider than about 1650 px in either cut).
const VIEW = { width: 1600, height: 900 };
const W = 1920, H = 1080, FPS = 30;
const MOON = "mission=moon-base-zero";

mkdirSync(OUT, { recursive: true });

// A local dev server has no shared registry, so Publish would toast "Saved on this device". Start the dev server
// with VITE_SUPABASE_URL=https://registry.capture.invalid (any VITE_SUPABASE_PUBLISHABLE_KEY) and the capture
// answers that host the way Supabase does: stored on POST, an empty list on reads. Production is never called.
const REGISTRY = "https://registry.capture.invalid";
const answerRegistry = (route) =>
  route.request().method() === "POST"
    ? route.fulfill({ status: 201, body: "" })
    : route.fulfill({ status: 200, contentType: "application/json", body: "[]" });

// visible cursor dot so viewers see what is hovered or clicked
const CURSOR_JS = `
(() => {
  const d = document.createElement("div");
  d.style.cssText = "position:fixed;left:-40px;top:-40px;z-index:2147483647;width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:50%;background:rgba(103,232,249,.35);border:2px solid rgba(103,232,249,.9);box-shadow:0 0 18px rgba(34,211,238,.6);pointer-events:none;transition:transform .12s";
  d.id = "capture-cursor";
  const s = document.createElement("style");
  s.textContent = "html{scrollbar-width:none} ::-webkit-scrollbar{display:none} vite-error-overlay{display:none!important}";
  addEventListener("DOMContentLoaded", () => { document.body.appendChild(d); document.head.appendChild(s); });
  addEventListener("mousemove", (e) => { d.style.left = e.clientX + "px"; d.style.top = e.clientY + "px"; }, true);
  addEventListener("mousedown", () => (d.style.transform = "scale(.6)"), true);
  addEventListener("mouseup", () => (d.style.transform = "scale(1)"), true);
})();`;

// ---------------- helpers ----------------
const wait = (page, ms) => page.waitForTimeout(ms);
const mouse = new WeakMap();
// cursor positions during the clip, saved next to it (<name>.json) so the video's camera can follow the action
const tracks = new WeakMap();

async function moveTo(page, target, steps = 22) {
  let x, y;
  if (typeof target.x === "number") ({ x, y } = target);
  else {
    const box = await target.boundingBox();
    if (!box) return false;
    x = box.x + box.width / 2;
    y = box.y + box.height / 2;
  }
  await page.mouse.move(x, y, { steps });
  mouse.set(page, { x, y });
  const log = tracks.get(page);
  if (log?.t0) log.moves.push([+((Date.now() - log.t0) / 1000).toFixed(3), Math.round(x), Math.round(y)]);
  return true;
}

const btn = (page, name) => page.getByRole("button", { name }).first();

async function click(page, loc, pause = 220) {
  if (!(await loc.count())) throw new Error(`not found: ${loc}`);
  await loc.scrollIntoViewIfNeeded({ timeout: 2000 }).catch(() => {});
  await moveTo(page, loc);
  await wait(page, pause);
  await loc.click({ timeout: 3000 });
}

const hover = (page, loc) => moveTo(page, loc).catch(() => false);
// hover a point inside an element, as fractions of its box
async function hoverIn(page, loc, fx, fy) {
  const b = await loc.boundingBox();
  if (b) await moveTo(page, { x: b.x + b.width * fx, y: b.y + b.height * fy });
}
const showCursor = (page, on) => page.evaluate(([v]) => { const d = document.getElementById("capture-cursor"); if (d) d.style.display = v ? "" : "none"; }, [on]);

// smooth window scroll so the element's top sits `offset` px below the top of the window
async function scrollToEl(page, loc, offset = 120) {
  const box = await loc.boundingBox();
  if (!box) return;
  await page.evaluate(([dy]) => window.scrollTo({ top: window.scrollY + dy, behavior: "smooth" }), [box.y - offset]);
}
const scrollBy = (page, dy) => page.evaluate(([d]) => window.scrollBy({ top: d, behavior: "smooth" }), [dy]);

// run code against the game store (the same module instance the app uses, served by Vite)
const game = (page, body, arg) =>
  page.evaluate(async ({ body, arg }) => {
    const { useGame } = await import("/src/store/game.ts");
    return await new Function("useGame", "arg", `return (async () => { ${body} })()`)(useGame, arg);
  }, { body, arg });

// every launch from now on flies until the simulation returns a success (a demo needs the good take)
const PATCH_FLY = `
  const s = useGame.getState();
  if (s.__fly) return;
  const orig = s.fly;
  useGame.setState({ __fly: orig, fly: () => {
    for (let i = 0; i < 60; i++) { orig(); const r = useGame.getState().result; if (r && r.success && !r.lostAt) break; }
  } });`;

// The video names no company (Dayon, 2026-11-15): the council is four agencies, and the design is rebuilt for it.
const COUNCIL = { lead: "nasa", partners: ["jaxa", "esa", "isro"] };
const setCouncil = (page, step) =>
  game(page, `const s = useGame.getState(); s.setLead(arg.lead); s.setPartners(arg.partners); useGame.getState().startControl(); useGame.getState().setStep(arg.step);`, { ...COUNCIL, step });

// load the lazy flight and 3D modules so the liftoff is not lost behind a loading screen
const WARM_FLIGHT = (page) =>
  page.evaluate(async () => {
    await Promise.all([import("/src/screens/Flight.tsx"), import("/src/three/FlightScene3D.tsx")]);
  });

const waitCoach = (page, id, timeout = 15000) => page.locator(`[data-coach="${id}"]`).first().waitFor({ state: "visible", timeout });

// ---------------- shots ----------------
// route: path + query appended to APP; dur: seconds kept; prep: runs before the clip starts (not kept);
// steps: [ms after clip start, action]. Clip lengths cover the longest use in SpaceDAO180 (ClipShow spans).
const SHOTS = {
  intro: {
    route: "", dur: 9.5,
    prep: async (p) => { await p.locator("canvas").first().waitFor({ timeout: 15000 }); await wait(p, 1200); },
    steps: [
      [300, (p) => moveTo(p, { x: 1180, y: 520 }, 30)],
      [1500, (p) => click(p, btn(p, /^Begin mission$/))],
      [4300, (p) => click(p, btn(p, /^Next$/))],
      [6600, (p) => click(p, btn(p, /^Next$/))],
      [8700, (p) => hover(p, btn(p, /Let's go/))],
    ],
  },
  rocky: {
    route: `?mode=guided&screen=missions`, dur: 9.5,
    prep: async (p) => { await btn(p, /^Next$/).waitFor({ timeout: 15000 }); await wait(p, 600); },
    // the 30 s montage cuts in at 0.7 s ("Hi, I'm Rocky") and 5.3 s (the council screen, settled)
    steps: [
      [300, (p) => moveTo(p, { x: 900, y: 420 }, 25)],
      [2300, (p) => click(p, btn(p, /^Next$/))],
      [3900, (p) => click(p, btn(p, /^(Next|Done|Got it|Close)$/))],
      [4400, (p) => click(p, btn(p, /^Select Moon Base Zero$/))],
      [7600, (p) => click(p, btn(p, /^Next$/))],
    ],
  },
  missions: {
    route: `?mode=quick&screen=missions`, dur: 8.5,
    prep: async (p) => { await waitCoach(p, "missions.cards"); await wait(p, 900); },
    steps: [
      [100, (p) => hover(p, btn(p, /^Select Orbital Lab$/))],
      [1500, (p) => hover(p, btn(p, /^Select Earth Guardian$/))],
      [2900, (p) => hover(p, btn(p, /^Select Moon Base Zero$/))],
      [4300, (p) => hover(p, p.getByRole("link", { name: /LIVE/ }).first())],
      [6300, (p) => click(p, btn(p, /^Select Moon Base Zero$/))],
    ],
  },
  // agencies only: the council is NASA, JAXA, ESA, ISRO and the list is filtered to agencies (no company on screen)
  coalition: {
    route: `?mode=quick&screen=coalition&${MOON}`, dur: 8.5,
    prep: async (p) => {
      await waitCoach(p, "coalition.council");
      await game(p, `const s = useGame.getState(); s.setLead(arg.lead); s.setPartners(arg.partners);`, COUNCIL);
      await click(p, p.getByRole("tab", { name: /^Agencies$/ }).or(p.getByRole("button", { name: /^Agencies$/ })).first());
      await wait(p, 900);
    },
    steps: [
      [300, (p) => click(p, btn(p, /^ISRO:/))],
      [1500, (p) => click(p, btn(p, /^CSA:/))],
      [3000, (p) => hover(p, p.locator("[data-coach='coalition.council']"))],
      [4300, (p) => click(p, btn(p, /^CSA:/))],
      [5300, (p) => click(p, btn(p, /^ISRO:/))],
      [6800, (p) => hover(p, btn(p, /^Enter mission control/))],
    ],
  },
  design: {
    route: `?mode=quick&screen=control&${MOON}&step=build`, dur: 8,
    prep: async (p) => {
      await waitCoach(p, "control.body");
      await setCouncil(p, "build");
      await waitCoach(p, "control.gauges");
      await click(p, p.getByRole("tab", { name: /Power/ }).first());
      await wait(p, 900);
    },
    // take power away, watch the gauges and the warning react, then let the recommendation fix it
    steps: [
      [300, (p) => click(p, btn(p, /^Remove .*battery/i))],
      [2200, (p) => click(p, btn(p, /^Remove .*fuel cell/i))],
      [3600, (p) => hover(p, p.locator("[data-coach='control.issues']"))],
      [4700, (p) => click(p, btn(p, /^Use recommended$/))],
      [6300, (p) => hover(p, p.locator("[data-coach='control.gauges']"))],
    ],
  },
  // The NASA live panel opens with its header above the window at 900 px tall (2026-11-15), so the real-data
  // shots use the live lines on the mission cards: ISS position (SSCWeb), open hazards (EONET), Moon distance (JPL Horizons).
  nasalive: {
    route: `?mode=quick&screen=missions`, dur: 12.5,
    prep: async (p) => { await waitCoach(p, "missions.cards"); await wait(p, 1200); },
    steps: [
      [300, (p) => hover(p, p.getByText(/ISS now at/).first())],
      [2000, (p) => hover(p, p.getByRole("link", { name: /LIVE/ }).first())],
      [3800, (p) => hover(p, p.getByText(/open hazards on Earth/).first())],
      [5800, (p) => hover(p, p.getByText(/away today/).first())],
      [7800, (p) => hover(p, btn(p, /^Select Moon Base Zero$/))],
      [9600, (p) => hover(p, btn(p, /^Select Orbital Lab$/))],
      [11200, (p) => hover(p, p.getByText(/ISS now at/).first())],
    ],
  },
  data: {
    route: `?mode=quick&screen=missions`, dur: 5,
    prep: async (p) => { await waitCoach(p, "missions.cards"); await wait(p, 1200); },
    steps: [
      [100, (p) => hover(p, p.getByText(/ISS now at/).first())],
      [1300, (p) => hover(p, p.getByText(/open hazards on Earth/).first())],
      [2600, (p) => hover(p, p.getByText(/away today/).first())],
      [3900, (p) => hover(p, p.getByRole("link", { name: /LIVE/ }).first())],
    ],
  },
  // the list from the NASA designs down (the first row carries a company's fork)
  opentech: {
    route: `?mode=quick&screen=control&${MOON}&step=opentech`, dur: 5,
    prep: async (p) => {
      await waitCoach(p, "control.body");
      await setCouncil(p, "opentech");
      await p.getByText("DTN bundle stack").first().waitFor({ timeout: 15000 });
      await scrollToEl(p, p.getByText("DTN bundle stack").first(), 250);
      await wait(p, 1000);
    },
    steps: [
      [200, (p) => hover(p, p.getByText("DTN bundle stack").first())],
      [1300, (p) => hover(p, p.getByText("core Flight System software").first())],
      [2400, (p) => hover(p, p.getByText("DTN stack for small flight computers").first())],
      [3500, (p) => hover(p, p.getByText("High-efficiency triple-junction array").first())],
    ],
  },
  rideshare: {
    route: `?mode=quick&screen=control&${MOON}&step=rideshare`, dur: 5,
    prep: async (p) => {
      await waitCoach(p, "control.body");
      await setCouncil(p, "rideshare");
      await btn(p, /^Accept /).waitFor({ timeout: 15000 });
      await scrollToEl(p, p.getByText(/spare room/i).first(), 150);
      await wait(p, 900);
    },
    steps: [
      [200, (p) => hover(p, p.getByText(/spare room/i).first())],
      [1300, (p) => click(p, btn(p, /^Accept /))],
      [2700, (p) => click(p, btn(p, /^Accept /))],
      [3900, (p) => hover(p, p.getByText(/earned/i).first())],
    ],
  },
  review: {
    route: `?mode=quick&screen=control&${MOON}&step=council`, dur: 9,
    prep: async (p) => {
      await waitCoach(p, "control.body");
      await setCouncil(p, "council");
      await waitCoach(p, "council.vote");
      await scrollToEl(p, p.locator("[data-coach='council.risk']"), 150);
      await wait(p, 1200);
    },
    steps: [
      [200, (p) => hover(p, p.locator("[data-coach='council.risk']"))],
      [1300, (p) => scrollBy(p, 260)],
      [2000, (p) => hoverIn(p, p.locator("[data-coach='council.vote']"), 0.25, 0.35)],
      [3200, (p) => hoverIn(p, p.locator("[data-coach='council.vote']"), 0.75, 0.35)],
      [4300, (p) => scrollBy(p, 240)],
      [5300, (p) => hoverIn(p, p.locator("[data-coach='council.vote']"), 0.25, 0.8)],
      [6800, (p) => hoverIn(p, p.locator("[data-coach='council.vote']"), 0.75, 0.8)],
    ],
  },
  sign: {
    route: `?mode=quick&screen=control&${MOON}&step=council`, dur: 9,
    prep: async (p) => {
      await waitCoach(p, "control.body");
      await setCouncil(p, "council");
      await waitCoach(p, "council.sign");
      await scrollToEl(p, p.locator("[data-coach='council.sign']"), 160);
      await wait(p, 1200);
    },
    steps: [
      [300, (p) => click(p, btn(p, /^Sign with the council$/))],
      [6200, (p) => hover(p, btn(p, /^Launch$/))],
    ],
  },
  flight: {
    route: `?mode=quick&screen=control&${MOON}&step=council`, dur: 12,
    prep: async (p) => {
      await waitCoach(p, "council.sign");
      await setCouncil(p, "council");
      await waitCoach(p, "council.sign");
      await WARM_FLIGHT(p);
      await game(p, PATCH_FLY);
      await scrollToEl(p, p.locator("[data-coach='council.sign']"), 160);
      await wait(p, 600);
      await click(p, btn(p, /^Sign with the council$/));
      await btn(p, /^Launch$/).and(p.locator(":enabled")).waitFor({ timeout: 20000 });
      await moveTo(p, btn(p, /^Launch$/));
      await wait(p, 500);
      await btn(p, /^Launch$/).click();
      await showCursor(p, false);
      await waitCoach(p, "flight.main");
      await p.locator("[data-coach='flight.main'] canvas").first().waitFor({ timeout: 10000 });
    },
    lead: 0.1,
    focus: (p) => p.locator("[data-coach='flight.main'] canvas").first(),
    steps: [],
  },
  ops: {
    route: `?mode=quick&screen=control&${MOON}&step=council`, dur: 11,
    prep: async (p) => {
      await waitCoach(p, "council.sign");
      await setCouncil(p, "council");
      await waitCoach(p, "council.sign");
      await game(p, `${PATCH_FLY} useGame.getState().fly(); await useGame.getState().afterFlight();`);
      await waitCoach(p, "ops.actions");
      await p.locator("canvas").first().waitFor({ timeout: 15000 });
      await wait(p, 2500);
    },
    steps: [
      [300, (p) => click(p, btn(p, /^Deploy/))],
      [1500, (p) => hover(p, btn(p, /battery|fuel cell/i))],
      [2600, (p) => click(p, btn(p, /^Deploy/))],
      [3000, (p) => moveTo(p, { x: 640, y: 420 }, 25)],
      // a tile click on the 3D board has no stable screen position, so the deploy goes through the store
      [3500, (p) => game(p, `
        const { validTiles } = await import("/src/ops/index.ts");
        const { catalogWith } = await import("/src/store/game.ts");
        const s = useGame.getState();
        const ctx = { design: s.design, catalog: catalogWith(s.published) };
        const item = s.ops.inventory.find((i) => /battery|solar|fuel/i.test(i.moduleId + " " + i.kind)) ?? s.ops.inventory[0];
        const tiles = item ? validTiles(s.ops, { moduleId: item.moduleId }, ctx) : [];
        if (tiles.length) s.opsAct({ type: "deploy", moduleId: item.moduleId, tileId: tiles[0] });`)],
      [4600, (p) => click(p, btn(p, /^Next turn/))],
      // a turn can draw an event card (impact, storm...) that needs a choice before the next turn
      [7000, async (p) => {
        const card = p.locator("[data-coach='ops.event']");
        if (await card.count()) await click(p, card.getByRole("button").last());
      }],
      [8800, (p) => click(p, btn(p, /^Next turn/))],
    ],
  },
  debrief: {
    route: `?mode=quick&screen=control&${MOON}&step=council`, dur: 9,
    prep: async (p) => {
      await waitCoach(p, "council.sign");
      await setCouncil(p, "council");
      await waitCoach(p, "council.sign");
      await click(p, btn(p, /^Sign with the council$/));
      await btn(p, /^Launch$/).and(p.locator(":enabled")).waitFor({ timeout: 20000 });
      await game(p, `${PATCH_FLY} useGame.getState().fly(); useGame.getState().finishOps();`);
      await waitCoach(p, "debrief.grade");
      await p.evaluate(() => window.scrollTo(0, 0));
      await wait(p, 2200);
    },
    // the local dev server has no shared registry, so the "saved on this device" line under the actions stays out of frame
    steps: [
      [200, (p) => hover(p, p.locator("[data-coach='debrief.grade']"))],
      [900, (p) => scrollToEl(p, p.locator("[data-coach='debrief.publish']"), 560)],
      [1700, (p) => click(p, btn(p, /^Publish your design$/))],
      [2300, (p) => scrollToEl(p, p.locator("[data-coach='debrief.publish']"), 560)],
      [4200, (p) => hover(p, p.locator("[data-coach='debrief.publish'] svg").first())],
      [6300, (p) => scrollToEl(p, p.locator("[data-coach='debrief.lessons']"), 140)],
      [7200, (p) => hover(p, p.locator("[data-coach='debrief.lessons']"))],
    ],
  },
};

// ---------------- recorder ----------------
async function record(browser, name, shot) {
  const dir = path.join(TMP, name);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const ctx = await browser.newContext({
    viewport: VIEW,
    deviceScaleFactor: 1,
    recordVideo: { dir, size: VIEW, fps: FPS },
  });
  await ctx.addInitScript(CURSOR_JS);
  await ctx.route(`${REGISTRY}/**`, answerRegistry);
  const errors = [];
  const rec0 = Date.now();
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message.split("\n")[0]));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().split("\n")[0].slice(0, 160)); });
  let t0 = 0;
  const log = { t0: 0, moves: [], rect: null };
  tracks.set(page, log);
  try {
    await page.goto(APP + shot.route, { waitUntil: "load", timeout: 30_000 });
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    await moveTo(page, { x: VIEW.width * 0.62, y: VIEW.height * 0.55 }, 2);
    if (shot.prep) await shot.prep(page);
    if (shot.focus) log.rect = await shot.focus(page).boundingBox().catch(() => null);
    t0 = Date.now();
    const m = mouse.get(page) ?? { x: VIEW.width / 2, y: VIEW.height / 2 };
    log.t0 = t0;
    log.moves.push([0, Math.round(m.x), Math.round(m.y)]);
    for (const [at, fn] of shot.steps) {
      const now = Date.now() - t0;
      if (at > now) await wait(page, at - now);
      await fn(page).catch((e) => console.warn(`${name} @${at}ms: ${e.message.split("\n")[0]}`));
    }
    const left = shot.dur * 1000 - (Date.now() - t0);
    if (left > 0) await wait(page, left + 300);
  } finally {
    await page.close();
    await ctx.close();
  }
  if (!t0) throw new Error("prep failed");
  const webm = readdirSync(dir).find((f) => f.endsWith(".webm"));
  if (!webm) throw new Error("no video recorded");
  const raw = path.join(dir, "raw.webm");
  renameSync(path.join(dir, webm), raw);
  const out = path.join(OUT, `${name}.mp4`);
  const start = Math.max(0, (t0 - rec0) / 1000 - (shot.lead ?? 0));
  execFileSync("ffmpeg", ["-v", "error", "-y", "-ss", start.toFixed(3), "-i", raw, "-t", String(shot.dur), "-vf", `fps=${FPS},scale=${W}:${H}:flags=lanczos,format=yuv420p`, "-c:v", "libx264", "-crf", "14", "-preset", "slow", "-an", out]);
  const lead = shot.lead ?? 0;
  const rect = log.rect && ["x", "y", "width", "height"].map((k) => Math.round(log.rect[k]));
  writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify({ w: VIEW.width, h: VIEW.height, rect, moves: log.moves.map(([t, x, y]) => [+(t + lead).toFixed(3), x, y]) }));
  const uniq = [...new Set(errors)];
  console.log(`${name}: ok (${shot.dur}s from ${start.toFixed(2)}s) -> ${path.relative(process.cwd(), out)}${uniq.length ? `\n  page errors: ${uniq.slice(0, 4).join(" | ")}` : ""}`);
}

// first visits make Vite compile every module; do them once, unrecorded, so recorded loads are fast
async function warm(browser, names) {
  const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const routes = [...new Set(names.map((n) => SHOTS[n].route))];
  for (const r of routes) await page.goto(APP + r, { waitUntil: "networkidle", timeout: 60_000 }).catch(() => {});
  await page.goto(APP + `?mode=quick&screen=control&${MOON}&step=council`, { waitUntil: "networkidle", timeout: 60_000 }).catch(() => {});
  await WARM_FLIGHT(page).catch(() => {});
  await game(page, `useGame.getState().fly(); await useGame.getState().afterFlight();`).catch(() => {});
  await wait(page, 3000);
  await ctx.close();
}

const names = (wanted.length ? wanted : Object.keys(SHOTS)).filter((n) => {
  if (!SHOTS[n]) console.warn(`unknown shot: ${n}`);
  return !!SHOTS[n];
});
const browser = await chromium.launch({ channel: "chromium", headless: true, args: ["--ignore-gpu-blocklist"] });
const failed = [];
try {
  await warm(browser, names);
  for (const name of names) {
    try {
      await record(browser, name, SHOTS[name]);
    } catch (e) {
      failed.push(name);
      console.error(`${name}: FAILED ${e.message.split("\n")[0]}`);
    }
  }
} finally {
  await browser.close();
}
if (failed.length) {
  console.log(`failed: ${failed.join(", ")}`);
  process.exitCode = 1;
}
