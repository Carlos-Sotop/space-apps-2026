// All landing page copy lives here so it can be edited without touching layout.
// Fact rule: factual claims carry a source; vision statements read as proposals.

export interface Src { title: string; url: string }
export interface Fact { big: string; label: string; source: Src }

export const PLAY_URL = "/play";

export const hero = {
  eyebrow: "NASA Space Apps Challenge 2026 · Space Mission Design Game",
  title: "SpaceDAO",
  tagline: "Space belongs to humanity. Let's explore it together.",
  sub: "A mission design game where agencies, companies and people plan, fund and fly missions on one open network, with live NASA data.",
  play: "Play now",
  watch: "Watch the 30 s demo",
};

/** Video slots. Set src once the renders are uploaded to public/video/. */
export const videos = {
  teaser: { title: "SpaceDAO in 30 seconds", src: "/video/spacedao-30s.mp4", poster: "/video/spacedao-30s.jpg", captions: "/video/spacedao-30s.en.vtt" },
  deepDive: { title: "The 3-minute deep dive", src: "/video/spacedao-3min.mp4", poster: "/video/spacedao-3min.jpg", captions: "/video/spacedao-3min.en.vtt" },
};

export const problem = {
  kicker: "The problem",
  title: "Space is already a team sport. The rules still aren't.",
  facts: [
    {
      big: "5 agencies, 15 nations",
      label: "run one space station together.",
      source: { title: "NASA: International Space Station cooperation", url: "https://www.nasa.gov/international-space-station/space-station-international-cooperation/" },
    },
    {
      big: "70+ nations",
      label: "signed the Artemis Accords for peaceful, shared exploration.",
      source: { title: "NASA: The Artemis Accords", url: "https://www.nasa.gov/artemis-accords/" },
    },
    {
      big: "1 treaty at a time",
      label: "is how every partnership is still negotiated.",
      source: { title: "ESA: ISS legal framework (an intergovernmental agreement plus bilateral memoranda)", url: "https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/International_Space_Station/International_Space_Station_legal_framework" },
    },
  ] satisfies Fact[],
  outro: "Designs stay behind export rules, data sits in separate archives, rockets leave with spare room, and most of the world watches from outside.",
};

export const idea = {
  kicker: "Our proposal",
  title: "One shared mission table for the whole planet",
  body: "SpaceDAO is our proposal for a planetary space organization: a network where agencies, companies, scientists and funders plan missions together. The more we connect, the farther we go.",
  pillars: [
    { icon: "science", title: "Share technology", text: "Every new design is published as an open blueprint that others can adopt and improve." },
    { icon: "rocket", title: "Share capacity", text: "Spare mass on a rocket becomes a seat for a smaller nation's payload." },
    { icon: "data", title: "Share data", text: "The science comes back open to everyone, not locked in one archive." },
    { icon: "shield", title: "Decide together", text: "A mission charter, a Go / No-Go review and a 4-of-4 signature before launch." },
  ],
  network: "Agencies, companies, technologies and missions form one web: a second brain for space exploration. Adopting open tech pulls a node from the web. Publishing your mission gives one back.",
};

export const howToPlay = {
  kicker: "How to play",
  title: "Design a real mission in about five minutes",
  steps: [
    { n: 1, title: "Mission", text: "Pick one of three real missions, easy to hard." },
    { n: 2, title: "Team", text: "Represent an agency or company and choose 3 partners for your council." },
    { n: 3, title: "Design", text: "Set the charter, objectives, rocket, orbit and spacecraft. Six gauges react to every choice." },
    { n: 4, title: "Review & Sign", text: "Partners vote Go or No-Go with numbers. Unanimous GO unlocks the 4-of-4 signature." },
    { n: 5, title: "Launch", text: "Fly through real space weather from the last 30 days." },
    { n: 6, title: "Operate", text: "Run the outpost turn by turn: power, water, data, storms and impacts." },
    { n: 7, title: "Debrief", text: "Learn why it worked or failed, then publish your design to the network." },
  ],
  modes: "Two ways in: Guided by Rocky, our mascot, or Quick play with recommended choices pre-filled.",
};

export const missionsCopy = {
  kicker: "Three missions",
  items: [
    { id: "orbital-lab", name: "Orbital Lab", level: "Easy", text: "30 days of science on the space station: protein crystals, plants, tissue chips." },
    { id: "earth-guardian", name: "Earth Guardian", level: "Medium", text: "A satellite that watches fires, floods and farms, with downlink to ground stations in the Global South." },
    { id: "moon-base-zero", name: "Moon Base Zero", level: "Hard", text: "The first outpost at the lunar south pole: water ice, the long night, rovers and comms with no Earth view." },
  ],
};

export const nasaData = {
  kicker: "NASA data at the core",
  title: "The game runs on today's real space",
  live: [
    { name: "NASA DONKI", use: "Real solar storms (CMEs, geomagnetic storms) of the last 30 days hit your spacecraft.", url: "https://kauai.ccmc.gsfc.nasa.gov/DONKI/" },
    { name: "NASA EONET", use: "Open wildfires, storms and volcanoes become Earth Guardian targets.", url: "https://eonet.gsfc.nasa.gov/" },
    { name: "JPL Horizons", use: "Today's Earth-Moon distance sets the light delay for Moon comms.", url: "https://ssd.jpl.nasa.gov/horizons/" },
    { name: "NASA SSCWeb", use: "The live position of the ISS for Orbital Lab.", url: "https://sscweb.gsfc.nasa.gov/" },
    { name: "NASA DSN Now", use: "Which Deep Space Network dishes are busy right now.", url: "https://eyes.nasa.gov/dsn/dsn.html" },
    { name: "NASA APOD", use: "The astronomy picture of the day.", url: "https://apod.nasa.gov/" },
  ],
  reference: "Every hardware number cites its source: agency mission pages, NASA CLPS, LRO LOLA studies of south-pole illumination, ISS researcher guides, CubeSat 101 and launch provider guides. Live feeds fall back to bundled snapshots, so the game also works offline.",
  resources: ["NASA CubeSat 101", "JPL Concept Maturity Levels", "Goddard Mission Design Lab", "GMAT", "NASA Mission Visualization"],
};

