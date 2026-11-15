# Dayon + Claude: experience, onboarding, submission (Sunday sprint)

Read `AGENTS.md` and `docs/sprint/SUNDAY.md` first. Claude coordinates the work. Implementation runs in separate worktrees, each with its own files, and Claude reviews every diff. Dayon checks the result in the browser and owns the videos.

## D0 (P0, merge by 14:30): visual foundation (others build on it)
- Tokens:
  - real frosted glass (dark tint ~72%, blur 20 px, thin light border, inner highlight);
  - a cyan accent and a cyan selection ring;
  - AA contrast.
- `InfoDrawerHost` becomes a **centered, readable info card**. The `InfoButton` / `useInfo` API does not change.
- `MonogramBadge` renders an **SVG flag + name** with no letters and the same API, so the whole app switches at once. Flags come from `flag-icons` (MIT) and go in References.
- New icons in `Icon.tsx`: sun, earth, storm, shield, meteor, battery, antenna, science, water, data, rover, build, rocket, warning, check, sound, mute.
- Purge every emoji and unicode glyph, including the ones in `OpsScreen` and the actor flags.
- New components: `StepHeader` (large "Step 1 of 2 · Title" plus one subtitle line), `ActionBar` (sticky continue bar near the content), `RecommendedButton`.
- Issue chips become a warnings panel that shows the full text.
- Rename "Ranking" to "Leaderboard" everywhere.
- `sfx(name)` stub in `src/components/audio/`.

## D1 (P0): onboarding
- A 3-frame intro before play, skippable: what SpaceDAO is / what you will do / how you play.
- Story rewritten with the verified copy (SUNDAY.md, "Fact rule"), with a source in each panel's info card.
- After "Begin mission", a modal: **Guided by Rocky** / **Quick play**.
- `Rocky.tsx`: an original SVG mascot (rounded lilac rocket, porthole face with cyan eyes, small arms and legs, fins, a flame puff), animated with motion. Poses: wave, point, think, cheer, worried.
- `CoachMark` host: Rocky's speech bubble anchored to `data-coach` elements, with a tips script for every screen and step, Next/Skip, and a "Tutorial" toggle in the TopBar.
- Quick play applies `autoDesign` / `recommendStep` (Charlie, C3).

## D2 (P0): journey clarity
- A global journey indicator (Mission → Team → Design → Review & Sign → Launch → Operate → Debrief).
- Coalition:
  - "Step 1 of 2 · Who do you represent?" and "Step 2 of 2 · Choose 3 partners for your mission";
  - a cyan selection pop with a check;
  - a sticky ActionBar with the chosen actor and Continue;
  - the "Your council" panel shown from step 1;
  - recommended coalitions per mission.
- Mission Control: a large header per step, a sticky Next button, and the warnings panel.
- Launch:
  - "Where will your mission go?" with a visual of the site or orbit;
  - "Pick a rocket" with the owner's flag and name and a spec card (Charlie, C7 data).
- Charter (formerly Values) and Objectives: the new real objectives (C5) and "Use recommended".

## D3 (P0): Operations UI (`OpsScreen.tsx`)
- A top resource bar with icons and **change per turn**, from `projectTurn`.
- A "Next objective" banner over the map.
- A bottom action bar in RTS style: icon cards for Deploy, Build, Research and Scout, each showing its action-point cost.
- An animated turn summary: "Day 6 → 9: +12 science, storm hit Antenna −20%".
- Warnings that have a "Fix" button.
- A loss screen that explains the cause chain, with "Try again" and "Redesign".
- Events in a readable card with a "REAL EVENT · NASA DONKI" badge when the event comes from a real record.

## D4 (P0): Debrief
- Order: report → lessons → signatures → publish → leaderboard at the bottom.
- One labeled grade system: Flight, Operations, Overall.
- Publish to the Open Tech Registry with the network animation (Eric E5, or a 2D fallback): "Your design joined the SpaceDAO network", plus the Solana devnet receipt.

## D5 (P1): sound
- Professional music and SFX that **Dayon picks from Envato Elements**: ambient loop, UI hover/click/select/confirm, warning, launch, turn, storm, impact, success.
- Files go in `public/audio/`, compressed (ogg/mp3, ≤ 2 MB total for SFX).
- `sfx(name)` and a music player, with a mute toggle saved in localStorage. Audio starts on the first user gesture.
- List every file in References.

## D6 (P1): hero
- Connections rise from real places to space:
  - launch sites: Kennedy, Vandenberg, Kourou, Sriharikota, Tanegashima, Naro, Alcântara, Mahia, Andøya;
  - DSN complexes: Goldstone, Madrid, Canberra.
- The arcs reach the LEO ring, the live ISS and the Moon, and data flows back from the Moon to the DSN.

## D7 (P0): NASA data you can see
- A "NASA live" chip in the TopBar opens a card listing each source (DONKI, EONET, Horizons, SSCWeb ISS, DSN Now, APOD) with its live or snapshot status and time.
- A "REAL EVENT" badge on every event that comes from live data.

## D8: submission
- Landing page at `/`, with the game at `/play`. Sections:
  - the problem (sourced);
  - how to play;
  - the ideas in plain words;
  - the NASA data used;
  - how each Challenge 13 requirement is met;
  - stack;
  - team;
  - References;
  - Use of AI;
  - a big PLAY button.
- Demo video: 30 s (the official demo), plus a 3-minute walkthrough on the landing page. Both have English subtitles. Capture with Playwright at 1920x1080.
- Text for every submission field.
