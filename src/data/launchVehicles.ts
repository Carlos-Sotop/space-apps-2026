import type { LaunchVehicle } from "@/engine/types";

// Payloads come from NASA's Launch Services Program or the maker's user's guide where one states them;
// Wikipedia stays only for flight records, prices nobody publishes, and figures with no primary source yet.
const wiki = (title: string, slug: string) => ({ title, url: `https://en.wikipedia.org/wiki/${slug}` });

// NASA Launch Services Program performance query, read 2026-11-14 (site data updated 2024-02-29).
// Lunar transfer (TLI) values use C3 = -1 km2/s2, the lowest C3 the Falcon curves cover; a TLI is about -2, so they are slightly conservative.
const S_LSP = { title: "NASA Launch Services Program: Launch Vehicle Performance Website (performance query)", url: "https://elvperf.ksc.nasa.gov/Pages/Query.aspx" };
// Maker and agency documents, opened 2026-11-14. Page numbers are the ones printed on the page.
const S_A6 = { title: "Arianespace: Ariane 6 User's Manual, Issue 2 Rev 0, March 2021 (sections 2.4.2 and 2.4.6)", url: "https://www.arianespace.com/app/uploads/sites/4/2024/10/Mua-6_Issue-2_Revision-0_March-2021.pdf" };
const S_A6_NUMBERS = { title: "ArianeGroup: Number crunching, Ariane 6, Ariane 62 and Ariane 64", url: "https://www.ariane.group/en/news/number-crunching-ariane-6-ariane-62-and-ariane-64/" };
const S_VEGAC = { title: "Avio: Vega C User's Manual, Issue 1 Rev 0, September 2025 (Table 2.4.a)", url: "https://api.avio.it/assets/bad2918c-390d-412c-b5eb-f262fd6f7446?download=" };
const S_VEGAC0 = { title: "Arianespace: Vega C User's Manual, Issue 0 Rev 0 (Table 2.4.2.a)", url: "https://ariane.group/app/uploads/sites/4/2024/10/Vega-C-users-manual-Issue-0-Revision-0.pdf" };
const S_H3 = { title: "JAXA: H3 launch vehicle system (H3-30, 4 t or more to 500 km SSO)", url: "https://www.rocket.jaxa.jp/rocket/h3/system.html" };
const S_HTVX1 = { title: "JAXA: HTV-X1 press kit (launch mass about 16.0 t on H3-24W)", url: "https://humans-in-space.jaxa.jp/htv/mission/htv-x1/presskit/JAXA_htv-x1_presskit.pdf" };
const S_PSLV = { title: "ISRO: PSLV (1,750 kg to 600 km sun-synchronous polar orbit)", url: "https://www.isro.gov.in/PSLV_CON.html" };
const S_ELECTRON = { title: "Rocket Lab: Electron Payload User's Guide 7.0", url: "https://rocketlabusa.com/assets/Electron-Payload-User-Guide-7.0-v6.pdf" };
const S_RKLB_10K = { title: "Rocket Lab 2025 annual report (SEC 10-K): revenue per Electron launch", url: "https://www.sec.gov/Archives/edgar/data/1819994/000181999426000013/rklb-20251231.htm" };
const S_ALPHA = { title: "Firefly: Alpha Payload User's Guide 5.3 (Table 1)", url: "https://fireflyspace.com/wp-content/uploads/2026/09/Alpha-PUG-5.3-1.pdf" };
const S_ALPHA_PRICE = { title: "Firefly: Alpha Payload User's Guide 5.2, July 2025 ($19M dedicated launch), archived copy", url: "https://web.archive.org/web/20260722024003id_/https://fireflyspace.com/wp-content/uploads/2025/07/Alpha-PUG-5.2.pdf" };
const S_KARI = { title: "KARI: Nuri (KSLV-II), a 1.5-ton satellite to a 600-800 km sun-synchronous orbit", url: "https://www.kari.re.kr/eng/contents/178" };

