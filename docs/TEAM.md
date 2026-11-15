# Team plan

> **Sunday 2026-11-15:** the current plan is in `docs/sprint/` (SUNDAY.md + one file per person). Timeline today: merge rounds 16:30 and 19:00, code freeze 20:30, submit 22:30. Project Demo = video of 30 s max or 7 slides max (2026 guide). Manuel has left; Charlie owns crypto and comms.

Deadline: **Sunday 2026-11-15, 23:59 local (America/Sao_Paulo). Submit by 22:30** to keep a buffer. Submission is final.

## People and areas

| Person | GitHub | Strength | Owns |
|---|---|---|---|
| Dayon | `xdayon` | Vision, UX, psychology of the player journey, front-end design | Experience end to end, design system, Intro / Story / Mission Select / Coalition / Debrief screens, copy, demo video, submission text |
| Charlie | `Carlos-Sotop` | Deep technical, crypto | Engine (balance + rules), council bots, futarchy market, Solana devnet anchor, deploy pipeline |
| Manuel | `Galmanus` | Post-quantum cryptography, protocols | Comms model (link coverage, blackouts, light delay, relay/mesh/DTN), Moon comms step, hybrid ed25519 + ML-DSA signatures, ML-KEM link demo, quantum-safe explainer |
| Eric | `Eric-lsg` | Creative, web3 systems | Flight visualization (3D launch, transfer, landing/docking), Open Tech Registry (DeSci) and rideshare market screens, Supabase (registry + leaderboard), bot and event writing |

Folder ownership is in `AGENTS.md`. Each person's AI should read `AGENTS.md`, this file, and the doc for their area.

## State of the base (Saturday ~16:00)

What works end to end, tested in the browser at 1440 px and 390 px with a clean console: intro with the network globe, story, mission select, coalition builder (32 actors, 15 launch vehicles), Mission Control with the six live gauges and 7 steps, council review, decision market, real hybrid signatures, flight playback with telemetry and live NASA events, debrief with lessons. 66 tests pass (`npm run check`). Live NASA routes answer through the Worker (`/api/live/context`, `space-weather`, `earth-events`, `moon`, `iss`, `dsn`, `apod`).

Known gaps, by owner (start here):
- **Dayon:** actor card taglines truncate (shorten them in `src/data/actors.ts` or allow two lines); intro globe is cropped at the top; HUD warning chips truncate; screen transitions show an empty frame for ~1 s; HUD is tall on phones.
- **Charlie:** the decision market's alternative only drops the priciest optional module, so a minimal design shows one option (generate an *upgrade* alternative too); bot messages are templates (use `persona`); `defaultDesign` takes ~0.7 s for Earth Guardian (memoize per coalition or move off the main thread); balance pass (Moon default ~52% success, Orbital Lab may be too easy); Falcon Heavy capacities mix reusable and expendable configs.
- **Manuel:** comms gameplay per mission is not built yet (engine has `linkFractionBonus`, blackout events and DTN/relay/mesh/PQ modules in data); `/api/live/dsn` exists but no UI uses it; the light-delay from `LiveContext.moonDistanceKm` is not shown yet.
- **Eric:** `src/screens/FlightScene.tsx` is a 2D SVG arc (upgrade to 3D); telemetry shows zeros during transfer; Open Tech and Rideshare steps are functional but plain; Supabase not started.
- **Everyone:** most data sources are Wikipedia or search snippets and many numbers are marked `// estimate`. Verify your area against primary sources on Sunday and flip `verified`.

## Saturday night: branch `dayon/next-level` (Dayon + Claude)

New, all inside new folders so nothing collides with your work; review and merge by PR:
- **Operations phase for all 3 missions** (`src/ops/` pure engine + tests, `src/screens/ops/`, `src/scene/ops/`): after arrival the player runs the site turn by turn with quests, research and live NASA events. Flight's end button now says "Take command on site" (one-line change in `Flight.tsx`, Eric).
- **3D look experiment** (`src/scene/`): intro hero with NASA Blue Marble Earth, city lights, LRO Moon, live ISS and bloom (`@react-three/postprocessing`). Eric: compare with your flight scene; we keep the best of both.
- **Global ranking** (`src/leaderboard/`, `worker/scores.ts`, `supabase/migrations/0001_leaderboard.sql`, `src/screens/Leaderboard.tsx`): the Worker replays flight + operations before saving to Supabase. Needs `SUPABASE_URL` and `SUPABASE_SECRET_KEY` (Worker secrets) and the SQL run once.
- **Web3 primers** (`src/components/learn/`): DAO, weighted vote, decision market, fingerprint, 4-of-4 signature, post-quantum, open science, rideshare; two live demos.
- **NASA rules:** logo now drawn in code (no AI image on the home page); Moon Base Zero names no commercial client unless built with `VITE_EDITION=moondao`. Demo video must follow the 2026 guide (check the length limit before recording).

