# SpaceDAO: Space Apps 2026 submission text

Paste-ready text for the NASA Space Apps 2026 project page, one section per form field. Sources: `src/landing/content.ts`, `README.md` and `docs/DATA_SOURCES.md`; every claim was checked against the code on 2026-11-15.

Links:
- Game: https://spacedao.dayon-x.workers.dev (landing page; the game is at `/play`)
- Code: https://github.com/xdayon/SpaceDAO

## Project name

SpaceDAO

## One-sentence summary

SpaceDAO is a mission design game where agencies, companies and people plan, fund and fly space missions together on one open network, with live NASA data.

## Summary (about 150 words)

SpaceDAO is a web game for the Space Mission Design Game challenge. You represent a space agency or company, choose three partners for a four-member council, and design one of three real missions: Orbital Lab on the space station (easy), Earth Guardian, a satellite that watches fires, floods and farms (medium), or Moon Base Zero at the lunar south pole (hard). You set the charter, objectives, rocket, orbit and spacecraft while six gauges (mass, power, budget, data, comms, lifetime) react to every choice. Partners vote Go or No-Go with real numbers, and only a unanimous GO opens a 4-of-4 quantum-safe signature. The flight meets real solar storms from NASA DONKI, Operations runs the mission turn by turn, and the Debrief explains why it worked or failed. Up to four players can share the review on one screen. It is our proposal for a planetary space organization that shares technology, capacity and data.

## What it does and how it works

What the player does, in seven steps shown in a journey bar:

1. Mission: pick one of three real missions. Orbital Lab is 30 days of science on the space station: protein crystals, plants, tissue chips. Earth Guardian is a satellite that watches fires, floods and farms, with downlink to ground stations in the Global South. Moon Base Zero is the first outpost at the lunar south pole: water ice, the long night, rovers and comms with no Earth view.
2. Team: represent a space agency or company and choose three partners for your council. The catalog holds 18 space agencies and 16 companies, each shown as a flag and a name.
3. Design: set the mission charter, objectives, rocket, orbit and spacecraft modules. Adopt open designs other agencies shared, and rent your rocket's spare room to other teams' experiments to earn budget. Six gauges (mass, power, budget, data, comms, lifetime) stay on screen and react to every choice.
4. Review & Sign: a Go / No-Go readiness review. You check the objectives; your three partners split the engineering checks (mass, power, comms, budget, reliability) by their strengths. Each vote is GO, GO IF (a condition) or NO-GO, with the reason, the numbers, a "Fix it" button and sometimes a barter offer. One NO-GO holds the launch. A unanimous GO opens the 4-of-4 signature.
5. Launch: the flight is simulated and meets a real solar storm from NASA DONKI's records of the last 30 days.
6. Operate: run the station, satellite or outpost turn by turn: power, water, data, storms and impacts. Warnings arrive ahead of time with a fix, and a loss ends with its chain of causes.
7. Debrief: the score (science, safety, efficiency, collaboration), plain-language lessons on why the mission worked or failed, and a button to publish your design to the network. You can redesign and fly again at any time.

Two ways to play: Guided by Rocky, a mascot drawn in code who points at the key controls, or Quick play, where every step comes pre-filled with a recommended choice.

How it works:

- A React 19 and TypeScript single-page app, served with a small API by one Cloudflare Worker.
- The mission engine is pure, deterministic TypeScript (same inputs and seed, same result), covered by automated tests. It computes the six gauges, flies the mission with seeded random events, and runs Operations turn by turn.
- Risk assessment: the engine flies the design 200 times with different seeds and reports the share that succeed (probabilistic risk assessment, NASA/SP-2011-3421).
- Readiness review: each check compares the engine's numbers with NASA practice, such as a 10% margin on mass, power, link and budget, from NASA Goddard's mass and power margin rule (GSFC-STD-1000G), and at least 70% simulated success for a clean GO.
- Signatures: each council member signs a SHA-256 digest of the mission manifest with ed25519 plus ML-DSA-65 (NIST FIPS 204), in the browser, and the game verifies every signature in both schemes.
- Live data: the Worker fetches, caches and cleans the NASA feeds. When a feed is down, the game uses a bundled snapshot, so it works offline and with no keys.
- Shared data: published designs and the leaderboard are stored in Supabase. The Worker replays the flight and Operations before a score counts. Nicknames only, no personal data.
- Optional record: a signed mission can be recorded on the Solana devnet as a memo. Play credits only, no tokens, no real money.
- 3D: three.js scenes with NASA textures (Blue Marble, Black Marble, SVS CGI Moon Kit), and the spacecraft assembles in 3D as you build it.

