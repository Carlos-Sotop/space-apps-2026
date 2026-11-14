# Game design

## Player and session

- **Main player: a NASA judge** on a laptop, 5-10 minutes, no tutorial patience, maybe an expert. Second: a student or curious adult.
- **Single player.** The player is one council member; the other three are bots with real-world priorities. Multiplayer is roadmap.
- **One mission takes 5-8 minutes.** All three missions are unlocked from the start (judges pick what interests them).
- **Emotional arc:** wonder (intro) → identity (choose who you represent) → agency (build) → tension (council review, vetoes, the market) → climax (signatures, launch) → release (success or a meaningful failure) → insight (debrief: why).

## Journey and screens

```
Intro ─► (Story) ─► Mission Select ─► Coalition ─► Mission Control ─► Flight ─► Debrief
                                                     │ values         ▲           │
                                                     │ objectives     └ Redesign ◄┘
                                                     │ launch & orbit
                                                     │ build
                                                     │ open tech (DeSci)
                                                     │ spare capacity (rideshare)
                                                     └ council review ► market ► sign
```

1. **Intro.** Network globe (nodes = real agency headquarters, arcs between them), logo, one line: *"Space is too big for any one nation."* `Begin mission` / `What is SpaceDAO?`
2. **Story (optional, 3 panels, skippable).** Everyone builds alone → SpaceDAO links agencies and companies → decisions are signed, science is open.
3. **Mission Select.** Three cards: Orbital Lab (●○○), Earth Guardian (●●○), Moon Base Zero (●●●; "Commissioned by MoonDAO" only in the partner edition). A locked "Mars Outpost · Season 2" card teases the roadmap.
4. **Coalition.** "Who do you represent?" then "Choose 3 partners". Cards: monogram + flag, tagline, capability pips, perk chip. A coverage strip shows how well the four cover launch, spacecraft, science, comms and funding, and the pooled treasury. Three recommended coalitions per mission for one-click picks (and to teach synergy).
5. **Mission Control.** Top HUD with the six gauges, always visible. Left step rail:
   - **Values vote** ("vote on values"): sliders for Science / Safety / Cost. Each bot shows its preference and vote weight (its treasury share). The agreed weights become the scoring weights.
   - **Objectives:** fixed primary objective, pick up to two secondaries.
   - **Launch & orbit:** destination cards (trade-off in one line, small meters for sunlight, Earth link, science) and launch vehicles (capacity to that orbit, price, reliability). Vehicles that can't fit are disabled with the reason.
   - **Build:** module catalog by category, each card with mass, power, cost and its heritage (the real hardware it is based on). The spacecraft assembles visually. Issues appear as chips under the HUD with the fix.
   - **Open Tech Registry (DeSci):** adopt open blueprints published by other members (e.g. "KASA fork of ESA's solar array, −12% mass"). A lineage tree shows forks. Adopting credits the author and raises collaboration.
   - **Spare capacity market:** the leftover mass and power show big; smaller agencies offer payloads that pay into the treasury and add science. A knapsack puzzle: fit the best offers.
   - **Council review:** each bot posts approve / concern / veto in a chat feed, with numbers and a fix. Then the **decision market** ("bet on beliefs"): the bots forecast the score of the current design vs an alternative, stake play credits, the player stakes too, and the council adopts the option with the higher market forecast. Finally **Sign & launch**: four signature slots fill as each member signs (real ed25519 + ML-DSA-65), with a "Quantum-safe" badge.
6. **Flight.** 20-30 s animated timeline: phase strip, trajectory visualization (launch plume, transfer, docking or landing), telemetry mini-charts (power, battery, data queued/returned, link up/down), event feed. Events triggered by live NASA data are badged "LIVE · NASA DONKI" with a link to the real record. Skip and x4 speed.
7. **Debrief.** Grade (S/A/B/C/F), score breakdown, objectives met, **"Why it went this way"** lessons, council signatures and manifest hash, actions: publish design to the registry, fly again (new seed), redesign, new mission.

## Core rules