## Backlog by priority

P0 = must ship for the demo. P1 = makes it win. P2 = only if P0/P1 are done.

### Dayon
- P0 Coalition screen: actor cards, filters, coverage strip, 3 recommended coalitions per mission.
- P0 Mission Select + Intro polish (globe, one-liner, Begin); Debrief layout (grade, breakdown, lessons, signatures).
- P0 Copy pass on every screen (one line per card, plain words, numbers with units).
- P1 First-run coach marks (max 3 hints: gauges, info button, council). Destination art per mission (SVG).
- P1 390 px pass; reduced-motion pass.
- P2 Demo video (≤ 2 min, English subtitles), submission text, README final, slides if needed.

### Charlie
- P0 Own `src/engine/`: read `src/engine/README.md`, tune balance so each mission has at least 3 good designs and obvious bad ones fail for a clear reason. Add tests for every rule you change.
- P0 Council review messages (concrete numbers + fix) and the decision market (alternative design generation, bot stakes, adopt the higher forecast, settle after flight).
- P1 `/api/chain/anchor` Worker route: Solana devnet Memo transaction with the manifest hash + signature digest, relayer key from `SOLANA_RELAYER_SECRET`; debrief shows the explorer link. Fail soft.
- P1 Cloudflare Workers Builds connected to the GitHub repo (main → production, branches → previews). Add `NASA_API_KEY` secret.
- P2 LMSR market maker; reputation for accurate forecasters.

### Manuel
- P0 Comms model in the engine (pair with Charlie on hooks): link coverage per destination, south-pole Earth blackouts, relay satellite / surface mesh / DTN node effects, real light delay from `LiveContext.moonDistanceKm`.
- P0 Comms step for Moon Base Zero: geometry visual (Earth, Moon, relay), link timeline (up/down over the mission), live DSN dishes panel from `/api/live/dsn`.
- P0 Own `src/crypto/`: review the hybrid signatures, keep tests green, make signing feel instant (pre-generate keys while the player builds).
- P1 Quantum-safe explainer drawer (why hybrid, NIST FIPS 203/204, harvest-now-decrypt-later) and an ML-KEM handshake visual for the Earth–Moon link.
- P1 "Harvest now, decrypt later" event: without the post-quantum link, the secure-link objective fails with a clear lesson.

### Eric
- P0 Flight screen: 3D scene (Earth or Moon, rocket launch with plume, transfer arc, docking or landing), synced to the simulation timeline; skippable, x4 speed, reduced-motion fallback.
- P0 Open Tech Registry: lineage tree, adopt toggle, author credit. Rideshare market: spare mass/power big numbers, offer cards, fits/doesn't fit.
- P1 Supabase: `blueprints` (published designs) and `missions` (leaderboard) tables with RLS (anonymous insert with checks, public read); publish from Debrief; leaderboard on Debrief.
- P2 Bot personas and event texts pass; sound design (free-licensed, mute toggle).

### Everyone, Sunday afternoon
- Verify the numbers in your data files against sources and flip `verified: true`.
- Play all three missions as a judge would. Log bugs as GitHub issues with a screenshot.

## Timeline (local time)

| When | What |
|---|---|
| Sat 17:00 | Base on `main`. Everyone pulls, creates their branch, runs `npm run dev`. |
| Sat 17:00-20:00 | Block 1: P0 work. |
| Sat 20:00 | Merge round 1 + 15-minute group playtest. |
| Sat 20:00-01:00 | Block 2: P0 finish, P1 start. |
| Sun 01:00 | Merge round 2, production deploy. Sleep in shifts. |
| Sun 09:00 | Merge round 3. |
| Sun 16:00 | **Feature freeze.** Only fixes, polish, data verification. |
| Sun 16:00-20:00 | Bug bash, judge-style playtests, performance check. |
| Sun 20:00-22:00 | Demo video, submission text, README. |
| Sun 22:30 | **Submit.** |

## Git flow (short version; full rules in `AGENTS.md`)

```
git checkout main && git pull
git checkout -b <name>/<topic>
# work, commit small
git fetch && git rebase origin/main
npm run check && npm run build
git push -u origin <name>/<topic>
gh pr create --fill        # one teammate reviews, merge when CI is green
```

No forks: everyone has write access, forks only add friction. Merge often; a PR older than 3 hours is a risk.

## Submission checklist

- [ ] Live demo URL (Cloudflare) works in a private window, no console errors.
- [ ] Project demo (video with English subtitles, or English slides), per the 2026 Project Submission Guide.
- [ ] Title, summary, challenge chosen (Space Mission Design Game), NASA data used, Space Agency Partner data used, tools, use of AI.
- [ ] README: how to run, NASA data and resources, libraries and licenses, use of AI.
- [ ] No logos, no real money, English only.
- [ ] Every team member confirmed at the Florianópolis local event.