export const challenge = {
  kicker: "Challenge 13 · Space Mission Design Game",
  title: "How SpaceDAO meets every requirement",
  url: "https://www.spaceappschallenge.org/2026/challenges/space-mission-design-game/",
  rows: [
    { asks: "Define objectives and requirements", answer: "Mission charter plus real science objectives, each with a primary source." },
    { asks: "Design the spacecraft and pick instruments", answer: "Module builder with real heritage hardware, assembled in 3D." },
    { asks: "Launch vehicle and orbit", answer: "Real rockets with real capacities and destinations with real physics." },
    { asks: "Manage mass, power, budget, data, comms, lifetime", answer: "Six gauges always visible, with margins and breakdowns." },
    { asks: "Every decision has a consequence", answer: "Each choice moves the gauges and changes the flight and operations outcome." },
    { asks: "Plain language", answer: "One line per card; the numbers and sources sit one tap below." },
    { asks: "Simulate, evaluate, redesign", answer: "Deterministic flight and operations simulation; redesign and fly again at any time." },
    { asks: "Understand why you failed", answer: "Warnings ahead of time, a cause chain on loss, and plain-language lessons." },
    { asks: "Collaborate in teams of up to 4", answer: "A 4-member council with roles; partners review, object and sign." },
  ],
};

export const tech = {
  kicker: "Under the hood",
  title: "Real technology, not a mock-up",
  items: [
    { title: "Deterministic engine", text: "A pure TypeScript mission engine: same inputs and seed, same result. Covered by automated tests." },
    { title: "Quantum-safe signatures", text: "Each council member signs with ed25519 plus ML-DSA-65 (NIST FIPS 204), in the browser." },
    { title: "Verifiable records", text: "Signed decisions can be anchored on the Solana devnet as a memo. Play credits only, no tokens." },
    { title: "Live data proxy", text: "A Cloudflare Worker caches the NASA feeds and serves snapshots when they are offline." },
    { title: "Fair leaderboard", text: "The server replays your run before it counts. Nicknames only, no personal data." },
    { title: "3D in the browser", text: "three.js scenes with NASA textures: Blue Marble, Black Marble and the LRO Moon kit." },
  ],
  stack: "React 19 · TypeScript · Vite · Tailwind CSS · zustand · motion · three.js / React Three Fiber · @noble post-quantum · Cloudflare Workers · Supabase · Solana devnet",
};

export const rules = {
  kicker: "Space Apps rules we follow",
  items: [
    "No NASA, agency or company logos: every actor is a flag and a name.",
    "Every real-world number links to a public source.",
    "Art is drawn in code (SVG and three.js). Music and sounds are licensed and credited below.",
    "No Chinese agencies, companies or services, per NASA's restrictions.",
    "Play credits and test networks only. No real money.",
    "Not endorsed by NASA or any agency.",
  ],
};

export const team = {
  kicker: "Team",
  place: "Built in 48 hours at Founder House, Florianópolis, Brazil.",
  members: [
    { name: "Dayon", role: "Vision, experience design, psychology of play", github: "xdayon" },
    { name: "Carlos Soto (Charlie)", role: "Engine, cryptography, chain, deploy", github: "Carlos-Sotop" },
    { name: "Eric", role: "3D scenes, open tech registry, rideshare, Supabase", github: "Eric-lsg" },
  ],
};

export const references = {
  kicker: "References and credits",
  groups: [
    {
      title: "NASA data and imagery",
      items: [
        "NASA DONKI, EONET, JPL Horizons, SSCWeb, DSN Now, APOD (public APIs).",
        "NASA Blue Marble, Black Marble and SVS CGI Moon Kit textures (public domain).",
        "NASA historical audio: Apollo 11 countdown, SLS engine test, Quindar tones (public domain).",
      ],
    },
    {
      title: "Music and sound",
      items: [
        "Music by Scott Buckley, www.scottbuckley.com.au, licensed under CC BY 4.0.",
        "Interface and sci-fi sound effects by Kenney (kenney.nl), CC0.",
      ],
    },
    {
      title: "Code and fonts",
      items: [
        "React, Vite, Tailwind CSS, zustand, motion, three.js, React Three Fiber, drei, @noble/curves, @noble/post-quantum (MIT); TypeScript (Apache-2.0).",
        "flag-icons (MIT) for every flag.",
        "Michroma, Inter, JetBrains Mono via Fontsource (SIL Open Font License 1.1).",
      ],
    },
  ],
  repo: "https://github.com/xdayon/SpaceDAO",
};

export const useOfAi = {
  kicker: "Use of AI",
  text: "We used AI assistants (Anthropic's Claude) to research sources, write and review code, and draft documentation; every change was reviewed by a team member. The video narration voice was generated with ElevenLabs. The SpaceDAO logo was generated with ChatGPT from our concept and carries an \"AI-generated\" mark. No other images, music or sounds are AI-generated.",
};

export const finalCta = {
  title: "Ready to plan a mission with the whole planet?",
  sub: "Get a taste of what a planetary space organization could feel like.",
  play: "Play SpaceDAO",
  closing: "Space belongs to humanity.",
};
