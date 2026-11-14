# SpaceDAO: rules for every AI assistant on this team

Four people build this at NASA Space Apps 2026 (Founder House, Florianópolis), each with their own AI (Claude, Gemini, Codex, Cursor...). This file keeps all of them coherent. Read it fully before your first change, then read the doc for your area in `docs/`.

**Deadline: submission closes Sunday 2026-11-15, 23:59 local time (America/Sao_Paulo). Submission is final.**

## What we are building (30 seconds)

SpaceDAO is a web game for the challenge [Space Mission Design Game](https://www.spaceappschallenge.org/2026/challenges/space-mission-design-game/). The player represents a space agency or company, forms a 4-member council with 3 bot partners, and designs a real mission: objectives, launch vehicle, orbit, spacecraft modules, budget, power, mass, data, comms, lifetime. The council governs it like a DAO: a values vote, a futarchy decision market, open-tech sharing (DeSci), a spare-capacity rideshare market, and a 4-of-4 quantum-safe signature before launch. Then the flight is simulated with live NASA data and the debrief explains why it succeeded or failed.

Three missions: **Orbital Lab** (ISS, easy), **Earth Guardian** (Earth observation for the Global South, medium), **Moon Base Zero** (lunar south pole, hard; the NASA build names no commercial client, `VITE_EDITION=moondao` builds the partner edition). Single player first. The judge is the main user: it must be clear, fast and beautiful within 5 minutes.

Read next: `docs/VISION.md` (why), `docs/GAME_DESIGN.md` (what the player does), `docs/ARCHITECTURE.md` (how), `docs/DESIGN_SYSTEM.md` (look), `docs/GOVERNANCE.md` (web3 mechanics), `docs/DATA_SOURCES.md` (NASA APIs and sourcing), `docs/TEAM.md` (who owns what, timeline, git flow).

## Ownership: work only in your folders

| Area | Files and folders | Owner (GitHub) |
|---|---|---|
| Experience, design system, screen flow, intro/story/missions/coalition/debrief, values/objectives/launch/build steps, pitch | `src/screens/{Intro,Story,MissionSelect,Coalition,Debrief}.tsx`, `src/screens/control/{MissionControl,ValuesStep,ObjectivesStep,LaunchStep,BuildStep,SpacecraftStack,useDesign}.tsx`, `src/components/`, `src/styles/`, `src/store/`, `public/` | Dayon (`xdayon`) |
| Engine, council bots, futarchy market, Solana anchor relayer, deploy | `src/engine/` (README there explains the model), `src/screens/control/{CouncilStep,ReviewFeed,MarketPanel,market}.*`, new `src/chain/`, new Worker routes `/api/chain/*` | Charlie (`Carlos-Sotop`) |
| Comms model, post-quantum crypto, Moon comms gameplay | `src/crypto/`, `src/screens/control/SignPanel.tsx`, new `src/comms/`, new `src/screens/control/CommsStep.tsx` | Manuel (`Galmanus`) |
| Flight visualization (3D), Open Tech Registry, rideshare market, Supabase | `src/three/`, `src/screens/{Flight,FlightScene,FlightTelemetry,flightTimeline}.*`, `src/screens/control/{OpenTechStep,LineageTree,RideshareStep}.tsx`, new `supabase/` | Eric (`Eric-lsg`) |
| Shared contract | `src/engine/types.ts` | everyone, by agreement |
| Catalog data | `src/data/` | everyone; each entry needs sources |
| Live NASA data | `worker/`, `src/live/`, `scripts/make-snapshots.ts` | Charlie (routes); anyone adds a route via PR |

Adding a step to Mission Control (e.g. Manuel's comms step) touches `src/store/steps.ts` and `MissionControl.tsx`: coordinate with Dayon.

If your change needs another owner's folder, ask them or open a PR and tag them. `src/engine/types.ts` changes need a PR with `[types]` in the title and a heads-up in the team chat.

## Git workflow

- `main` is always deployable. Never push broken code to `main`.
- Work on a short-lived branch per person: `dayon/<topic>`, `charlie/<topic>`, `manuel/<topic>`, `eric/<topic>`. Merge to `main` through a PR at least every 2-3 hours. Small PRs merge fast; big ones rot.
- Before opening a PR: `git fetch && git rebase origin/main`, then `npm run check` (lint + types + tests) and `npm run build` must pass.
- One reviewer: anyone else on the team. Self-merge is OK if CI is green and the change stays inside your folders.
- Never force-push `main`. Never commit `.env*`, `.dev.vars` or any key.

## Rules from NASA Space Apps (break one and the project can't be judged or embarrasses us)

- No NASA insignia ("meatball"), logotype ("worm"), mission patches, or any space agency or company logo. Actors are shown with a monogram badge and a flag emoji. Do not imply NASA or any agency endorses SpaceDAO.
- At least one NASA dataset or API must be used and credited. Every API and dataset goes in `docs/DATA_SOURCES.md` and the README.
- Every real-world number in `src/data/` has a source (title + URL). `verified` stays `false` until a human checked it.
- AI-generated images or video carry a visible "AI-generated" watermark. AI-written code is disclosed in the README "Use of AI" section.
- Play credits only, test networks only. No real money, no token sale, no investment language.
- English everywhere in the product: UI, docs, code, commits.
- Every library, font, image or sound must be free to use; note its license in the README.
- No personal data. No names or faces of minors.
- Team rule: no Chinese agencies, companies, vehicles or services anywhere (data, libraries, vendors).

## Product rules

- Visual first, text last. A card shows at most one line. Depth goes behind the info button (drawer). If you are writing a paragraph in the UI, stop.
- Every decision has a visible consequence on the six gauges (mass, power, budget, data, comms, lifetime). Explain *why*, not just "wrong".
- The game must work with no network and no keys: live NASA data falls back to bundled snapshots; the chain anchor is optional.
- Accessible to a curious teenager, credible to a NASA engineer. Plain words on the surface, real numbers and sources one click below.

## Code rules

- TypeScript strict. Import engine functions only from `@/engine`, types from `@/engine/types`.
- `src/engine/` is pure: no React, no fetch, no `Math.random` (use `makeRng(seed)`). Same inputs and seed give the same result. Tests live next to the code.
- Units in data and engine: kg, W, Wh, $M, Gb, days. Convert only for display, via `src/lib/format.ts`.
- Server-only secrets (`NASA_API_KEY`, `FIRMS_MAP_KEY`, `SOLANA_RELAYER_SECRET`, `SUPABASE_SECRET_KEY`) live in `.dev.vars` locally and as Cloudflare secrets in production. Only `VITE_*` values reach the browser.
- Run it: `npm install`, `cp .dev.vars.example .dev.vars`, `npm run dev`. Check: `npm run check`. Deploy: `npm run deploy` (Charlie or Dayon only).