## How SpaceDAO uses NASA data

NASA data drives the game. Live feeds come through our Cloudflare Worker, which caches them; when a feed is down, the game uses a bundled snapshot of the same source. An in-game "NASA live" panel lists each source and whether it is live or a snapshot.

Live NASA APIs:

- NASA DONKI (coronal mass ejections and geomagnetic storms, last 30 days): a real storm strikes your spacecraft during the flight, and recent storms land on Operations turns. Each event names its NASA record and date.
- NASA EONET v3 (open natural events): wildfires, storms and volcanoes appear on the Earth Guardian globe and Operations board as targets, and imaging them during the flight adds science.
- JPL Horizons: today's Earth-Moon distance, shown on Moon Base Zero and in the flight.
- NASA SSCWeb: the live position of the ISS, on the intro's 3D Earth and the Orbital Lab card.
- NASA DSN Now: which Deep Space Network dishes are busy right now. It sets how many downlink passes you get in Operations and shows in the flight.
- NASA APOD: fetched by the Worker and listed in the NASA live panel.

NASA imagery and audio:

- NASA Blue Marble, Black Marble and SVS CGI Moon Kit (LRO LROC color, LOLA elevation) textures for the 3D Earth and Moon. Public domain.
- NASA Space Launch System engine test audio for the launch sound. Public domain.

NASA documents and resources:

- Hardware and mission numbers carry their own sources, one tap away in the game: agency mission pages, NASA CLPS, LRO LOLA studies of south-pole illumination (Mazarico et al. 2011), ISS researcher guides, NISAR, VIIRS and Landsat mission pages, and launch provider guides.
- Operations cites LCROSS (ice in Cabeus), NASA Veggie and CubeSat 101.
- The readiness review cites NASA GSFC-STD-1000G (margins), NASA/SP-2011-3421 (probabilistic risk assessment) and NASA NPD 8610.24C (pre-launch readiness reviews).
- Challenge resources we reviewed: NASA CubeSat 101, JPL Concept Maturity Levels, Goddard Mission Design Lab, GMAT, NASA Mission Visualization.

SpaceDAO uses no NASA or agency logos, insignia or mission patches, and it is not endorsed by NASA or any agency.

## How SpaceDAO meets Challenge 13 (Space Mission Design Game)

Challenge: https://www.spaceappschallenge.org/2026/challenges/space-mission-design-game/

- Define a mission objective and requirements: a mission charter plus real science objectives, each with a "why it matters" line and a primary source.
- Design the spacecraft and select instruments: a module builder with real heritage hardware; the spacecraft assembles in 3D as you build it.
- Choose a launch vehicle and orbit: real rockets with real capacities, and destinations with real physics. The game checks that the payload fits what the rocket can deliver to that destination.
- Manage budget, mass, power, data, communications and lifetime: six gauges always visible, with margins and breakdowns.
- Every decision has a consequence: each choice moves the gauges and changes the flight and Operations outcome.
- Accessible at every level: plain language and one line per card, with the numbers and sources one tap below. Guided by Rocky teaches as you play; Quick play pre-fills recommended choices.
- Simulate, evaluate, redesign: a deterministic flight and Operations simulation, a risk assessment over 200 simulated flights, and redesign and fly again at any time.
- Understand why a mission succeeds or fails: warnings ahead of time, a cause chain on loss, and plain-language lessons in the Debrief.
- Teams of up to four with roles: a four-member council where each partner owns the checks that fit its strengths. Up to four players can each take a seat on one screen and call GO or NO-GO; one NO-GO holds the launch.
- Negotiate competing priorities: partners object with numbers and offer trades, the way ISS partners barter.
- Scoring and ranking: the score rewards science, safety, efficiency and collaboration, and the server replays each run before it enters the leaderboard.
- Scenarios and difficulty: three missions (easy, medium, hard) with random events, some drawn from live NASA records.
- Save, share and compare: publish your design to the network, adopt it as open tech in your next mission, and compare scores on the leaderboard.

