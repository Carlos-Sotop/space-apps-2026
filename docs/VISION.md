# Vision

## The problem

Space exploration is still organized nation by nation. Agencies build similar hardware in parallel, rockets often fly with unused capacity, and smaller space nations (Angola, Senegal, Paraguay, Nigeria, Bahrain) have scientists and ideas but rarely a seat on a mission. Knowledge is shared slowly, through papers and bilateral agreements. And for students, mission design is abstract: they rarely get to feel how one choice ripples through mass, power, budget, data and risk.

## The idea

**SpaceDAO is a decentralized coordination layer for space missions.** Agencies and private companies form a council, pool resources, decide together, sell spare launch capacity to whoever needs it, and publish every new technology as an open, forkable blueprint. Decisions and records are signed and anchored so anyone can verify them.

The full SpaceDAO is years of work. For Space Apps we ship the **game**: a playable MVP that lets anyone, from a curious teenager to a NASA engineer, *experience* that future in five minutes while learning real mission design trade-offs.

> Space is too big for any one nation.

## Why a game about governance is a mission design game

The challenge asks for a game where players design, manage and simulate a complete mission, make engineering trade-offs, manage limited resources, and collaborate in teams of up to four. SpaceDAO meets every one of those points, and adds the layer real missions actually struggle with: **who decides, who pays, and who gets to fly**.

| Challenge asks | SpaceDAO answer |
|---|---|
| Define objective and requirements | Mission brief, primary + secondary objectives, council values vote |
| Design spacecraft, pick instruments | Module builder with real heritage hardware |
| Launch vehicle and orbit | Real vehicles, real capacities, destinations with real physical factors |
| Budget, mass, power, data, comms, lifetime | Six live gauges with breakdowns and margins |
| Team of up to 4 with roles | 4-member council: you + 3 agency/company bots, each owning a domain |
| Negotiate competing priorities | Bots review, raise concerns, veto with reasons; futarchy market settles disputes |
| Simulation and evaluation | Flight simulation with live NASA space-weather and Earth-event data |
| Explain why it succeeded or failed | Debrief with plain-language lessons and score breakdown |
| Random events, difficulty levels, scenarios | Three missions, easy to hard; events with real-world precedents |
| Save, share, compare designs | Publish your design to the Open Tech Registry |

## What makes it different

1. **First web3 winner, done right.** Not a token, not a wallet popup: governance mechanics that make mission design better (futarchy, multisig, open science), with real cryptography and an optional testnet anchor.
2. **Real data, live.** NASA DONKI space weather and EONET Earth events feed the simulation the day you play. JPL Horizons gives the real Earth–Moon distance for comms delay.
3. **Inclusion as a mechanic.** Spare capacity lets small space nations fly their payloads and fund the mission. Collaboration is literally part of the score.
4. **Quantum-safe by design.** Council signatures are hybrid classical + post-quantum (NIST FIPS 204 ML-DSA). The Moon mission's comms make the threat model concrete.
5. **Moon Base Zero.** Our hardest mission builds the first module of a lunar south-pole base run by an international coalition. NASA refuses entries that promote commercial products, so the NASA build names no client; the partner edition (`VITE_EDITION=moondao`) shows it as commissioned by MoonDAO for that track.

## Awards we aim at

Primary: **Galactic Impact** (potential to improve life on Earth and in space: faster, cheaper, shared exploration; Earth Guardian serves wildfire and flood response) and **Global Connection** (connects people across the world through technology: 18 agencies and 14 companies in one council).
Also strong fits: **Best Mission Concept** (plausible concept and design), **Best Use of Technology** (post-quantum signatures, futarchy, live data), **Best Use of Data** (live NASA feeds driving gameplay).

We do not tailor the product to one award; we make the story hit Galactic Impact and Global Connection clearly in the demo and the submission text.

## Roadmap after Space Apps (for the pitch, not for this weekend)

Multiplayer councils (up to 4 humans), on-chain council multisig (e.g. Squads on Solana), MetaDAO-style futarchy markets with play credits, IP-NFT style blueprints with royalties as reputation, a Mars mission (Season 2), and pilots with real agency teams for rideshare matchmaking.