export const launchVehicles: LaunchVehicle[] = [
  {
    id: "falcon-9",
    name: "Falcon 9",
    providerId: "spacex",
    // reusable figures (first stage lands on the drone ship, "ASDS" in NASA LSP), how it usually flies
    capacityKg: {
      LEO: 17400, // reusable, Wikipedia infobox (expended: 22,800)
      ISS: 14460, // NASA LSP: Falcon 9 Full Thrust ASDS, 400 km circular at 51.6 deg
      SSO: 11560, // NASA LSP: Falcon 9 Full Thrust ASDS, 550 km circular sun-synchronous from Vandenberg
      GTO: 5500, // reusable, drone ship
      TLI: 3425, // NASA LSP: Falcon 9 Full Thrust ASDS, C3 = -1 km2/s2
    },
    costMUsd: 74, // US$74M per launch, Block 5, 2026
    reliability: 0.9957, // 699 successes of 702 launches as of 2026-11-12
    reusable: true,
    status: "operational",
    blurb: "Reusable workhorse with the longest flight record today.",
    specs: { heightM: 69.8, stages: 2, flights: 702, successes: 699, recordAsOf: "2026-11-15" }, // Wikipedia infobox read 2026-11-15; Full Thrust height; record covers every Falcon 9 version
    sources: [S_LSP, wiki("Falcon 9 (Block 5 payload, price, launch record)", "Falcon_9")],
    verified: false,
  },
  // Falcon Heavy flies in two configurations with very different capacity, so the game lists both.
  // Only the lunar figure is listed: no mission in the game flies Falcon Heavy to another orbit.
  {
    id: "falcon-heavy",
    name: "Falcon Heavy (boosters recovered)",
    providerId: "spacex",
    capacityKg: {
      TLI: 6880, // NASA LSP: Falcon Heavy (Recovery), C3 = -1 km2/s2
    },
    costMUsd: 97, // reusable price published in 2022
    reliability: 1, // 14 successes of 14 launches
    reusable: true,
    status: "operational",
    blurb: "Lands its three cores for reuse: cheaper, but lifts less.",
    specs: { heightM: 70, stages: 2, flights: 14, successes: 14, recordAsOf: "2026-11-15" }, // Wikipedia infobox read 2026-11-15; two side boosters around the core
    sources: [S_LSP, wiki("Falcon Heavy (payload, price, flights)", "Falcon_Heavy")],
    verified: true, // every number matched 2026-11-15: payload re-run on NASA LSP, price and record on the cited page
  },
  {
    id: "falcon-heavy-expendable",
    name: "Falcon Heavy (expendable)",
    providerId: "spacex",
    capacityKg: {
      TLI: 15310, // NASA LSP: Falcon Heavy (Expendable), C3 = -1 km2/s2
    },
    costMUsd: 178, // NASA JPL, 2021-07-23: Europa Clipper launch services on Falcon Heavy, "approximately $178 million" (a contract total, not a list price)
    reliability: 1, // same vehicle record as above, 14 of 14
    reusable: false,
    status: "operational",
    blurb: "All three cores spent for full power. Europa Clipper flew this way.",
    specs: { heightM: 70, stages: 2, flights: 14, successes: 14, recordAsOf: "2026-11-15" }, // Wikipedia infobox read 2026-11-15; same vehicle record as above
    sources: [
      S_LSP,
      { title: "NASA JPL: NASA awards launch services contract for the Europa Clipper mission (about $178 million)", url: "https://www.jpl.nasa.gov/news/nasa-awards-launch-services-contract-for-the-europa-clipper-mission/" },
      wiki("Falcon Heavy (height, stages, launch record)", "Falcon_Heavy"),
    ],
    verified: true, // every number matched 2026-11-15: payload re-run on NASA LSP, price on NASA JPL, record on the cited page
  },
  {
    id: "starship",
    name: "Starship",
    providerId: "spacex",
    capacityKg: {
      LEO: 35000, // Block 2 figure; Block 3 is listed at 100,000 but unproven
      ISS: 32000, // derived: 0.92 x LEO
      // no TLI: a Starship reaches the Moon only after propellant is loaded in Earth orbit by tanker flights (NASA, HLS)
    },
    costMUsd: 100, // Wikipedia infobox, expendable cost
    reliability: 0.85, // game value
    reusable: true,
    status: "in-development",
    blurb: "Must refill in orbit before it can reach the Moon.",
    specs: { heightM: 124.4, stages: 2, flights: 15, successes: 10, recordAsOf: "2026-11-15" }, // Wikipedia infobox read 2026-11-15; Block 3 height; record covers Blocks 1 to 3
    sources: [
      wiki("SpaceX Starship (payload by block, status)", "SpaceX_Starship"),
      { title: "NASA: NASA, SpaceX illustrate key moments of Artemis lunar lander mission (propellant loading in Earth orbit)", url: "https://www.nasa.gov/directorates/esdmd/artemis-campaign-development-division/human-landing-system-program/nasa-spacex-illustrate-key-moments-of-artemis-lunar-lander-mission/" },
    ],
    verified: false,
  },
  {
    id: "new-glenn",
    name: "New Glenn",
    providerId: "blue-origin",
    capacityKg: {
      LEO: 45000, // 7x2 configuration
      ISS: 34110, // NASA LSP: New Glenn with first stage recovery, 400 km circular at 51.6 deg
      GTO: 13600,
      TLI: 7130, // NASA LSP: New Glenn with first stage recovery, C3 = -1 km2/s2
    },
    costMUsd: 90, // US$68-110M reported range, midpoint
    reliability: 0.667, // 2 successes of 3 flights as of 2026-04 (NG-3 failed)
    reusable: true,
    status: "operational",
    blurb: "Heavy lifter with a reusable first stage; ESCAPADE rode it.",
    specs: { heightM: 98, stages: 2, flights: 3, successes: 2, recordAsOf: "2026-11-15" }, // Wikipedia infobox read 2026-11-15
    sources: [S_LSP, wiki("New Glenn (payload, flights, price)", "New_Glenn")],
    verified: false,
  },
  {
    id: "vulcan-centaur",
    name: "Vulcan Centaur",
    providerId: "ula",
    capacityKg: {
      LEO: 27200, // VC6, LEO reference 200 km 28.7 deg
      ISS: 25800, // VC6, LEO-ISS 407 km 51.6 deg
      SSO: 20000, // derived: below the 23,900 kg polar 200 km figure because SSO is higher
      GTO: 14500,
      TLI: 11500, // VC6, C3 = -2
    },
    costMUsd: 110, // estimate: widely reported NSSL-class price, no ULA list price
    reliability: 0.95, // estimate: few flights, a solid booster anomaly on early flights
    reusable: false,
    status: "operational",
    blurb: "ULA's Centaur V upper stage launcher for national security and science.",
    specs: { heightM: 61.6, stages: 2, flights: 4, successes: 4, recordAsOf: "2026-11-15" }, // Wikipedia infobox read 2026-11-15; standard fairing
    sources: [{ title: "ULA Vulcan Centaur performance table (VC6)", url: "https://www.ulalaunch.com/rockets/vulcan-centaur" }, wiki("Vulcan Centaur (height, stages, launch record)", "Vulcan_Centaur")],
    verified: false,
  },
  {
    id: "ariane-62",
    name: "Ariane 6 (A62)",
    providerId: "esa",
    capacityKg: {
      LEO: 10300, // ArianeGroup: "10,300 kg to low Earth orbit"
      ISS: 10000, // Ariane 6 manual: 250 km circular at 51.6 deg
      SSO: 7200, // Ariane 6 manual: 500 km at 97.4 deg
      GTO: 4500, // ArianeGroup: "4,500 kg to geostationary transfer orbit"
      TLI: 3500, // Ariane 6 manual: lunar transfer orbit, 400,000 x 200 km at 6 deg
    },
    costMUsd: 108, // EUR 100M (2024 estimate) at about 1.08 USD per EUR
    reliability: 0.889, // 8 successes of 9 Ariane 6 launches (1 partial failure, maiden flight)
    reusable: false,
    status: "operational",
    blurb: "Europe's launcher with two boosters, operated by Arianespace.",
    specs: { heightM: 63, stages: 2, flights: 9, successes: 8, recordAsOf: "2026-11-15" }, // Wikipedia infobox read 2026-11-15; Ariane 6 family record
    sources: [S_A6, S_A6_NUMBERS, wiki("Ariane 6 (price, flights)", "Ariane_6")],
    verified: true, // every number matched 2026-11-15: payloads in the Ariane 6 manual and ArianeGroup page, price and record on the cited page
  },
  {
    id: "ariane-64",
    name: "Ariane 6 (A64)",
    providerId: "esa",
    capacityKg: {
      LEO: 21600, // ArianeGroup: "21,600 kg to LEO"
      ISS: 20000, // Ariane 6 manual: 250 km circular at 51.6 deg
      SSO: 15500, // Ariane 6 manual: 500 km at 97.4 deg
      GTO: 11500, // ArianeGroup: "11,500 kg to GTO"
      TLI: 8600, // Ariane 6 manual: lunar transfer orbit, 400,000 x 230 km at 7 deg
    },
    costMUsd: 124, // EUR 115M (2018 estimate) at about 1.08 USD per EUR
    reliability: 0.889, // family record: 8 of 9 launches
    reusable: false,
    status: "operational",
    blurb: "Four-booster Ariane 6 for heavy loads, operated by Arianespace.",
    specs: { heightM: 63, stages: 2, flights: 9, successes: 8, recordAsOf: "2026-11-15" }, // Wikipedia infobox read 2026-11-15; Ariane 6 family record
    sources: [S_A6, S_A6_NUMBERS, wiki("Ariane 6 (price, flights)", "Ariane_6")],
    verified: true, // every number matched 2026-11-15: payloads in the Ariane 6 manual and ArianeGroup page, price and record on the cited page
  },
  {
    id: "vega-c",
    name: "Vega C",
    providerId: "esa",
    capacityKg: {
      LEO: 2250, // Vega C manual Issue 0: 500 km circular at 88 deg, used conservatively
      SSO: 2266, // Vega C manual Issue 1: 710 x 690 km at 98.2 deg
    },
    costMUsd: 52, // EUR 48M (2022) at about 1.08 USD per EUR
    reliability: 0.875, // 7 successes of 8 launches (VV22 failed, Dec 2022)
    reusable: false,
    status: "operational",
    blurb: "Small European launcher for Earth observation, by Arianespace.",
    specs: { heightM: 34.8, stages: 4, flights: 8, successes: 7, recordAsOf: "2026-11-15" }, // Wikipedia infobox read 2026-11-15
    sources: [S_VEGAC, S_VEGAC0, wiki("Vega C (price, flights)", "Vega_C")],
    verified: true, // every number matched 2026-11-15: payloads in both Vega C manuals, price and record on the cited page
  },
  {
    id: "h3",
    name: "H3 (H3-24)",
    providerId: "jaxa",
    capacityKg: {
      LEO: 16000, // Wikipedia: H3-24 to 420 km at 51.64 deg
      ISS: 16000, // JAXA: H3-24W launched HTV-X1 at about 16.0 t into a 200 x 300 km, 51.6 deg orbit (a flown mass, not a rated figure)
      SSO: 4000, // JAXA: H3-30, 4 t or more to a 500 km sun-synchronous orbit
      GTO: 7900,
    },
    costMUsd: 50, // estimate: H3-30 is about US$34M (JPY 5.13bn, 2024); H3-24 assumed ~1.5x
    reliability: 0.8, // 8 successes of 10 flights (TF1 2023 and F8 Dec 2025 failed)
    reusable: false,
    status: "operational",
    blurb: "Japan's flexible launcher, cheaper than its predecessor H-IIA.",
    specs: { heightM: 63, stages: 2, flights: 10, successes: 8, recordAsOf: "2026-11-15" }, // Wikipedia infobox read 2026-11-15; with the L or W fairing (57 m with the S fairing)
    sources: [S_HTVX1, S_H3, wiki("H3 (rocket) (payload, price, flights)", "H3_(rocket)")],
    verified: false,
  },
  {
    id: "pslv",
    name: "PSLV-XL",
    providerId: "isro",
    capacityKg: {
      LEO: 3800, // Wikipedia: ISRO states no LEO figure
      SSO: 1750, // ISRO: 1,750 kg to a 600 km sun-synchronous polar orbit
      GTO: 1425, // ISRO: 1,425 kg to sub-GTO
    },
    costMUsd: 22, // INR 130-200 crore, US$18-27M, midpoint
    reliability: 0.922, // 59 successes of 64 launches as of 2026-11-15
    reusable: false,
    status: "operational",
    blurb: "India's low-cost rideshare champion for small satellites.",
    specs: { heightM: 44, stages: 4, flights: 64, successes: 59, recordAsOf: "2026-11-15" }, // Wikipedia infobox read 2026-11-15
    sources: [S_PSLV, wiki("PSLV (LEO payload, price, flights)", "PSLV")],
    verified: false,
  },
  {
    id: "lvm3",
    name: "LVM3",
    providerId: "isro",
    capacityKg: {
      LEO: 10000,
      GTO: 4200,
      TLI: 3500, // derived: 0.35 x LEO
    },
    costMUsd: 43, // INR 402 crore
    reliability: 1, // 9 successes of 9 launches as of 2025-12-24
    reusable: false,
    status: "operational",
    blurb: "India's heavy launcher; it sent Chandrayaan-3 to the Moon.",
    specs: { heightM: 43.4, stages: 3, flights: 9, successes: 9, recordAsOf: "2026-11-15" }, // Wikipedia infobox read 2026-11-15
    sources: [wiki("LVM3 (payload, price, flights)", "LVM3")],
    verified: false,
  },
  {
    id: "electron",
    name: "Electron",
    providerId: "rocket-lab",
    capacityKg: {
      LEO: 300, // Rocket Lab user's guide: "up to 300 kg" into low Earth orbit
      SSO: 200, // Rocket Lab user's guide: up to 200 kg into a 500 km sun-synchronous orbit
    },
    costMUsd: 8.5, // Rocket Lab 10-K: revenue per Electron launch was $8.5M in 2025 (no list price published)
    reliability: 0.96, // 96 successes of 100 launches (count includes HASTE suborbital flights)
    reusable: false,
    status: "operational",
    blurb: "Dedicated small launcher with booster recovery trials.",
    specs: { heightM: 18, stages: 2, flights: 100, successes: 96, recordAsOf: "2026-11-15" }, // Wikipedia infobox read 2026-11-15; count includes HASTE suborbital flights
    sources: [S_ELECTRON, S_RKLB_10K, wiki("Electron (rocket) (flights)", "Electron_(rocket)")],
    verified: false,
  },
  {
    id: "neutron",
    name: "Neutron",
    providerId: "rocket-lab",
    capacityKg: {
      LEO: 13000, // partially reusable (expendable 15,000)
      ISS: 12000, // derived: 0.92 x LEO
    },
    costMUsd: 50, // Wikipedia, citing a 2023 CNBC report on the price target
    reliability: 0.85, // game value
    reusable: true,
    status: "in-development",
    blurb: "Medium reusable rocket, first launch slipped to 2027.",
    specs: { heightM: 42.8, stages: 2, flights: 0, successes: 0, recordAsOf: "2026-11-15" }, // Wikipedia infobox read 2026-11-15; not flown yet
    sources: [wiki("Neutron (rocket) (payload, price, status)", "Neutron_(rocket)")],
    verified: false,
  },
  {
    id: "nuri",
    name: "Nuri (KSLV-II)",
    providerId: "kasa",
    capacityKg: {
      LEO: 3300, // Wikipedia: no KARI figure for a low parking orbit
      SSO: 1500, // KARI: a 1.5-ton satellite into a 600-800 km sun-synchronous orbit
      GTO: 1000,
    },
    costMUsd: 30, // Wikipedia: launch cost estimated around US$30M
    reliability: 0.8, // 4 successes of 5 launches as of 2026-10-07
    reusable: false,
    status: "operational",
    blurb: "South Korea's own three-stage launcher, flying since 2021.",
    specs: { heightM: 47.2, stages: 3, flights: 5, successes: 4, recordAsOf: "2026-11-15" }, // Wikipedia infobox read 2026-11-15
    sources: [S_KARI, wiki("Nuri (rocket) (LEO payload, price, flights)", "Nuri_(rocket)")],
    verified: false,
  },
  {
    id: "firefly-alpha",
    name: "Firefly Alpha",
    providerId: "firefly",
    capacityKg: {
      LEO: 1030, // Firefly user's guide 5.3: 300 km
      SSO: 630, // Firefly user's guide 5.3: 500 km sun-synchronous
    },
    costMUsd: 19, // Firefly user's guide 5.2 (July 2025): "$19M for a dedicated commercial launch service"
    reliability: 0.43, // 3 successes of 7 launches as of 2026-03-12 (2 failures, 2 partial)
    reusable: false,
    status: "operational",
    blurb: "Small launcher with a rough record; Firefly is fixing it.",
    specs: { heightM: 29, stages: 2, flights: 7, successes: 3, recordAsOf: "2026-11-15" }, // Wikipedia infobox read 2026-11-15; 2 failures and 2 partial failures
    sources: [S_ALPHA, S_ALPHA_PRICE, wiki("Firefly Alpha (flights)", "Firefly_Alpha")],
    verified: false,
  },
];
