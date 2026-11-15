# Sunday sprint (2026-11-15): shared rules, direction and contracts

Everyone reads this file fully, then their own file: `CHARLIE.md`, `ERIC.md` or `DAYON.md` (same folder).
For today it **overrides the ownership table in `AGENTS.md`**. Manuel has left the project; his areas (`src/crypto/`, `SignPanel.tsx`, comms) move to Charlie.

## Why this sprint

Dayon's playtest this morning: the game is too technical and not playable enough.
- People don't grasp what SpaceDAO is or why it is revolutionary.
- Step titles are tiny and hidden.
- Selecting something gives no visible feedback.
- Glass panels are unreadable.
- Actors show meaningless letter monograms.
- Operations has no animation and no explanation, and you lose without knowing why.
- The decision market feels like gambling.
- The opening story makes unsourced claims.
- There is no sound.

Goal: turn SpaceDAO into a **game** that is fun, visual and intuitive. A child should be able to play it, and an astrophysicist should be able to click through to the sources. It has to tell the vision: a planetary space organization that links agencies, companies and people, and shares tech, data and spare capacity.

## Timeline (local time, America/Sao_Paulo)

| Time | Milestone |
|---|---|
| 14:30 | Contract PRs merged (Charlie C0, Dayon D0) |
| 16:30 | **Merge round 1** + 10-minute playtest on the big screen |
| 19:00 | **Merge round 2** + screen capture for the videos |
| 20:30 | **Code freeze**: fixes only |
| 20:30-21:30 | Bug bash: all 3 missions, Guided and Quick, 1440 px and 390 px, clean console |
| 21:30 | Final deploy, checked in a private window |
| 22:30 | **Submit** |

## Official rules that shape the work (Space Apps 2026 Judging & Submission guides)

