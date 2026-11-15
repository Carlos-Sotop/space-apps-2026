import type { Actor } from "@/engine/types";

// Sources: Wikipedia pages (last resort) that WebFetch opened and that state the figures.
// Entries tagged "spec fact" use a fact given in the task brief whose page could not be opened; check them first.
const wiki = (title: string, slug: string) => ({ title, url: `https://en.wikipedia.org/wiki/${slug}` });
const agencyList = wiki("List of government space agencies", "List_of_government_space_agencies");

// HQ: lat, lon, drawn on the globe
export const actorHq: Record<string, [number, number]> = {
  nasa: [38.883, -77.016],
  ggpen: [-8.839, 13.289],
  nssa: [26.228, 50.586],
  aeb: [-15.794, -47.882],
  csa: [45.521, -73.393],
  esa: [48.849, 2.303],
  isro: [13.034, 77.569],
  asi: [41.855, 12.477],
  jaxa: [35.656, 139.544],
  kasa: [35.095, 128.067],
  mbrsc: [25.115, 55.389],
  conae: [-34.613, -58.372],
  nasrda: [9.057, 7.489],
  aep: [-25.264, -57.575],
  ases: [14.693, -17.447],
  aee: [37.389, -5.984],
  tua: [39.933, 32.860],
  uksa: [51.558, -1.781],
  spacex: [33.921, -118.328],
  "blue-origin": [47.381, -122.234],
  "rocket-lab": [33.770, -118.194],
  "intuitive-machines": [29.552, -95.098],
  firefly: [30.505, -97.820],
  astrobotic: [40.440, -79.996],
  ispace: [35.659, 139.745],
  axiom: [29.600, -95.160],
  "sierra-space": [39.978, -105.131],
  "northrop-grumman": [38.883, -77.171],
  "thales-alenia-space": [43.551, 7.013],
  "airbus-defence-space": [48.054, 11.619],
  iceye: [60.176, 24.829],
  ula: [39.580, -104.877],
  "bizu-space": [-23.179, -45.887],
  visiona: [-23.179, -45.887],
};

