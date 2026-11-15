# Eric: 3D, scenes and motion (Sunday sprint)

Read `AGENTS.md` and `docs/sprint/SUNDAY.md` first. Your files are listed in SUNDAY.md, section "File ownership today". Today you also own `MissionSelect.tsx`, `MissionArt.tsx`, `BuildStep.tsx`, `SpacecraftStack.tsx` and `useDesign.tsx`.

**Performance budget**
- 60 fps on an ordinary laptop.
- **One `<Canvas>` per screen.** Use drei `View` when several cards need 3D.
- Pause scenes that are off-screen or hidden.
- SVG fallback when WebGL is unavailable (`ErrorBoundary`).
- Respect `prefers-reduced-motion`.
- Reuse the NASA textures in `public/textures` (credits in `CREDITS.md`).
- Draw everything in code. No AI-generated art, no logos.

One branch and one PR per task: `eric/<task-id>-<topic>`.

## E1 (P0): Mission Select with live 3D scenes
Files: `MissionSelect.tsx`, `MissionArt.tsx`, new `src/three/missions/`.
- **Remove the Mars "Coming soon" card.**
- 3 large cards that fill the viewport: 3 columns on desktop, stacked on phones.
- Scenes:
  - **Orbital Lab**: a station model orbiting above Earth's limb (Blue Marble texture, city lights on the night side).
  - **Earth Guardian**: a satellite on a sun-synchronous orbit with a visible scan swath; wildfire hotspots blink, taken from the live EONET events the app already loads.
  - **Moon Base Zero**: lunar south-pole terrain (LROC / LDEM textures) with a lander, and Earth low on the horizon.
- **Hover / focus**: the camera dollies in, the animation speeds up, and the card lifts with a cyan border. Keyboard focus does the same.
- Each card shows the essentials without a click:
  - name;
  - one line;
  - "You will:" with 3 items and icons;
  - difficulty, duration and rocket class;
  - the existing live NASA chip (for example, "36 open hazards on Earth").
- Depth stays behind the info button.
- Add `data-coach="missions.card"`.

## E2 (P0): 3D spacecraft assembly (Build step)
Files: `BuildStep.tsx`, `SpacecraftStack.tsx`, new `src/three/spacecraft/Spacecraft3D.tsx`.
- The spacecraft assembles in 3D as modules are added:
  - bus core;
  - solar arrays that **unfold** when power is added;
  - an antenna that turns toward Earth;
  - instruments that snap in with a cyan flash;
  - landing legs for the Moon;
  - a habitat or rack for the ISS.
- **Spare capacity** shows as a translucent cyan volume, proportional to the spare mass. This is the visual hook for rideshare.
- Accepted rideshare payloads (prop `payloads`, wired by Charlie in C6) dock into that volume.
- Export `<Spacecraft3D design highlightModuleId? payloads? spareMassKg? compact? />` so it can be reused in Rideshare, Debrief and the landing page.
- Redesign the module cards:
  - an icon and what the module does, in one line;
  - mass, power and cost as icon chips;
  - filter tabs by function: Power, Comms, Science, Life, Structure;
  - a clear selected state (cyan, check).
- Add a "Use recommended" button: `recommendStep("build", …)` from `@/engine`, which Charlie lands in C0/C3.
- Add `data-coach="build.ship"` and `data-coach="build.modules"`.

## E3 (P0): Operations comes alive in the scene
Files: `src/scene/ops/HexBoard.tsx`, `models.tsx`.

Consume `ops.lastReport.effects` (contract in SUNDAY.md) and play them **in order**:
- **Turn change**: a light/shadow sweep across the board and a day counter.
- **Power**: powered structures glow; unpowered ones dim.
- **Downlink**: data packets fly from the antenna up to Earth.
- **Solar storm**: particles, plus a visible shield dome over the protected structures; hit structures flash red.
- **Micrometeorite**: a streak of light, impact, dust, and the hit structure's health bar drops.
- **Discovery / goal done**: a beacon on the tile.

Always visible:
- a health bar above each structure;
- the regolith shield radius drawn on the tiles;
- a ghost preview of the structure before placing it on a glowing tile;
- the Sun and Earth in the scene sky (Earth below the horizon means no link).

Until Charlie's C4 lands, build against a fixture report.

## E4 (P1): launch and flight
Files: `Flight*`, `src/three/FlightScene3D.tsx`.
- Stage separation, plume, the trajectory drawn to orbit or to the Moon, then a landing with dust or a docking.
- Cinematic camera.
- Under 25 s, with **Skip** and **x4**.
- The HUD shows the real data in use: Moon distance from JPL Horizons, the DSN dish tracking (`/api/live/dsn`), the live storm if there is one.

This is the hero shot of the demo video. Make it beautiful.

## E5 (P2): network pulse
Make `src/three/NetworkGlobe.tsx` usable as `<NetworkPulse highlight? />`: the SpaceDAO web of agencies, companies and technologies, with a new node joining. Dayon's Debrief uses it for "Publish to the Open Tech Registry".

## Done means
See SUNDAY.md, section "Definition of done". Post a short screen recording of E1 and E2 in the team chat before merge round 1 (16:30).
