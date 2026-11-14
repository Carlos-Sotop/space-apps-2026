import type { LaunchVehicle } from "@/engine/types";

// Wikipedia is used as a last resort: the vehicle pages cite manufacturer guides, but WebFetch could not open most of those.
const wiki = (title: string, slug: string) => ({ title, url: `https://en.wikipedia.org/wiki/${slug}` });

// NASA Launch Services Program performance query, read 2026-11-14 (site data updated 2024-02-29).
// Lunar transfer (TLI) values use C3 = -1 km2/s2, the lowest C3 the Falcon curves cover; a TLI is about -2, so they are slightly conservative.
const S_LSP = { title: "NASA Launch Services Program: Launch Vehicle Performance Website (performance query)", url: "https://elvperf.ksc.nasa.gov/Pages/Query.aspx" };

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
    sources: [S_LSP, wiki("Falcon Heavy (payload, price, flights)", "Falcon_Heavy")],
    verified: false,
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
    sources: [
      S_LSP,
      { title: "NASA JPL: NASA awards launch services contract for the Europa Clipper mission (about $178 million)", url: "https://www.jpl.nasa.gov/news/nasa-awards-launch-services-contract-for-the-europa-clipper-mission/" },
    ],
    verified: false,
  },
  {
    id: "starship",
    name: "Starship",
    providerId: "spacex",
    capacityKg: {
      LEO: 35000, // Block 2 figure; Block 3 is listed at 100,000 but unproven
      ISS: 32000, // derived: 0.92 x LEO
      TLI: 12000, // derived: 0.35 x LEO
    },
    costMUsd: 100, // Wikipedia infobox, expendable cost
    reliability: 0.85, // game value
    reusable: true,
    status: "in-development",
    blurb: "Fully reusable super-heavy lifter still in flight testing.",
    sources: [wiki("SpaceX Starship (payload by block, status)", "SpaceX_Starship")],
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
    sources: [{ title: "ULA Vulcan Centaur performance table (VC6)", url: "https://www.ulalaunch.com/rockets/vulcan-centaur" }],
    verified: false,
  },
  {
    id: "ariane-62",
    name: "Ariane 6 (A62)",
    providerId: "esa",
    capacityKg: {
      LEO: 10350,
      ISS: 9300, // derived: 0.9 x LEO
      SSO: 7200,
      GTO: 4500,
      TLI: 3600, // derived: 0.35 x LEO
    },
    costMUsd: 108, // EUR 100M (2024 estimate) at about 1.08 USD per EUR
    reliability: 0.889, // 8 successes of 9 Ariane 6 launches (1 partial failure, maiden flight)
    reusable: false,
    status: "operational",
    blurb: "Europe's launcher with two boosters, operated by Arianespace.",
    sources: [wiki("Ariane 6 (A62/A64 payload, price, flights)", "Ariane_6")],
    verified: false,
  },
  {
    id: "ariane-64",
    name: "Ariane 6 (A64)",
    providerId: "esa",
    capacityKg: {
      LEO: 21650,
      ISS: 19500, // derived: 0.9 x LEO
      SSO: 15500,
      GTO: 11500,
      TLI: 7500, // derived: 0.35 x LEO
    },
    costMUsd: 124, // EUR 115M (2018 estimate) at about 1.08 USD per EUR
    reliability: 0.889, // family record: 8 of 9 launches
    reusable: false,
    status: "operational",
    blurb: "Four-booster Ariane 6 for heavy loads, operated by Arianespace.",
    sources: [wiki("Ariane 6 (A62/A64 payload, price, flights)", "Ariane_6")],
    verified: false,
  },
  {
    id: "vega-c",
    name: "Vega C",
    providerId: "esa",
    capacityKg: {
      LEO: 2250, // polar 500 km figure, used conservatively
      ISS: 2000, // estimate: slightly below the polar 500 km figure
      SSO: 2300, // 700 km SSO
    },
    costMUsd: 52, // EUR 48M (2022) at about 1.08 USD per EUR
    reliability: 0.875, // 7 successes of 8 launches (VV22 failed, Dec 2022)
    reusable: false,
    status: "operational",
    blurb: "Small European launcher for Earth observation, by Arianespace.",
    sources: [wiki("Vega C (payload, price, flights)", "Vega_C")],
    verified: false,
  },
  {
    id: "h3",
    name: "H3 (H3-24)",
    providerId: "jaxa",
    capacityKg: {
      LEO: 16000, // H3-24, 420 km 51.64 deg
      ISS: 16000,
      SSO: 4000, // H3-30, 500 km
      GTO: 7900,
      TLI: 5600, // derived: 0.35 x LEO
    },
    costMUsd: 50, // estimate: H3-30 is about US$34M (JPY 5.13bn, 2024); H3-24 assumed ~1.5x
    reliability: 0.8, // 8 successes of 10 flights (TF1 2023 and F8 Dec 2025 failed)
    reusable: false,
    status: "operational",
    blurb: "Japan's flexible launcher, cheaper than its predecessor H-IIA.",
    sources: [wiki("H3 (rocket) (payload, price, flights)", "H3_(rocket)")],
    verified: false,
  },
  {
    id: "pslv",
    name: "PSLV-XL",
    providerId: "isro",
    capacityKg: {
      LEO: 3800,
      SSO: 1750,
      GTO: 1300,
    },
    costMUsd: 22, // INR 130-200 crore, US$18-27M, midpoint
    reliability: 0.921, // 58 successes of 63 launches as of 2026-01-12
    reusable: false,
    status: "operational",
    blurb: "India's low-cost rideshare champion for small satellites.",
    sources: [wiki("PSLV (payload, price, flights)", "PSLV")],
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
    sources: [wiki("LVM3 (payload, price, flights)", "LVM3")],
    verified: false,
  },
  {
    id: "electron",
    name: "Electron",
    providerId: "rocket-lab",
    capacityKg: {
      LEO: 300,
      SSO: 200,
    },
    costMUsd: 7.5,
    reliability: 0.96, // 96 successes of 100 launches (count includes HASTE suborbital flights)
    reusable: false,
    status: "operational",
    blurb: "Dedicated small launcher with booster recovery trials.",
    sources: [wiki("Electron (rocket) (payload, price, flights)", "Electron_(rocket)")],
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
    sources: [wiki("Neutron (rocket) (payload, price, status)", "Neutron_(rocket)")],
    verified: false,
  },
  {
    id: "nuri",
    name: "Nuri (KSLV-II)",
    providerId: "kasa",
    capacityKg: {
      LEO: 3300,
      SSO: 1900,
      GTO: 1000,
    },
    costMUsd: 30, // Wikipedia: launch cost estimated around US$30M
    reliability: 0.8, // 4 successes of 5 launches as of 2026-10-07
    reusable: false,
    status: "operational",
    blurb: "South Korea's own three-stage launcher, flying since 2021.",
    sources: [wiki("Nuri (rocket) (payload, price, flights)", "Nuri_(rocket)")],
    verified: false,
  },
  {
    id: "firefly-alpha",
    name: "Firefly Alpha",
    providerId: "firefly",
    capacityKg: {
      LEO: 1030,
      SSO: 630,
    },
    costMUsd: 16, // US$15-17.6M, midpoint
    reliability: 0.43, // 3 successes of 7 launches as of 2026-03-12 (2 failures, 2 partial)
    reusable: false,
    status: "operational",
    blurb: "Small launcher with a rough record; Firefly is fixing it.",
    sources: [wiki("Firefly Alpha (payload, price, flights)", "Firefly_Alpha")],
    verified: false,
  },
];