export const actors: Actor[] = [
  {
    id: "nasa",
    kind: "agency",
    name: "National Aeronautics and Space Administration",
    shortName: "NASA",
    country: "US",
    flag: "🇺🇸",
    color: "#4f8cff",
    tagline: "Deep-space science and the Artemis return to the Moon",
    highlights: [
      "FY2026 budget: US$24.4 billion, the largest of any space agency",
      "Runs the Deep Space Network with complexes in California, Madrid and Canberra",
      "Leads Artemis, with the Moon south pole as the target",
    ],
    capabilities: { science: 3, spacecraft: 3, comms: 3, "ground-segment": 3, landing: 2 },
    contributionMUsd: 137, // budget: US$24.4B, FY2026
    perk: {
      name: "Deep Space Network",
      description: "NASA's DSN antennas give far more downlink than commercial ground stations.",
      modifiers: [{ stat: "downlinkRate", op: "mul", value: 1.3 }], // game value
    },
    priorities: { science: 0.55, safety: 0.3, cost: 0.15 }, // game value
    persona: "Speaks like a mission scientist: curious, careful with evidence, proud of rigorous peer review.",
    sources: [wiki("NASA (budget FY2026)", "NASA")],
    verified: false,
  },
  {
    id: "esa",
    kind: "agency",
    name: "European Space Agency",
    shortName: "ESA",
    country: "EU",
    flag: "🇪🇺",
    color: "#3dd6d0",
    tagline: "Joint European missions and independent launch access",
    highlights: [
      "2026 budget: EUR 8.26 billion across its member states",
      "Columbus, the ISS science laboratory, was built in Turin",
      "Ariane 6 gives Europe its own access to space",
    ],
    capabilities: { launch: 3, science: 3, spacecraft: 3, "earth-observation": 3 },
    contributionMUsd: 119, // budget: EUR 8.26B (about US$9.32B), 2026
    perk: {
      name: "Ariane 6 access",
      description: "Europe flies its own heavy launcher from Kourou, with a record of 8 successes in 9 flights.",
      modifiers: [
        { stat: "launchCost", op: "mul", value: 0.92 },
        { stat: "launchReliability", op: "mul", value: 1.02 },
      ], // game value
    },
    priorities: { science: 0.4, safety: 0.4, cost: 0.2 }, // game value
    persona: "Consensus-minded and safety-first, always asking whether every member state's partners are on board.",
    sources: [wiki("European Space Agency (budget 2026)", "European_Space_Agency"), wiki("Italian Space Agency (Columbus built in Turin)", "Italian_Space_Agency")],
    verified: false,
  },
  {
    id: "isro",
    kind: "agency",
    name: "Indian Space Research Organisation",
    shortName: "ISRO",
    country: "IN",
    flag: "🇮🇳",
    color: "#ff9a3c",
    tagline: "Frugal engineering, Moon south pole lander",
    highlights: [
      "Chandrayaan-3 landed near the Moon's south pole on 23 August 2023",
      "First country to land a spacecraft near the lunar south pole",
      "2026-27 budget: INR 13,705 crore, about US$1.5 billion",
    ],
    capabilities: { launch: 2, landing: 2, spacecraft: 2, "earth-observation": 2 },
    contributionMUsd: 83, // budget: about US$1.5B, 2026-27
    perk: {
      name: "Frugal engineering",
      description: "ISRO's PSLV and LVM3 are built to a low price, with Chandrayaan-3 as the proof.",
      modifiers: [{ stat: "moduleCost", op: "mul", value: 0.85 }], // game value
    },
    priorities: { science: 0.3, safety: 0.2, cost: 0.5 }, // game value
    persona: "Practical and optimistic, loves doing more with less and says so with quiet pride.",
    sources: [wiki("Indian Space Research Organisation (budget, Chandrayaan-3)", "Indian_Space_Research_Organisation")],
    verified: false,
  },
  {
    id: "jaxa",
    kind: "agency",
    name: "Japan Aerospace Exploration Agency",
    shortName: "JAXA",
    country: "JP",
    flag: "🇯🇵",
    color: "#ff5c7a",
    tagline: "Pinpoint landing and precise sample return",
    highlights: [
      "SLIM landed about 55 m from its target, the first pinpoint Moon landing",
      "Annual budget about JPY 215.5 billion (JFY2023)",
      "H3 is its current launcher, built to be cheaper than H-IIA",
    ],
    capabilities: { landing: 3, spacecraft: 3, science: 2, launch: 2, robotics: 2 },
    contributionMUsd: 83, // budget: JPY 215.5B, JFY2023, about US$1.5B at ~144 JPY/USD (derived)
    perk: {
      name: "Pinpoint landing (SLIM)",
      description: "SLIM touched down about 55 m from its target using vision-based navigation.",
      modifiers: [{ stat: "landingReliability", op: "mul", value: 1.08 }], // game value
    },
    priorities: { science: 0.35, safety: 0.4, cost: 0.25 }, // game value
    persona: "Meticulous and polite, treats precision and testing as a point of craftsmanship.",
    sources: [wiki("JAXA (budget, SLIM landing accuracy)", "JAXA")],
    verified: false,
  },
  {
    id: "csa",
    kind: "agency",
    name: "Canadian Space Agency",
    shortName: "CSA",
    country: "CA",
    flag: "🇨🇦",
    color: "#e5484d",
    tagline: "Space robotics: Canadarm2 and Canadarm3",
    highlights: [
      "Canadarm2 works on the ISS, part of a C$1.3 billion mobile servicing system",
      "Committed C$2.05 billion over 24 years to Canadarm3 for Lunar Gateway",
      "Annual budget about CA$615 million (2023)",
    ],
    capabilities: { robotics: 3, "earth-observation": 2, science: 2 },
    contributionMUsd: 60, // budget: CA$615.4M (2023), about US$455M at 0.74 USD/CAD (derived)
    perk: {
      name: "Canadarm robotics",
      description: "Canadarm2 and Dextre are the arms that service the ISS.",
      modifiers: [{ stat: "scienceValue", op: "mul", value: 1.05, scope: { category: "rover" } }], // game value
    },
    priorities: { science: 0.4, safety: 0.3, cost: 0.3 }, // game value
    persona: "Friendly and collaborative, offers to lend a robotic hand and keeps things upbeat.",
    sources: [wiki("Canadian Space Agency (budget, Canadarm)", "Canadian_Space_Agency")],
    verified: false,
  },
  {
    id: "asi",
    kind: "agency",
    name: "Italian Space Agency",
    shortName: "ASI",
    country: "IT",
    flag: "🇮🇹",
    color: "#2fbf71",
    tagline: "ISS pressurized modules and radar Earth observation",
    highlights: [
      "Italian industry built Harmony, Tranquility and the Cupola for the ISS",
      "Columbus, the ISS laboratory, was built in Turin",
      "Budget about US$2.1 billion (2020, per Wikipedia)",
    ],
    capabilities: { habitat: 3, "earth-observation": 2, science: 2 },
    contributionMUsd: 90, // budget: about US$2.1B (2020), the page figure may include ESA payments
    perk: {
      name: "Pressurized modules",
      description: "Italy's industry built ISS modules such as Harmony and Tranquility.",
      modifiers: [{ stat: "moduleMass", op: "mul", value: 0.9, scope: { category: "habitat" } }], // game value
    },
    priorities: { science: 0.35, safety: 0.4, cost: 0.25 }, // game value
    persona: "Warm and proud of its engineering craft, likes a well-built habitat above all.",
    sources: [wiki("Italian Space Agency (budget, ISS modules)", "Italian_Space_Agency")],
    verified: false,
  },
  {
    id: "aeb",
    kind: "agency",
    name: "Brazilian Space Agency",
    shortName: "AEB",
    country: "BR",
    flag: "🇧🇷",
    color: "#f2d03b",
    tagline: "Equatorial launch site and Earth observation",
    highlights: [
      "Alcantara Launch Center sits close to the equator, good for geosynchronous launches",
      "SCD-1, an Earth observation satellite built in Brazil, has flown since 1993",
      "Budget about R$180 million, around US$45 million (2019)",
    ],
    capabilities: { launch: 1, "earth-observation": 2, "ground-segment": 1 },
    contributionMUsd: 20, // budget: R$180M, about US$45M, 2019 (formula gives below 20, clamped)
    perk: {
      name: "Equatorial launch site",
      description: "Alcantara is near the equator, so rockets get extra speed from Earth's rotation.",
      modifiers: [{ stat: "launchCapacity", op: "mul", value: 1.06 }], // game value
    },
    priorities: { science: 0.3, safety: 0.25, cost: 0.45 }, // game value
    persona: "Energetic and pragmatic, keen to make the most of a modest budget and a great launch site.",
    sources: [wiki("Brazilian Space Agency (budget, Alcantara, SCD1)", "Brazilian_Space_Agency")],
    verified: false,
  },
  {
    id: "kasa",
    kind: "agency",
    name: "Korea AeroSpace Administration",
    shortName: "KASA",
    country: "KR",
    flag: "🇰🇷",
    color: "#a78bfa",
    tagline: "Homegrown Nuri rocket and a new national agency",
    highlights: [
      "Established on 27 May 2024 under the Ministry of Science and ICT",
      "FY2026 budget: KRW 1.12 trillion, about US$749 million",
      "Nuri has reached orbit in 4 of 5 flights, the latest on 7 October 2026",
    ],
    capabilities: { launch: 2, spacecraft: 2, "earth-observation": 2 },
    contributionMUsd: 69, // budget: KRW 1.12T, about US$749M, FY2026
    perk: {
      name: "Nuri launcher",
      description: "Korea has its own launcher, Nuri, with 4 successes in 5 flights.",
      modifiers: [{ stat: "launchReliability", op: "mul", value: 1.03 }], // game value
    },
    priorities: { science: 0.3, safety: 0.3, cost: 0.4 }, // game value
    persona: "Fast-moving and ambitious, talks about iterating quickly while the agency is still young.",
    sources: [wiki("Korea AeroSpace Administration (budget, founding)", "Korea_AeroSpace_Administration"), wiki("Nuri (rocket) (flights)", "Nuri_(rocket)")],
    verified: false,
  },
  {
    id: "mbrsc",
    kind: "agency",
    name: "Mohammed Bin Rashid Space Centre",
    shortName: "MBRSC",
    country: "AE",
    flag: "🇦🇪",
    color: "#c084fc",
    tagline: "Mars orbiter Hope and the Rashid Moon rover",
    highlights: [
      "The Hope probe launched on 19 July 2020 and reached Mars in February 2021",
      "Rashid is the UAE's first lunar rover, built by MBRSC",
      "DubaiSat-1 launched on 29 July 2009, its first satellite",
    ],
    capabilities: { spacecraft: 2, "earth-observation": 2, robotics: 1 },
    contributionMUsd: 52, // estimate: no public budget found; assumed about US$300M a year, formula applied
    perk: {
      name: "Hope and Rashid heritage",
      description: "MBRSC built Hope for Mars and Rashid, a compact lunar rover.",
      modifiers: [{ stat: "scienceValue", op: "mul", value: 1.05, scope: { category: "rover" } }], // game value
    },
    priorities: { science: 0.45, safety: 0.25, cost: 0.3 }, // game value
    persona: "Bold and forward-looking, frames each goal as a stepping stone to something bigger.",
    sources: [wiki("Mohammed bin Rashid Space Centre (Hope, Rashid, DubaiSat-1)", "Mohammed_bin_Rashid_Space_Centre")],
    verified: false,
  },
  {
    id: "conae",
    kind: "agency",
    name: "Comision Nacional de Actividades Espaciales",
    shortName: "CONAE",
    country: "AR",
    flag: "🇦🇷",
    color: "#7dd3fc",
    tagline: "Radar Earth observation with SAOCOM",
    highlights: [
      "SAC-D/Aquarius, launched in 2011, measured ocean salinity with NASA",
      "SAOCOM 1A, an L-band radar satellite, launched on 8 October 2018",
      "Budget about ARS 7.46 billion, around US$77.5 million (2021)",
    ],
    capabilities: { "earth-observation": 2, spacecraft: 1, science: 1 },
    contributionMUsd: 25, // budget: ARS 7.458B, about US$77.5M, 2021
    perk: {
      name: "SAOCOM radar know-how",
      description: "CONAE flies L-band SAR satellites and works with NASA on missions like Aquarius.",
      modifiers: [{ stat: "scienceValue", op: "mul", value: 1.05, scope: { missionId: "earth-guardian" } }], // game value
    },
    priorities: { science: 0.4, safety: 0.3, cost: 0.3 }, // game value
    persona: "Thoughtful and data-driven, always links the mission back to useful Earth observation.",
    sources: [wiki("CONAE (budget, SAOCOM, SAC-D)", "Comisi%C3%B3n_Nacional_de_Actividades_Espaciales")],
    verified: false,
  },
  {
    id: "nasrda",
    kind: "agency",
    name: "National Space Research and Development Agency",
    shortName: "NASRDA",
    country: "NG",
    flag: "🇳🇬",
    color: "#34d399",
    tagline: "Disaster-monitoring satellites for Africa",
    highlights: [
      "NigeriaSat-1 launched on 27 September 2003",
      "It joined the international Disaster Monitoring Constellation",
      "Budget about NGN 22.7 billion (2023)",
    ],
    capabilities: { "earth-observation": 2, "ground-segment": 1 },
    contributionMUsd: 20, // budget: NGN 22.69B (2023), about US$49M (estimate of exchange rate), formula gives below 20, clamped
    perk: {
      name: "Disaster monitoring",
      description: "Nigeria has flown Earth-observation satellites for disaster response since 2003.",
      modifiers: [{ stat: "scienceValue", op: "mul", value: 1.05, scope: { missionId: "earth-guardian" } }], // game value
    },
    priorities: { science: 0.35, safety: 0.25, cost: 0.4 }, // game value
    persona: "Down-to-earth and community-minded, asks how the mission helps people on the ground.",
    sources: [wiki("NASRDA (budget, NigeriaSat-1)", "National_Space_Research_and_Development_Agency")],
    verified: false,
  },
  {
    id: "aep",
    kind: "agency",
    name: "Paraguayan Space Agency",
    shortName: "AEP",
    country: "PY",
    flag: "🇵🇾",
    color: "#fb7185",
    tagline: "Cubesat pioneer for a young space nation",
    highlights: [
      "GuaraniSat-1 is a Paraguayan cubesat that flew in 2021", // spec fact, page not opened
      "Builds national skills through small, student-friendly satellites", // spec fact
    ],
    capabilities: { "earth-observation": 1, funding: 1 },
    contributionMUsd: 20, // estimate: no public budget found, formula minimum applied
    perk: {
      name: "Regional funding",
      description: "A regional partner that brings a small cash contribution to the mission treasury.",
      modifiers: [{ stat: "treasury", op: "add", value: 15 }], // game value
    },
    priorities: { science: 0.3, safety: 0.2, cost: 0.5 }, // game value
    persona: "Enthusiastic newcomer, happy to learn from the others and eager to contribute.",
    sources: [agencyList],
    verified: false,
  },
  {
    id: "ases",
    kind: "agency",
    name: "Senegalese Space Studies Agency",
    shortName: "ASES",
    country: "SN",
    flag: "🇸🇳",
    color: "#facc15",
    tagline: "West Africa's first national satellite, GaindeSAT-1A",
    highlights: [
      "GaindeSAT-1A is Senegal's first national satellite", // spec fact, page not opened
      "Trains engineers and students through a national space program", // spec fact
    ],
    capabilities: { "earth-observation": 1, funding: 1 },
    contributionMUsd: 20, // estimate: no public budget found, formula minimum applied
    perk: {
      name: "Regional funding",
      description: "A regional partner that brings a small cash contribution to the mission treasury.",
      modifiers: [{ stat: "treasury", op: "add", value: 15 }], // game value
    },
    priorities: { science: 0.3, safety: 0.2, cost: 0.5 }, // game value
    persona: "Proud first-mover, speaks in clear, hopeful terms about what a small team can do.",
    sources: [agencyList],
    verified: false,
  },
  {
    id: "aee",
    kind: "agency",
    name: "Spanish Space Agency",
    shortName: "AEE",
    country: "ES",
    flag: "🇪🇸",
    color: "#fb923c",
    tagline: "Hosts NASA's Madrid deep space station",
    highlights: [
      "Operational since 20 April 2023",
      "Annual budget about EUR 700 million",
      "Madrid hosts a Deep Space Network complex of NASA", // spec fact
    ],
    capabilities: { "ground-segment": 3, comms: 2, "earth-observation": 1 },
    contributionMUsd: 70, // budget: EUR 700M, about US$760M at 1.08 USD/EUR (derived)
    perk: {
      name: "Madrid DSN complex",
      description: "NASA's Madrid Deep Space Communications Complex tracks probes for hours each day.",
      modifiers: [{ stat: "downlinkRate", op: "mul", value: 1.15 }], // game value
    },
    priorities: { science: 0.3, safety: 0.3, cost: 0.4 }, // game value
    persona: "Direct and sociable, loves talking about keeping a link to the spacecraft alive.",
    sources: [wiki("Spanish Space Agency (founding, budget)", "Spanish_Space_Agency")],
    verified: false,
  },
  {
    id: "tua",
    kind: "agency",
    name: "Turkish Space Agency",
    shortName: "TUA",
    country: "TR",
    flag: "🇹🇷",
    color: "#f87171",
    tagline: "Homegrown comms satellites and a Moon program",
    highlights: [
      "Turksat 6A, Turkey's first homegrown comms satellite, launched in 2024",
      "AYAP-1 lunar impactor is planned for 2027",
      "2026 budget about TRY 8.7 billion",
    ],
    capabilities: { comms: 2, spacecraft: 1, science: 1 },
    contributionMUsd: 44, // budget: TRY 8.7B (2026), about US$200M at ~43 TRY/USD (estimate of exchange rate)
    perk: {
      name: "Turksat 6A comms",
      description: "Turkey built and flies its own geostationary comms satellite.",
      modifiers: [{ stat: "downlinkRate", op: "mul", value: 1.05 }], // game value
    },
    priorities: { science: 0.3, safety: 0.25, cost: 0.45 }, // game value
    persona: "Confident and goal-driven, keen to prove national capability with concrete milestones.",
    sources: [wiki("Turkish Space Agency (budget, Turksat 6A, AYAP)", "Turkish_Space_Agency")],
    verified: false,
  },
  {
    id: "uksa",
    kind: "agency",
    name: "UK Space Agency",
    shortName: "UKSA",
    country: "GB",
    flag: "🇬🇧",
    color: "#60a5fa",
    tagline: "Small satellites, space applications and spaceports",
    highlights: [
      "Budget about GBP 618 million (2024/25)",
      "Government co-bought OneWeb in July 2020",
      "ESA's ECSAT centre sits at Harwell",
    ],
    capabilities: { spacecraft: 2, "earth-observation": 2, comms: 1 },
    contributionMUsd: 70, // budget: GBP 618.2M (2024/25), about US$790M at 1.28 USD/GBP (derived)
    perk: {
      name: "Small-sat industry",
      description: "UK industry builds small satellites and space applications at Harwell.",
      modifiers: [{ stat: "moduleCost", op: "mul", value: 0.95 }], // game value
    },
    priorities: { science: 0.35, safety: 0.3, cost: 0.35 }, // game value
    persona: "Dry-witted and pragmatic, favors small, clever solutions and a good business case.",
    sources: [wiki("UK Space Agency (budget, OneWeb, ECSAT)", "UK_Space_Agency")],
    verified: false,
  },
  {
    id: "ggpen",
    kind: "agency",
    name: "National Space Program Management Office",
    shortName: "GGPEN",
    country: "AO",
    flag: "🇦🇴",
    color: "#f59e0b",
    tagline: "Angola's own satellites for comms and Earth data",
    highlights: [
      "AngoSat-2 is Angola's national communications satellite", // spec fact, page not opened
      "Manages Angola's national space program", // spec fact
    ],
    capabilities: { comms: 1, funding: 1 },
    contributionMUsd: 20, // estimate: no public budget found, formula minimum applied
    perk: {
      name: "Regional funding",
      description: "A regional partner that brings a small cash contribution to the mission treasury.",
      modifiers: [{ stat: "treasury", op: "add", value: 15 }], // game value
    },
    priorities: { science: 0.25, safety: 0.25, cost: 0.5 }, // game value
    persona: "Steady and ambitious, focused on building long-term national capacity.",
    sources: [agencyList],
    verified: false,
  },
  {
    id: "nssa",
    kind: "agency",
    name: "National Space Science Agency",
    shortName: "NSSA",
    country: "BH",
    flag: "🇧🇭",
    color: "#e879f9",
    tagline: "Cubesats and space science in the Gulf",
    highlights: [
      "Set up by Royal Decree in 2014",
      "Light-1 is a Bahraini cubesat", // spec fact, page not opened
    ],
    capabilities: { "earth-observation": 1, funding: 1 },
    contributionMUsd: 20, // estimate: no public budget found, formula minimum applied
    perk: {
      name: "Local EO expertise",
      description: "Bahrain's agency trains local teams in Earth observation with small satellites.",
      modifiers: [{ stat: "scienceValue", op: "mul", value: 1.05 }], // game value
    },
    priorities: { science: 0.4, safety: 0.2, cost: 0.4 }, // game value
    persona: "Curious and concise, fond of small, well-built experiments.",
    sources: [wiki("Bahrain Space Agency (formerly NSSA, founded 2014)", "Bahrain_National_Space_Science_Agency")],
    verified: false,
  },

  // Companies. contributionMUsd is a game value for all of them.
  {
    id: "spacex",
    kind: "company",
    name: "Space Exploration Technologies Corp.",
    shortName: "SpaceX",
    country: "US",
    flag: "🇺🇸",
    color: "#e2e8f0",
    tagline: "Reusable rockets at the highest launch rate",
    highlights: [
      "Falcon 9: 699 successes in 702 launches (12 Nov 2026)",
      "Falcon Heavy: 14 launches, 14 successes",
      "Starship is a fully reusable design, 15 test flights so far",
    ],
    capabilities: { launch: 3, spacecraft: 3 },
    contributionMUsd: 120, // game value (kept below NASA so agencies lead the treasury)
    perk: {
      name: "Reusable boosters",
      description: "Falcon 9 boosters fly again and again, which cuts the price per launch.",
      modifiers: [{ stat: "launchCost", op: "mul", value: 0.75 }], // game value
    },
    priorities: { science: 0.2, safety: 0.2, cost: 0.6 }, // game value
    persona: "Fast and blunt, impatient with delay and always pushing to fly sooner.",
    sources: [wiki("Falcon 9", "Falcon_9"), wiki("Falcon Heavy", "Falcon_Heavy"), wiki("SpaceX Starship", "SpaceX_Starship")],
    verified: false,
  },
  {
    id: "blue-origin",
    kind: "company",
    name: "Blue Origin",
    shortName: "Blue Origin",
    country: "US",
    flag: "🇺🇸",
    color: "#38bdf8",
    tagline: "Heavy lift with the reusable New Glenn",
    highlights: [
      "New Glenn can lift 45 t to LEO in its 7x2 configuration",
      "Its first booster landing came on NG-2, which launched ESCAPADE (Nov 2025)",
      "Three New Glenn flights as of April 2026, two successes",
    ],
    capabilities: { launch: 3, landing: 1 },
    contributionMUsd: 100, // game value
    perk: {
      name: "New Glenn capacity",
      description: "New Glenn offers 45 t to LEO and 13.6 t to GTO.",
      modifiers: [{ stat: "launchCapacity", op: "mul", value: 1.05 }], // game value
    },
    priorities: { science: 0.3, safety: 0.4, cost: 0.3 }, // game value
    persona: "Calm and deliberate, talks about steady, step-by-step progress.",
    sources: [wiki("New Glenn", "New_Glenn")],
    verified: false,
  },
  {
    id: "rocket-lab",
    kind: "company",
    name: "Rocket Lab",
    shortName: "Rocket Lab",
    country: "US",
    flag: "🇺🇸",
    color: "#f43f5e",
    tagline: "Small launch and spacecraft buses on demand",
    highlights: [
      "Electron: 100 launches, 96 successes (includes HASTE)",
      "Electron price about US$7.5 million per launch",
      "Neutron is designed for 13 t to LEO, first launch now 2027",
    ],
    capabilities: { launch: 2, spacecraft: 2 },
    contributionMUsd: 90, // game value
    perk: {
      name: "Electron cadence",
      description: "Electron launches small payloads often and cheaply.",
      modifiers: [{ stat: "launchReliability", op: "mul", value: 1.02 }], // game value
    },
    priorities: { science: 0.25, safety: 0.3, cost: 0.45 }, // game value
    persona: "Upbeat and hands-on, loves to talk about cadence and getting small things done.",
    sources: [wiki("Electron (rocket)", "Electron_(rocket)"), wiki("Neutron (rocket)", "Neutron_(rocket)")],
    verified: false,
  },
  {
    id: "intuitive-machines",
    kind: "company",
    name: "Intuitive Machines",
    shortName: "Intuitive Machines",
    country: "US",
    flag: "🇺🇸",
    color: "#fbbf24",
    tagline: "Commercial lunar landers for NASA",
    highlights: [
      "IM-1 Odysseus landed on 22 February 2024, the first commercial Moon landing",
      "IM-2 Athena reached the surface on 6 March 2025 and tipped on its side",
      "Based in Houston, Texas; 2025 revenue US$292 million",
    ],
    capabilities: { landing: 2, spacecraft: 2 },
    contributionMUsd: 70, // game value
    perk: {
      name: "Nova-C landers",
      description: "Two Nova-C landers have touched down near the Moon's south pole region.",
      modifiers: [{ stat: "landingReliability", op: "mul", value: 1.05 }], // game value
    },
    priorities: { science: 0.3, safety: 0.3, cost: 0.4 }, // game value
    persona: "Candid about hard landings and always learning from the last flight.",
    sources: [wiki("Intuitive Machines", "Intuitive_Machines")],
    verified: false,
  },
  {
    id: "firefly",
    kind: "company",
    name: "Firefly Aerospace",
    shortName: "Firefly",
    country: "US",
    flag: "🇺🇸",
    color: "#f97316",
    tagline: "Blue Ghost, a fully successful commercial Moon landing",
    highlights: [
      "Blue Ghost M1 touched down on the Moon on 2 March 2025",
      "First commercial company with a fully successful lunar soft landing",
      "Alpha small launcher: 3 successes in 7 flights",
    ],
    capabilities: { landing: 3, launch: 1, spacecraft: 2 },
    contributionMUsd: 80, // game value
    perk: {
      name: "Blue Ghost lander",
      description: "Blue Ghost M1 made a picture-perfect landing on 2 March 2025.",
      modifiers: [{ stat: "landingReliability", op: "mul", value: 1.08 }], // game value
    },
    priorities: { science: 0.3, safety: 0.35, cost: 0.35 }, // game value
    persona: "Quietly proud of landing right the first time, keeps the tone lively.",
    sources: [wiki("Firefly Aerospace", "Firefly_Aerospace"), wiki("Firefly Alpha", "Firefly_Alpha")],
    verified: false,
  },
  {
    id: "astrobotic",
    kind: "company",
    name: "Astrobotic Technology",
    shortName: "Astrobotic",
    country: "US",
    flag: "🇺🇸",
    color: "#a3e635",
    tagline: "Lunar delivery with Peregrine and Griffin landers",
    highlights: [
      "Peregrine Mission One flew in January 2024", // spec fact, page not opened
      "Builds the larger Griffin lander for heavier cargo", // spec fact
    ],
    capabilities: { landing: 2, spacecraft: 1 },
    contributionMUsd: 60, // game value
    perk: {
      name: "Lunar delivery",
      description: "Astrobotic sells rides to the Moon for payloads under NASA contracts.",
      modifiers: [{ stat: "moduleMass", op: "mul", value: 0.95, scope: { category: "lander" } }], // game value
    },
    priorities: { science: 0.35, safety: 0.3, cost: 0.35 }, // game value
    persona: "Measured and open about technical issues, treats each Moon trip as a delivery job.",
    sources: [agencyList],
    verified: false,
  },
  {
    id: "ispace",
    kind: "company",
    name: "ispace",
    shortName: "ispace",
    country: "JP",
    flag: "🇯🇵",
    color: "#22d3ee",
    tagline: "Private lunar landers from Tokyo",
    highlights: [
      "Hakuto-R lander flew lunar landing attempts in 2023 and 2025", // spec fact, page not opened
      "Headquartered in Tokyo", // spec fact
    ],
    capabilities: { landing: 2, spacecraft: 1 },
    contributionMUsd: 50, // game value
    perk: {
      name: "Hakuto-R experience",
      description: "ispace has flown two lunar landing attempts and learned from each.",
      modifiers: [{ stat: "moduleCost", op: "mul", value: 0.95, scope: { category: "lander" } }], // game value
    },
    priorities: { science: 0.3, safety: 0.3, cost: 0.4 }, // game value
    persona: "Ambitious and reflective, talks about a lunar economy and learning from each attempt.",
    sources: [agencyList],
    verified: false,
  },
  {
    id: "axiom",
    kind: "company",
    name: "Axiom Space",
    shortName: "Axiom",
    country: "US",
    flag: "🇺🇸",
    color: "#c4b5fd",
    tagline: "Commercial habitats and private astronaut missions",
    highlights: [
      "Flies private astronaut missions to the ISS", // spec fact, page not opened
      "Is building commercial station modules and lunar spacesuits", // spec fact
    ],
    capabilities: { habitat: 2, spacecraft: 1 },
    contributionMUsd: 100, // game value
    perk: {
      name: "Habitat design",
      description: "Axiom designs commercial living and working modules for orbit.",
      modifiers: [{ stat: "moduleMass", op: "mul", value: 0.92, scope: { category: "habitat" } }], // game value
    },
    priorities: { science: 0.3, safety: 0.4, cost: 0.3 }, // game value
    persona: "Polished and customer-minded, talks about space as a place to live and work.",
    sources: [agencyList],
    verified: false,
  },
  {
    id: "sierra-space",
    kind: "company",
    name: "Sierra Space",
    shortName: "Sierra Space",
    country: "US",
    flag: "🇺🇸",
    color: "#fda4af",
    tagline: "Dream Chaser spaceplane and inflatable habitats",
    highlights: [
      "Builds Dream Chaser, a lifting-body cargo spaceplane", // spec fact, page not opened
      "Develops LIFE, an inflatable habitat", // spec fact
    ],
    capabilities: { habitat: 2, spacecraft: 2 },
    contributionMUsd: 90, // game value
    perk: {
      name: "Inflatable habitats",
      description: "Inflatable modules pack small for launch and expand in orbit.",
      modifiers: [{ stat: "moduleMass", op: "mul", value: 0.88, scope: { category: "habitat" } }], // game value
    },
    priorities: { science: 0.3, safety: 0.35, cost: 0.35 }, // game value
    persona: "Imaginative and design-led, likes clever ways to fold big things small.",
    sources: [agencyList],
    verified: false,
  },
  {
    id: "northrop-grumman",
    kind: "company",
    name: "Northrop Grumman",
    shortName: "Northrop Grumman",
    country: "US",
    flag: "🇺🇸",
    color: "#94a3b8",
    tagline: "Cygnus cargo ships and solid rocket motors",
    highlights: [
      "Cygnus cargo spacecraft resupply the ISS", // spec fact, page not opened
      "Builds the solid rocket boosters of NASA's SLS", // spec fact
    ],
    capabilities: { spacecraft: 3, launch: 2 },
    contributionMUsd: 160, // game value
    perk: {
      name: "Cygnus bus heritage",
      description: "Cygnus is a proven bus that carries cargo to orbit.",
      modifiers: [{ stat: "moduleMass", op: "mul", value: 0.95, scope: { category: "bus" } }], // game value
    },
    priorities: { science: 0.2, safety: 0.5, cost: 0.3 }, // game value
    persona: "Formal and thorough, a big-program contractor that checks every margin.",
    sources: [agencyList],
    verified: false,
  },
  {
    id: "thales-alenia-space",
    kind: "company",
    name: "Thales Alenia Space",
    shortName: "Thales Alenia",
    country: "FR",
    flag: "🇫🇷",
    color: "#818cf8",
    tagline: "Pressurized modules and satellites, built in Turin",
    highlights: [
      "Built the ISS modules Tranquility, Harmony and the Cupola as Alcatel Alenia Space",
      "Built ESA's Columbus laboratory in Turin",
    ],
    capabilities: { habitat: 3, spacecraft: 2, "earth-observation": 2 },
    contributionMUsd: 110, // game value
    perk: {
      name: "ISS module heritage",
      description: "Its Turin plant built several ISS pressurized modules.",
      modifiers: [{ stat: "moduleMass", op: "mul", value: 0.9, scope: { category: "habitat" } }], // game value
    },
    priorities: { science: 0.35, safety: 0.45, cost: 0.2 }, // game value
    persona: "Measured, safety-minded engineer who respects flight heritage.",
    sources: [wiki("Italian Space Agency (ISS modules built by Alcatel Alenia Space)", "Italian_Space_Agency")],
    verified: false,
  },
  {
    id: "airbus-defence-space",
    kind: "company",
    name: "Airbus Defence and Space",
    shortName: "Airbus DS",
    country: "DE",
    flag: "🇩🇪",
    color: "#2dd4bf",
    tagline: "Orion service module and big European satellites",
    highlights: [
      "Builds the European Service Module for NASA's Orion", // spec fact, page not opened
      "Builds large Earth-observation and science satellites", // spec fact
    ],
    capabilities: { spacecraft: 3, "earth-observation": 2, science: 2 },
    contributionMUsd: 130, // game value
    perk: {
      name: "European Service Module",
      description: "Airbus builds the service module that powers NASA's Orion in space.",
      modifiers: [{ stat: "powerGeneration", op: "mul", value: 1.08, scope: { category: "power" } }], // game value
    },
    priorities: { science: 0.35, safety: 0.4, cost: 0.25 }, // game value
    persona: "Methodical and international, speaks like an engineer coordinating many partners.",
    sources: [agencyList],
    verified: false,
  },
  {
    id: "iceye",
    kind: "company",
    name: "ICEYE",
    shortName: "ICEYE",
    country: "FI",
    flag: "🇫🇮",
    color: "#67e8f9",
    tagline: "SAR smallsats that see through clouds and night",
    highlights: [
      "ICEYE-X1 launched on 12 January 2018, the first SAR satellite under 100 kg",
      "62 satellites launched by 5 December 2025: the largest SAR constellation",
      "Sells radar imagery at up to 25 cm resolution",
    ],
    capabilities: { "earth-observation": 3, spacecraft: 2 },
    contributionMUsd: 60, // game value
    perk: {
      name: "SAR smallsats",
      description: "ICEYE shows that a radar imager can fit on a 70 kg class satellite.",
      modifiers: [{ stat: "moduleMass", op: "mul", value: 0.85, scope: { category: "instrument", missionId: "earth-guardian" } }], // game value
    },
    priorities: { science: 0.35, safety: 0.2, cost: 0.45 }, // game value
    persona: "Fast and data-focused, always asking how often it can revisit a place.",
    sources: [wiki("ICEYE", "ICEYE")],
    verified: false,
  },
  {
    id: "ula",
    kind: "company",
    name: "United Launch Alliance",
    shortName: "ULA",
    country: "US",
    flag: "🇺🇸",
    color: "#cbd5e1",
    tagline: "Vulcan Centaur for high-value missions",
    highlights: [
      "Vulcan with six solids lifts 14.5 t to GTO and 11.5 t to TLI",
      "RL10 engines on its upper stage have over 500 successful flights",
    ],
    capabilities: { launch: 3 },
    contributionMUsd: 120, // game value
    perk: {
      name: "Centaur upper stage",
      description: "Vulcan's Centaur V stage reaches high-energy orbits with room to spare.",
      modifiers: [{ stat: "launchReliability", op: "mul", value: 1.02 }], // game value
    },
    priorities: { science: 0.2, safety: 0.55, cost: 0.25 }, // game value
    persona: "Conservative and precise, famous for caring more about the right orbit than the fast launch.",
    sources: [{ title: "ULA Vulcan Centaur performance table", url: "https://www.ulalaunch.com/rockets/vulcan-centaur" }],
    verified: false,
  },
  /* Brazilian space companies (C7). Facts checked against the cited pages on 2026-11-15. */
  {
    id: "bizu-space",
    kind: "company",
    name: "Bizu Space",
    shortName: "Bizu",
    country: "BR",
    flag: "",
    color: "#22c55e",
    tagline: "Liquid rocket engines built in Brazil",
    highlights: [
      "Founded in 2023 in São José dos Campos, Brazil's aerospace hub",
      "Builds the liquid engine for the third stage of the Brazilian Microlauncher (MLBR)",
      "Flew FTL-Perseu, a liquid-propellant rocket, from Virgínia (Minas Gerais) on 29 May 2026",
    ],
    capabilities: { launch: 1 },
    contributionMUsd: 8, // game value: an early startup
    perk: {
      name: "Home-grown engines",
      description: "Bizu Space builds liquid rocket engines in Brazil, for the national microlauncher's upper stage.",
      modifiers: [{ stat: "launchCost", op: "mul", value: 0.98 }], // game value
    },
    priorities: { science: 0.2, safety: 0.3, cost: 0.5 }, // game value
    persona: "A young engine team, proud of its test fires and always counting the cost per kilogram.",
    sources: [
      { title: "NewSpace Tracker: Bizu Space (founded 2023; MLBR third-stage liquid engine)", url: "https://newspacetracker.com/company/bizu-space/" },
      { title: "Metrópoles: Bizu Space flies FTL-Perseu, a liquid-propellant rocket, 29 May 2026", url: "https://metropoles.com/sao-paulo/brasil-1o-foguete-propulsao-liquida" },
      { title: "Bizu Space", url: "https://bizu.space/en" },
    ],
    verified: false,
  },
  {
    id: "visiona",
    kind: "company",
    name: "Visiona Tecnologia Espacial",
    shortName: "Visiona",
    country: "BR",
    flag: "",
    color: "#38bdf8",
    tagline: "Brazil's satellite integrator, an Embraer and Telebras venture",
    highlights: [
      "Founded in 2012 by Embraer and Telebras, based in São José dos Campos",
      "Brazilian integrator of SGDC, the national defense and communications satellite",
      "VCUB1, launched 15 April 2023, is the first Earth observation satellite fully designed in Brazil",
    ],
    capabilities: { spacecraft: 2, "earth-observation": 1, comms: 1 },
    contributionMUsd: 15, // game value
    perk: {
      name: "Small-satellite integrator",
      description: "Visiona designed and integrated VCUB1, so bus integration costs less with it on the team.",
      modifiers: [{ stat: "moduleCost", op: "mul", value: 0.95, scope: { category: "bus" } }], // game value
    },
    priorities: { science: 0.3, safety: 0.35, cost: 0.35 }, // game value
    persona: "A careful systems integrator who thinks in requirements, margins and who flies the satellite after launch.",
    sources: [
      { title: "NewSpace Tracker: Visiona (Embraer and Telebras joint venture, 2012, SGDC integrator)", url: "https://newspacetracker.com/company/visiona-tecnologia-espacial/" },
      { title: "Embraer: Visiona and VCUB1, the first Earth observation satellite fully designed in Brazil", url: "https://www.embraer.com/defense-security-space/overview/en" },
      { title: "Teletime: VCUB1 launched on Falcon 9 from Vandenberg, 15 April 2023", url: "https://teletime.com.br/17/04/2023/desenvolvido-no-brasil-satelite-de-observacao-da-visiona-e-lancado-com-sucesso/" },
    ],
    verified: false,
  },
];
