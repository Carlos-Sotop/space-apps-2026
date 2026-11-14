# Architecture

## Shape

One Cloudflare Worker serves the built single-page app and a small `/api/*`. All game logic runs in the browser. Supabase stores shared things (published blueprints, leaderboard). A testnet anchor is optional.

```
Browser (React SPA)
  screens ─► store (zustand) ─► engine (pure TS) ◄─ data (catalog with sources)
     │                            ▲
     │                            └── LiveContext (NASA data)
     ├─► /api/live/*  ──► Worker ──► NASA DONKI · EONET · JPL Horizons · SSCWeb · DSN Now · APOD
     │                     (Cache API + bundled snapshots when an upstream fails)
     ├─► /api/chain/anchor (optional) ──► Worker relayer ──► Solana devnet (Memo program)
     └─► Supabase (publishable key + RLS): blueprints, missions leaderboard
```

## Stack

| Layer | Choice | Why |
|---|---|---|
| Build | Vite 8, TypeScript (strict) | Fast dev loop for 4 people, no SSR complexity for a client-side game |
| UI | React 19, Tailwind CSS 4 with CSS-variable tokens | Familiar to every AI assistant, quick glass/neon styling |
| Motion | `motion` (ex framer-motion) | Screen transitions, gauges, card selection |
| 3D | three.js via `@react-three/fiber` + `drei`, lazy-loaded | Network globe, launch and flight scenes |
| State | `zustand` (persisted) | One store for the game, no boilerplate |
| Crypto | `@noble/curves` (ed25519), `@noble/post-quantum` (ML-DSA-65, ML-KEM), `@noble/hashes` | Audited, pure JS, MIT, run in the browser |
| Hosting | Cloudflare Workers with static assets (`@cloudflare/vite-plugin`, `wrangler`) | One deploy for app + API, global edge, free tier |
| Database | Supabase (Postgres + RLS) | Already created by the team; shared registry and leaderboard |
| Chain (optional) | Solana devnet, Memo program, relayer in the Worker | No contract to write; judges need no wallet |
| Tests | Vitest | Engine and crypto unit tests |

## Folders

```
src/
  engine/       pure mission engine: resources, validation, council, simulation, scoring, forecast (+ tests)
  data/         catalog: actors, launchVehicles, modules, missions, blueprints, rideshare (+ snapshots/)
  store/        zustand game store (game.ts) and the Mission Control step list (steps.ts)
  screens/      Intro, Story, MissionSelect, Coalition, control/* steps (incl. market.ts), Flight, Debrief
  components/   ui/ (design system primitives), hud/ (gauges, step rail, coalition bar)
  three/        3D scenes (globe; flight to come)
  live/         client for /api/live/* with snapshot fallback
  crypto/       manifest hashing, hybrid ed25519 + ML-DSA-65 council signatures
  lib/          formatting, catalog lookups, modifier labels
  comms/        (to create, Manuel) link model, blackout windows, Moon comms helpers
  chain/        (to create, Charlie) client for the optional anchor
worker/         Cloudflare Worker: /api/live/* (normalize.ts = pure parsers); /api/chain/* to come
scripts/        make-snapshots.ts refreshes the bundled NASA snapshots
supabase/       (to create, Eric) SQL migrations
docs/           this documentation
```

## Data flow in one turn

1. A screen changes `design` in the store (e.g. toggles a module).
2. Components call `computeResources(design, catalog)` and `validateDesign(...)` (both pure and fast) and render gauges and issue chips.
3. Council step calls `councilReview` and `forecast` (Monte Carlo, ~200 flights).
4. Signing hashes the canonical design and produces 4 hybrid signatures.
5. Flight calls `simulateFlight(design, catalog, seed, live)` once and animates the returned events and telemetry.
6. Debrief reads `FlightResult.score` and `lessons`.

The engine never fetches. Live data is fetched once per session into `LiveContext` and passed in.

## Environment and secrets

| Name | Where | Browser? |
|---|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | `.env.local`, Cloudflare build vars | Yes (safe: protected by RLS) |
| `NASA_API_KEY`, `FIRMS_MAP_KEY` | `.dev.vars`, `wrangler secret put` | No |
| `SOLANA_RELAYER_SECRET` (devnet keypair, base58) | `.dev.vars`, `wrangler secret put` | No |
| `SUPABASE_SECRET_KEY` | only if a Worker route needs it; `wrangler secret put` | No, never |

Never paste secret keys into chat with an AI, issues or commits. The Supabase publishable key is designed to be public; the secret key is not.

## Deploy

- Local: `npm run dev` (Vite + Worker together, http://localhost:5173).
- Production: `npm run deploy` or, better, connect the GitHub repo in the Cloudflare dashboard (Workers Builds) so `main` deploys automatically and each branch gets a preview URL. The repo owner (Charlie) sets this up once.
- Demo URL goes in the submission and README.

## Performance budget

First screen interactive in < 2 s on a laptop; 3D scenes lazy-load after the first paint; total JS for the first screen < 400 KB gzip; `forecast(200)` < 300 ms.
