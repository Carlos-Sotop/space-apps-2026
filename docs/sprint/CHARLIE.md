# Charlie: game logic and governance (Sunday sprint)

Read `AGENTS.md` and `docs/sprint/SUNDAY.md` first. Your files are listed in SUNDAY.md, section "File ownership today". You also inherit Manuel's areas: `src/crypto/`, `SignPanel.tsx` and the comms model.

Work in this order. One branch and one PR per task: `charlie/<task-id>-<topic>`. Every engine rule you add or change gets a test.

## C0 (P0, merge by 14:30): contracts
- Add the types in SUNDAY.md, section "Contracts", exactly as written: `OpsTurnReport`, `OpsEffect`, `OpsWarning`, `ReadinessVote`, `DesignStep`, `DesignPatch`.
- Add `src/engine/recommend.ts` with `recommendStep` and `autoDesign` stubs that return today's `defaultDesign` (or an empty patch). Export them from `@/engine`.
- No behaviour change yet. Merge fast: Eric and Dayon code against these types.

## C1 (P0): remove the decision market
- Delete `src/screens/control/MarketPanel.tsx`, `market.ts` and `market.test.ts`, the market fields in the store and the engine, and the "Decision market settled" section of the Debrief. Removing that one block in `Debrief.tsx` is allowed for this task.
- In `src/components/learn/concepts.ts`, replace the "decision market" concept with "Go / No-Go review". The demo can be a simple GO/NO-GO poll.
- Keep the Monte Carlo forecast and rename it everywhere to **"Risk assessment"** (probabilistic risk assessment, as NASA uses).
- Update `docs/GOVERNANCE.md`: futarchy is out; Charter + Go/No-Go + barter + risk assessment are in.

## C2 (P0): Go / No-Go readiness review
Files: `src/engine/council.ts`, `CouncilStep.tsx`, `ReviewFeed.tsx`, `SignPanel.tsx`.

How it maps to reality:
- NASA lifecycle reviews (PDR, CDR, Flight Readiness Review) check margins.
- At the launch countdown, the flight director polls every console "Go/No-Go", and a single NO-GO holds the launch.
- ISS partners trade by barter.

Engine:
- Each of the 4 partners runs one check with real numbers: mass, power, comms, budget, reliability, objectives or values. The check uses its priorities and a source (for example, mass margin practice at concept stage is ~20-30%; cite the NASA Systems Engineering Handbook).
- It returns a `ReadinessVote`:
  - a verdict, a one-line reason, and the numbers;
  - `fix`: a patch, plus the step to jump to;
  - optional `concession`: a barter such as a payload slot, crew time or open data first, with a visible cost on the gauges.
- Votes are **deterministic**. When a vote changes, explain the diff: "JAXA: NO-GO → GO, mass margin rose from 4% to 18%".
- A truly bad design (for example, no long-duration battery on the Moon) gets a NO-GO and cannot launch.
- **Unanimous GO** unlocks the 4-of-4 hybrid signature.

UI:
- 4 partner cards, each with its flag and name (use `MonogramBadge`, which now renders flag + name), a big GO (green) or NO-GO (red) stamp, the reason, and the buttons "Fix it" and "Negotiate".
- A "Risk assessment: 78% success" bar.
- Add `data-coach="council.vote"` and `data-coach="council.sign"`.

## C3 (P0): recommend API (powers Quick play and the "Use recommended" buttons)
- `recommendStep(step, design, catalog)` for charter, objectives, launch, build, opentech and rideshare.
- `autoDesign(missionId, coalition, catalog)` builds a full design.
- Tests: for all 3 missions, the recommended design gets a **unanimous GO** and a **≥ 70% risk-assessment success**.
- Memoize `defaultDesign`, which takes ~0.7 s for Earth Guardian today.
- Also check that `recommendedCoalitions` in `src/lib/coalition.ts` makes sense for each mission.

## C4 (P0): Operations engine that is clear and winnable (`src/ops/`)
- Every `advance` stores `lastReport: OpsTurnReport`: deltas, ordered `effects`, and `warnings`. Events must say exactly which tiles and structures they hit and which the shield protected.
- Add a pure `projectTurn(state, ctx)` preview with no RNG events. It lets the UI show income per turn, such as "+12 science, −3 kWh".
- **Warnings ahead of time**: "Battery empty in 2 turns: night is coming. Fix: build a solar array on a ridge tile or switch off the drill." Test that every possible loss is preceded by at least one `danger` warning.
- `lostReason` becomes a readable cause chain.
- Balance:
  - With the recommended design and the main quest followed, all 3 missions are winnable. Losing should require ignoring warnings.
  - Science points have a clear origin: which structures produce them, and how many per turn.
  - Action-point costs are exposed for every action.
  - Scout is available whenever a rover exists.
- Keep live NASA inputs (DONKI storms, DSN load, EONET). Every effect that comes from a real record carries `liveSource`.

## C5 (P1): real mission objectives
- Rewrite the objectives in `src/data/missions.ts` and the Operations goals in `src/ops/scenarios/*` to follow SUNDAY.md, section "Real mission objectives".
- Each objective gets one plain-English line, a "why it matters" line, and a primary source.
- Adjust scoring and add tests.
- Name no commercial partner outside `VITE_EDITION=moondao`.

## C6 (P1): open tech and rideshare with real trade-offs
Files: `OpenTechStep.tsx`, `LineageTree.tsx`, `RideshareStep.tsx`.

Open tech:
- Header in one line: "Free designs shared by other agencies. Adopt one, credit its author, share yours back."
- Adopting has a cost: integration mass or power, a compatibility check with your bus and mission, and **reciprocity**. You must publish your own design at the Debrief, so set a flag Dayon's Debrief reads.
- Show provenance: "Shared by ESA · used in 3 missions".

Rideshare:
- Header in one line: "Your rocket has spare room. Rent it to other teams' experiments and earn budget."
- Accepting a payload adds **+$M budget** (the budget gauge animates), uses mass and power, and appears inside Eric's `<Spacecraft3D payloads=…/>`.
- Show a hint: "You earned $40M: spend it in Build".

Both: real offers only, or clearly labeled examples, with sources. Add `data-coach` anchors.

## C7 (P1): data
- Add Brazilian companies as actors, with sources:
  - **Bizu Space** (São José dos Campos, founded 2023; liquid-propellant rocket engines, FTL-Perseu flight, BizuPOD satellite deployer, subcontractor in the Brazilian Microlauncher project). Sources: [newspacetracker](https://newspacetracker.com/company/bizu-space/), [3DPrint/EOS](https://3dprint.com/335815/eos-brings-additive-manufacturing-expertise-to-brazils-bizu-space/), https://bizu.space/en.
  - **Visiona Tecnologia Espacial** (Embraer + Telebras joint venture).
  - Consider BizuPOD as a CubeSat deployer module.
- Launch vehicles: add spec fields (payload to LEO and TLI, height, stages, flights and successes, owner) so the Launch step can show a spec card.
- Check numbers against primary sources and flip `verified`.

## C8 (P1): production
- All `/api/live/*` routes say "live" in production.
- The leaderboard and the shared design registry work in production: "Saved on this device" must appear only when offline.
- `/api/chain/anchor` returns a devnet explorer link.

## C9 (P2): team play on one screen
In the Go/No-Go review, 1-4 real players can each take a partner seat by passing the device around. This answers the challenge's "team of up to four".

## Done means
See SUNDAY.md, section "Definition of done". Also tell Dayon in the chat when C0, C3 and C4 are merged: his UI depends on them.