## What is new, and the vision

What is new:

- Governance as gameplay. Real missions depend on who decides, who pays and who flies. SpaceDAO makes that playable: a mission charter, a Go / No-Go readiness review modeled on NASA pre-launch readiness reviews and the launch poll, barter between partners as on the ISS, and a signature from every partner before launch.
- Live NASA records as game events. The solar storms that hit your spacecraft and the wildfires, storms and volcanoes your satellite images come from NASA DONKI and EONET records of the last 30 days, each labeled with its source.
- Sharing with real trade-offs. An open design costs integration mass or power and asks you to publish your own design back. Spare rocket room earns budget and carries another team's experiment.
- Real cryptography in a game. Every signature is hybrid: ed25519 plus the post-quantum ML-DSA-65 (NIST FIPS 204), made in the browser. A signed mission can also be recorded on the Solana devnet.
- A source behind every number. Each real-world figure links to a public source one tap away.

The vision:

Space is already a team sport: 5 agencies from 15 nations run one space station, and more than 70 nations signed the Artemis Accords. But every partnership is still negotiated one treaty at a time. Designs stay behind export rules, data sits in separate archives, and most of the world watches from outside.

SpaceDAO is our proposal for a planetary space organization: one shared mission table where agencies, companies, scientists and funders plan missions together. Every new design is published as an open blueprint that others can adopt and improve. Spare mass on a rocket becomes a seat for a smaller nation's payload. The science comes back open to everyone. Partners decide together, with a mission charter, a Go / No-Go review and a signature from every partner. The game lets anyone, from a curious teenager to a mission engineer, feel that future in about five minutes while learning real mission design trade-offs.

## Technologies

- Front end: React 19, TypeScript, Vite, Tailwind CSS, zustand, motion.
- 3D: three.js, React Three Fiber, drei, postprocessing.
- Cryptography: @noble/curves (ed25519), @noble/post-quantum (ML-DSA-65), @noble/hashes (SHA-256).
- Back end: one Cloudflare Worker for the NASA data proxy, the leaderboard and the chain record; Supabase for the design registry and leaderboard; Solana devnet for the optional record.
- Quality: Vitest, ESLint, GitHub Actions on every pull request.
- Flags from flag-icons; fonts Michroma, Inter and JetBrains Mono via Fontsource.
- Licenses and credits: README sections "Libraries and licenses" and "Audio credits", and `public/textures/CREDITS.md`. The project is Apache 2.0.

## Use of AI

- Code and docs: the team used Anthropic's Claude to research sourced data, write and review code, and draft documentation. A team member reviewed every AI-assisted change, and commits made with Claude carry a Co-Authored-By line.
- Narration: the voice in our demo video was generated with ElevenLabs.
- Logo: the SpaceDAO logo image was generated with ChatGPT (OpenAI) from the team's concept and carries an "AI-generated" mark. The logo inside the game is drawn in code as SVG.
- No other AI-generated media. Game art is drawn in code (SVG and three.js), flags come from flag-icons, and the 3D Earth and Moon use NASA public-domain imagery. Music and sounds are CC0, CC BY or public domain: music by Scott Buckley (CC BY 4.0), interface and sci-fi effects by Kenney (CC0), and the launch sound from NASA Space Launch System engine test audio (public domain). All are listed in the README "Audio credits".