- **Six resources** (challenge list): mass, power, budget, data, comms, lifetime. Each gauge shows used vs available, turns amber under 10% margin ("real missions keep margins") and red when over. Hover shows what uses and provides it.
- **Every choice has a consequence.** Instruments add science but cost mass, power, money and data; data needs downlink; downlink needs link coverage; power needs sunlight or storage; storage costs mass.
- **No single right answer.** Several coalitions, vehicles and module sets reach a good score.
- **Coalition perks are real capabilities.** Examples: NASA's Deep Space Network boosts downlink; JAXA's pinpoint landing (SLIM) raises landing reliability; ISRO's frugal engineering cuts module cost; Brazil's equatorial Alcântara site raises launch capacity; Spain hosts the Madrid Deep Space complex. Details in `src/data/actors.ts`.
- **Bots own domains** from their strongest capabilities and veto blockers in their domain. A bot with high safety priority vetoes any resource over the limit.
- **Futarchy, simplified:** the market's forecast comes from a Monte Carlo of the real engine (200 flights). Bots stake according to noisy forecasts; the player can beat them. After the flight, accurate stakes earn reputation.
- **Live data:** a real coronal mass ejection or geomagnetic storm from the last 30 days triggers the space-weather event (radiation, drag). Earth Guardian images real open EONET events (wildfires, storms, volcanoes) for bonus science.

## Scoring

Sub-scores 0-100: **science** (returned science vs the design's maximum), **safety** (resource margins + reliability), **efficiency** (treasury left + rideshare revenue), **collaboration** (partners' capabilities used, rideshares flown, open tech adopted).
`total = 10 × (w_science × science + w_safety × safety + w_cost × efficiency) × (success ? 1 : 0.25) + 2 × collaboration`, where the weights come from the values vote. Grades: S ≥ 950, A ≥ 800, B ≥ 600, C ≥ 400, else F. The exact model is documented in `src/engine/README.md`.

## Missions

| | Orbital Lab | Earth Guardian | Moon Base Zero |
|---|---|---|---|
| Difficulty | Easy | Medium | Hard |
| Destination | ISS, ~420 km, 51.6° | Sun-synchronous orbit options, or low-inclination from Alcântara | Lunar south pole: Shackleton connecting ridge, de Gerlache rim, Malapert massif |
| Carrier | Cargo Dragon, Cygnus, HTV-X, Dream Chaser | Small or medium satellite bus | Blue Ghost, Nova-C, Griffin, Blue Moon Mk1 |
| Core trade-off | Up-mass and station power/data allocation | SAR and imagers produce huge data: downlink, laser comms, edge processing | Power through darkness, Earth link at the pole, landing risk |
| Linked 2026 challenges | Flame in Freefall, Astronaut Health Monitoring | Dancing with the SARs, MODIS/VIIRS Hot Spots, Field Shift, Earth Trend Detective | Lunar Landing Site Navigator, Moon Base Analogs, Abandoned but not Forgotten |
| Live NASA data | DONKI (space weather), SSCWeb (ISS position) | EONET events, DONKI storms (drag) | DONKI CMEs, JPL Horizons (Earth–Moon distance, light delay) |
| Web3 hook | Rideshare cubesats for small agencies | Open data for the Global South | Coalition lunar base; quantum-safe link; surface mesh for local transactions during Earth blackout |

### Moon Base Zero comms (Manuel's area)

The south pole sees Earth low on the horizon or not at all, and a lunar night lasts ~14 Earth days. The comms step lets the player combine: direct-to-Earth X-band (cheap, often blocked), a lunar relay satellite (coverage, cost), a surface mesh network (base-to-base and local transactions keep working when Earth is out of view), a delay-tolerant networking node (store-and-forward, no data loss in blackouts), and a post-quantum secure link (ML-KEM key exchange, ML-DSA signatures). Blackouts are simulated; the real Earth–Moon light delay comes from JPL Horizons.

## Tone and copy

- Short, active, concrete: "Fly", "Sign", "Adopt", "Too heavy for Falcon 9 by 120 kg".
- Never shame a failure: explain it and invite a redesign.
- Facts live in the info drawer with sources.
