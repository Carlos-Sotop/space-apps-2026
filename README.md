# SpaceDAO

**Space is too big for any one nation.**

SpaceDAO is a mission design game for the NASA Space Apps Challenge 2026 challenge [Space Mission Design Game](https://www.spaceappschallenge.org/2026/challenges/space-mission-design-game/). You represent a space agency or company, form a council with three partners, and design a real mission: objectives, launch vehicle, orbit, spacecraft, budget, power, mass, data, communications and lifetime. The council governs it like a DAO (a values vote, a futarchy decision market, open-tech sharing and a 4-of-4 quantum-safe signature), then the flight is simulated with live NASA data and the debrief explains why it succeeded or failed.

Three missions: **Orbital Lab** (ISS, easy), **Earth Guardian** (Earth observation for wildfires and floods, medium) and **Moon Base Zero** (lunar south pole, hard).

Team Founder House, Florianópolis, Brazil: Dayon (`xdayon`), Charlie (`Carlos-Sotop`), Manuel (`Galmanus`), Eric (`Eric-lsg`).

Demo: _URL added at deploy_.

## Run it

Node 22 or newer.

```
npm install
cp .dev.vars.example .dev.vars     # optional: NASA_API_KEY etc. Works without keys.
npm run dev                        # app + Cloudflare Worker on http://localhost:5173
```

If `npm run dev` fails on `workerd` or `esbuild`, run `npm rebuild workerd esbuild` once (recent npm versions block dependency install scripts).

| Command | What |
|---|---|
| `npm run check` | lint + typecheck + tests |
| `npm run build` | production build |
| `npm run deploy` | build and deploy to Cloudflare Workers |

Dev jumps: `?screen=control&mission=moon-base-zero&step=build` (screens: intro, story, missions, coalition, control, flight, debrief).

## How it is built

React 19 + TypeScript + Vite single-page app, served with a small API by one Cloudflare Worker. The mission engine (`src/engine`) is pure and deterministic and has its own tests. Live NASA data comes through `/api/live/*` with caching and bundled snapshots, so the game works offline. Council signatures are real ed25519 + ML-DSA-65 (NIST FIPS 204) signatures made in the browser. Details: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

Docs for the team (and their AI assistants): [`AGENTS.md`](AGENTS.md), [`docs/`](docs/).

## NASA data and resources

Live, at play time (see [`docs/DATA_SOURCES.md`](docs/DATA_SOURCES.md)):
- **NASA DONKI** (CCMC): coronal mass ejections and geomagnetic storms of the last 30 days trigger space-weather events in the flight.
- **NASA EONET v3**: open natural events (wildfires, storms, volcanoes) are Earth Guardian's targets.
- **JPL Horizons**: today's Earth–Moon distance and light delay.
- **NASA SSCWeb**: the ISS's current position.
- **NASA DSN Now**: live Deep Space Network dish activity.
- **NASA APOD**: astronomy picture of the day.

Reference data with per-entry sources in `src/data/` (NASA, ESA, JAXA, ISRO and other agency pages, NASA CLPS, LRO LOLA studies of the lunar south pole, ISS researcher guides, NISAR/VIIRS/Landsat mission pages, launch provider guides). Each entry carries `sources` and a `verified` flag.

Space Agency Partner data: ESA, JAXA, ISRO, CSA, ASI, AEB, KASA, MBRSC, CONAE, NASRDA, AEP, ASES, AEE, TUA, UK Space Agency, GGPEN and NSSA public pages (cited per entry).

No NASA or agency logos, insignia or mission patches are used. SpaceDAO is not endorsed by NASA or any agency.

## Libraries and licenses

React, React DOM (MIT) · Vite (MIT) · TypeScript (Apache-2.0) · Tailwind CSS (MIT) · zustand (MIT) · motion (MIT) · three.js, @react-three/fiber, @react-three/drei (MIT) · @noble/curves, @noble/hashes, @noble/post-quantum (MIT) · Cloudflare Workers SDK / wrangler, @cloudflare/vite-plugin (MIT OR Apache-2.0) · flag-icons (MIT) · Vitest (MIT) · ESLint (MIT) · Fonts via Fontsource: Michroma, Inter, JetBrains Mono (SIL Open Font License 1.1).

## Audio credits

- Music: "Adrift Among Infinite Stars" by Scott Buckley, www.scottbuckley.com.au, licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Trimmed and re-encoded.
- Music in the demo videos: "Artemis" by Scott Buckley, scottbuckley.com.au, licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
- Interface and sci-fi sound effects: Kenney "Interface Sounds", "Sci-fi Sounds" and "Digital Audio" packs (kenney.nl), CC0.
- Launch sound: NASA Space Launch System engine test audio (nasa.gov), public domain. NASA does not endorse this project.

## Use of AI

The team used AI assistants (Anthropic's Claude) to research sourced data, write and review code, and draft documentation. Every AI-assisted change was reviewed by a team member; commits made with Claude carry a `Co-Authored-By` line. Any AI-generated image or video in the project carries a visible "AI-generated" watermark. The SpaceDAO logo was generated with ChatGPT (OpenAI) from the team's concept; the logo files carry an "AI-generated" watermark. The narration in the demo videos was generated with ElevenLabs.

## License

Apache 2.0. See [LICENSE](LICENSE).