- **Project Demo**: a video of **30 s max** or **7 slides max**. English everywhere. If the video is spoken in another language, it needs English subtitles.
- **Submission checkbox**: original work, every external resource (code, text, images, sounds, fonts, flags, textures) listed in References, **no copyrighted material without permission**. That means **no agency or company logos, ever**. Actors are shown as an **SVG flag + their name**. The NASA insignia needs written permission.
- No Chinese agencies, companies, vehicles or services (team rule plus NASA's China restriction).
- **Relevance**: NASA data must be the core and must be *visible* in the game, not decoration.
- **Challenge 13 requirements** (these are acceptance criteria today):
  - Resources visible at all times (mass, power, budget, data, comms, time).
  - Every decision has a consequence.
  - Plain language.
  - The player can redesign and simulate again.
  - The player understands **why** they failed.
  - Up to 4 people can play (stretch).
- Resources the challenge names, to cite in info cards and on the landing page: GMAT, Concept Maturity Levels, Mission Design Lab, CubeSat 101, NASA Mission Viz.
- **AI-generated media**: avoid it.
  - Draw art in code (SVG / three.js).
  - Music and sound effects come from **Envato Elements** (licensed, Dayon downloads them) and go in References.
  - Anything AI-generated that remains carries a visible "AI-generated" label and goes in the "Use of AI" field.
- No "coming soon" promises: the Mars card is removed.

## Fact rule

A factual claim needs a source behind its info button. A vision statement must read as a proposal, never as a fact. Opening story copy, verified:
1. "Space is already a team sport: 5 agencies from 15 nations run one station, and more than 70 nations signed the Artemis Accords." (Sources: [NASA ISS cooperation](https://www.nasa.gov/international-space-station/space-station-international-cooperation/), [ESA ISS legal framework](https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/International_Space_Station/International_Space_Station_legal_framework), [NASA Artemis Accords](https://www.nasa.gov/artemis-accords/).)
2. "But every partnership is negotiated one treaty at a time. Designs stay behind export rules, data sits in separate archives, and most of the world watches from outside."
3. "SpaceDAO is a shared mission table: agencies, companies and people plan, fund and fly missions together on one open network."
4. "Partners review every decision and sign it together, and the science comes back open to everyone."
5. "Real tech runs under the hood. Tap any idea to see it work."

The old line "Every nation builds alone. Rockets fly half empty." is false or unsourced. Never use it again.

## Product direction (read twice)

1. **Game first, study second.**
   - Images, icons, animation, color and big numbers guide the player; assume people read 20% of the text.
   - One line of text per card.
   - Depth sits behind the info button, which now opens a readable centered card.
2. **Two modes**, chosen right after "Begin mission":
   - **Guided by Rocky**: full tutorial.
   - **Quick play**: every step comes pre-filled with the recommended choice and a big "Looks good → Next" button, so a judge finishes in about 3 minutes.
   - The tutorial can be turned back on from the TopBar.
3. **Rocky**, the mascot: a small friendly rocket with arms and legs, drawn as SVG in code and animated (poses: wave, point, think, cheer, worried). Rocky appears in speech bubbles anchored to elements marked with `data-coach="<screen>.<thing>"`. **Everyone adds `data-coach` anchors to the key elements on their screens.**
4. **Palette**: lilac plus **cyan** accent. Cyan means selected, active, or happening now.
5. **Real frosted glass**: dark tinted background (~72% opacity) with blur and a thin light border. Text contrast is always WCAG AA.
6. **No emoji and no unicode glyphs** (☀ ◐ ⚡ or flag emoji). Use SVG icons from `Icon.tsx` and SVG flags.
7. **Every action has a visible reaction**:
   - selecting an item plays a cyan pop with a check;
   - a turn advancing is animated;
   - events happen in the 3D scene;
   - numbers tick up and down;
   - sound plays through `sfx(name)`.
8. **Governance grounded in reality**:
   - The futarchy decision market is removed.
   - In its place: a Mission Charter, plus a **Go / No-Go readiness review** modeled on NASA flight readiness reviews and the launch Go/No-Go poll.
   - Partners trade through ISS-style barter.
   - The Monte Carlo forecast becomes the "Risk assessment" (probabilistic risk assessment).
   - 4-of-4 post-quantum signatures stay. They unlock only when everyone is GO.
9. **The SpaceDAO network is a "second brain"**: agencies, companies, technologies and missions form one web. Adopting open tech pulls a node from the web. Publishing your mission gives a node back, with an animation.
10. **Journey indicator** always visible: Mission → Team → Design → Review & Sign → Launch → Operate → Debrief.

## Real mission objectives (replace toy goals such as "Survive the Lunar Night")

- **Moon Base Zero**, lunar south pole, Shackleton connecting ridge. The objectives follow the public lunar-settlement milestones of our partner community, which is not named outside `VITE_EDITION=moondao`:
  - precision touchdown on the ridge;
  - **Water Ice**: prospect ice in a permanently shadowed region;
  - **Night Shift**: keep the base working through the lunar night, and explain why that is hard;
  - **First Tracks**: deploy and drive a rover;
  - **Lunar comms & navigation**: a relay or surface mesh for areas with no Earth view (NASA LunaNet concept);
  - **Landing pad**: sinter regolith to stop plume dust;
  - **Oxygen from regolith** demo;
  - **Grow food**: a plant chamber (real reference: the LEAF experiment selected for Artemis).
- **Orbital Lab** (ISS): protein crystal growth for drug research, plant growth (Veggie-like), tissue chips, Earth observation, materials science.
- **Earth Guardian**: wildfire detection (FIRMS / EONET), flood mapping with SAR, crop health for smallholder farms in the Global South, with downlink to local ground stations.

Each objective gets one line on what it is, one line on why it matters, and a primary source.

## File ownership today

| Lane | Files |
|---|---|
| **Dayon + Claude** | `src/styles/`, `src/components/` (ui, hud, brand, learn, new `tutorial/`, new `audio/`), `src/store/`, `src/screens/{Intro,Story,Coalition,Debrief,Leaderboard,RankingSubmit}.tsx`, `src/screens/control/{MissionControl,ValuesStep,ObjectivesStep,LaunchStep}.tsx`, `src/screens/ops/OpsScreen.tsx`, `src/scene/HeroScene.tsx`, `src/scene/bodies.tsx`, landing page, `video/`, `docs/`, `README.md`, `public/audio/` |
| **Charlie** | `src/engine/`, `src/ops/` (engine and scenarios), `src/data/`, `src/lib/`, `src/chain/`, `src/crypto/`, `worker/`, `src/screens/control/{CouncilStep,ReviewFeed,SignPanel,OpenTechStep,LineageTree,RideshareStep}.tsx`, removal of `MarketPanel` / `market.*` |
| **Eric** | `src/three/` (incl. new `src/three/missions/`, `src/three/spacecraft/`), `src/scene/ops/`, `src/screens/{MissionSelect,Flight,FlightScene,FlightSceneSvg,FlightHud,FlightTelemetry,flightTimeline}.*`, `src/components/MissionArt.tsx`, `src/screens/control/{BuildStep,SpacecraftStack,useDesign}.tsx` |

Shared, additions only: `src/engine/types.ts`, `src/ops/types.ts`, `src/components/ui/Icon.tsx`. Adding a `data-coach` attribute in anyone's file is always allowed.

## Contracts between lanes (fixed: change only by agreement in the team chat)

```ts
// src/ops/types.ts (Charlie, task C0)
export interface OpsTurnReport {
  turn: number; fromDay: number; toDay: number;
  delta: { energyWh: number; waterKg: number; dataStoredGb: number; dataReturnedGb: number; sciencePoints: number };
  effects: OpsEffect[];      // in order; Eric's 3D scene and Dayon's UI animate these
  warnings: OpsWarning[];    // forward-looking
}
export type OpsEffect =
  | { kind: "daylight"; sunFactor: number; earthUp: boolean }
  | { kind: "storm"; severity: 1 | 2 | 3; shieldedIds: string[]; hitIds: string[]; liveSource?: Source }
  | { kind: "impact"; tileId: string; hitIds: string[]; damage: number }
  | { kind: "power-out"; structureIds: string[] }
  | { kind: "downlink"; gb: number; fromId: string }
  | { kind: "science"; points: number; fromIds: string[] }
  | { kind: "goal-done"; goalId: string }
  | { kind: "discovery"; tileId: string; goalId: string };
export interface OpsWarning { id: string; severity: "info" | "warn" | "danger"; text: string; fix?: string; turnsLeft?: number }
// OpsState gains `lastReport?: OpsTurnReport`; pure helper `projectTurn(state, ctx): OpsTurnReport` (preview, no RNG events)

// src/engine/council.ts (Charlie, C0)
export interface ReadinessVote {
  actorId: string; verdict: "go" | "no-go" | "go-with-condition";
  check: "mass" | "power" | "comms" | "budget" | "reliability" | "objectives" | "values";
  reason: string; numbers: string; source?: Source;
  fix?: { label: string; patch: DesignPatch; goTo?: DesignStep };
  concession?: { label: string; cost: string; patch: DesignPatch };
}

// src/engine/recommend.ts (Charlie, C0 stubs that return today's defaultDesign)
export function recommendStep(step: DesignStep, design: MissionDesign, catalog: Catalog): DesignPatch;
export function autoDesign(missionId: MissionId, coalition: Coalition, catalog: Catalog): MissionDesign;
// DesignStep = "charter" | "objectives" | "launch" | "build" | "opentech" | "rideshare"

// Eric (E2):  <Spacecraft3D design highlightModuleId? payloads?: RideshareOffer[] spareMassKg? compact? />
// Eric (E5):  <NetworkPulse highlight? />
// Dayon (D0): MonogramBadge keeps its API but renders SVG flag + name; <Flag code/>; <StepHeader/>; <ActionBar/>; <RecommendedButton/>
// Dayon (D1): data-coach="<screen>.<thing>" anchors; useTutorial()
// Dayon (D5): sfx(name) from "@/components/audio" (a no-op until D5 lands; safe to call now)
```

## Definition of done (every PR)

- `git fetch && git rebase origin/main`, then `npm run check` and `npm run build` both green.
- Every screen you changed opened with Playwright at **1440x900 and 390x844**: no console errors, no horizontal scroll.
- Every rule you change in the engine comes with a test.
- No emoji. No logos. English only. Every new real-world number has a source.
- One small PR per task, one teammate reviews, merge before the next merge round.

## Success metric

Someone outside the team plays Moon Base Zero in Quick play in under 4 minutes and can explain in one sentence what SpaceDAO is.
