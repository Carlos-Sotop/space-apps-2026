import type { Module, Source } from "@/engine/types";

// Shared sources. Search-result snippets were read for every URL below; see report for what each one states.
const S_EXPRESS: Source = { title: "NASA EXPRESS rack fact sheet (2000 W, 28 Vdc, 100 Mbps hub)", url: "https://nasa.engr.uky.edu/wp-content/uploads/2024/01/ISS_expressrack.pdf" };
const S_EXPRESS2: Source = { title: "NASA NTRS: ISS payload accommodations and iPEHG upgrade to 100 Mbps", url: "https://ntrs.nasa.gov/api/citations/20190028718/downloads/20190028718.pdf" };
const S_ISSACC: Source = { title: "NASA ISS Capabilities and Payload Accommodations", url: "https://science.nasa.gov/wp-content/uploads/2023/04/ISS_Accom_110612.pdf" };
const S_DRAGON: Source = { title: "SpaceX Dragon: 6,000 kg up, 3,000 kg down", url: "https://www.spacex.com/vehicles/cargo" };
const S_DRAGON_NASA: Source = { title: "NASA CRS-21 mission overview (Cargo Dragon 2)", url: "https://www.nasa.gov/wp-content/uploads/2020/12/spacex_crs-21_mision_overview_high_res_0.pdf" };
const S_CYGNUS: Source = { title: "Cygnus spacecraft (Enhanced: 3,500 kg payload, 1,800 kg dry)", url: "https://en.wikipedia.org/wiki/Cygnus_(spacecraft)" };
const S_CYGNUS2: Source = { title: "SatNews: Cygnus pressurized cargo modules (3,750 kg, 27 m3)", url: "https://satnews.com/2024/03/28/northrop-grummans-cygnus-pressurized-cargo-modules-completed-by-thales-alenia-space/" };
const S_HTVX: Source = { title: "JAXA HTV-X: pressurized 4,070 kg, unpressurized 1,750 kg", url: "https://humans-in-space.jaxa.jp/en/htv-x/" };
const S_DC: Source = { title: "eoPortal: Dream Chaser (5,500 kg upmass target)", url: "https://directory.eoportal.org/other-space-activities/dream-chaser" };
const S_VEGGIE: Source = { title: "NASA Veggie fact sheet (about 70 W)", url: "https://www.nasa.gov/wp-content/uploads/2019/04/veggie_fact_sheet_508.pdf" };
const S_VEGGIE2: Source = { title: "Vegetable Production System (Veggie), module under 8 kg", url: "https://en.wikipedia.org/wiki/Vegetable_Production_System" };
const S_CAL: Source = { title: "NASA JPL Cold Atom Lab: what we do", url: "https://coldatomlab.jpl.nasa.gov/what-we-do" };
const S_BIOMON: Source = { title: "CSA Bio-Monitor: keeping an eye on astronauts' vital signs", url: "https://asc-csa.gc.ca/eng/sciences/astroskin.asp" };
const S_DOSIS: Source = { title: "DOSIS 3D radiation measurements in Columbus (DLR/Kiel)", url: "https://elib.dlr.de/125417/1/ME-SBA-2018-Berger%20WRMISS%202018_DOSIS%203D.pdf" };
const S_ZBLAN: Source = { title: "ISS National Lab: exotic glass fibers from space (ZBLAN)", url: "https://issnationallab.org/?p=35108" };
const S_NISAR: Source = { title: "NASA JPL NISAR quick facts", url: "https://www.jpl.nasa.gov/press-kits/nisar/quick-facts/" };
const S_NISAR2: Source = { title: "NASA NISAR mission by the numbers (80 TB per day)", url: "https://science.nasa.gov/blogs/nisar/2025/07/30/nasa-isros-nisar-mission-by-the-numbers" };
const S_SAOCOM: Source = { title: "ESA EO Gateway: SAOCOM (L-band SAR, 6.7 kW peak)", url: "https://dragon3.esa.int/eogateway/missions/saocom" };
const S_ICEYE: Source = { title: "ESA EO Gateway: ICEYE (85 kg)", url: "https://earth.esa.int/eogateway/missions/iceye/description" };
const S_ICEYE2: Source = { title: "eoPortal: ICEYE constellation (X-band 140 Mbit/s)", url: "https://www.eoportal.org/satellite-missions/iceye-constellation" };
const S_ECOSTRESS: Source = { title: "eoPortal: ECOSTRESS (about 527 W, 2.3 Mbit/s average)", url: "https://eoportal.org/satellite-missions/iss-ecostress" };
const S_TBIRD: Source = { title: "NASA NTRS: TBIRD 200 Gbps laser downlink from a CubeSat", url: "https://ntrs.nasa.gov/api/citations/20230000434/downloads/Schieler%20paper%20spie2023-tbird-v4.pdf" };
const S_TBIRD2: Source = { title: "NASA NTRS: TBIRD mission overview", url: "https://ntrs.nasa.gov/citations/20230007959" };
const S_PHISAT: Source = { title: "Via Satellite: Intel powers first satellite with onboard AI (PhiSat-1)", url: "https://www.satellitetoday.com/technology/2020/10/22/intel-provides-smarts-for-first-satellite-with-local-ai-processing-on-board" };
const S_BG: Source = { title: "NASA CLPS Firefly Blue Ghost Mission One press kit", url: "https://www.nasa.gov/wp-content/uploads/2025/01/np-2025-01-001-jsc-clps-firefly-press-kit-screen-508-1-10-25-final.pdf" };
const S_BG2: Source = { title: "NASA APPEL: CLPS mission heads for vast basalt plain (Blue Ghost)", url: "https://appel.nasa.gov/2025/01/22/clps-mission-heads-for-vast-basalt-plain/" };
const S_BG3: Source = { title: "Blue Ghost Mission 1 (mass, power)", url: "https://en.wikipedia.org/wiki/Blue_Ghost_Mission_1" };
const S_IM2: Source = { title: "NASA CLPS IM-2 (Intuitive Machines-2) press kit", url: "https://www.nasa.gov/wp-content/uploads/2025/02/np-2025-02-005-jsc-clps-intuitive-machines-press-kit-508-2-25-25.pdf" };
const S_IM2B: Source = { title: "NASA: Intuitive Machines mission lands near south pole", url: "https://www.nasa.gov/blogs/missions/2025/03/06/intuitive-machines-mission-lands-near-south-pole-carrying-nasa-science/" };
const S_GRIFFIN: Source = { title: "Astrobotic: Griffin lander (625 kg to the surface)", url: "https://astrobotic.com/" };
const S_GRIFFIN2: Source = { title: "NASA CLPS Astrobotic press kit", url: "https://www.nasa.gov/wp-content/uploads/2023/12/np-2023-12-017-jsc-clps-astrobotic-press-kit-update-508.pdf" };
const S_BLUEMOON: Source = { title: "Blue Origin Blue Moon Mark 1 (3 t to the surface)", url: "https://www.blueorigin.com/blue-moon/mark-1" };
const S_PRIME1: Source = { title: "NASA: lunar drill technology passes tests on the Moon (PRIME-1)", url: "https://www.nasa.gov/missions/artemis/clps/nasas-lunar-drill-technology-passes-tests-on-the-moon/" };
const S_PRIME1B: Source = { title: "NASA Science: PRIME-1 on IM-2", url: "https://science.nasa.gov/lunar-science/clps-deliveries/prime-1-im" };
const S_VSAT: Source = { title: "NASA NTRS: VSAT vertical solar array, GCD annual review 2023", url: "https://ntrs.nasa.gov/api/citations/20230012849/downloads/GCD%20Annual%20Review%20VSAT%20September%202023%20Final.pdf" };
const S_LUNPOWER: Source = { title: "NASA NTRS: Electric power on the lunar surface", url: "https://ntrs.nasa.gov/api/citations/20240013588/downloads/Csank_Pr_LunarSurfacePower_APETS_MIT_20240013588.pdf" };
const S_RHU: Source = { title: "NASA NTRS: radioisotope power systems (RHU about 1 W thermal)", url: "https://ntrs.nasa.gov/api/citations/20240012942/downloads/FINAL_RPS_IEEE_Paper_2025_draft_v6_clean.pdf" };
const S_RASHID: Source = { title: "ESA: Rashid rover (about 10 kg)", url: "https://www.esa.int/ESA_Multimedia/Images/2022/12/Rashid_rover" };
const S_VIPER: Source = { title: "NASA NTRS: VIPER mobility hardware (roving mass 447 kg)", url: "https://ntrs.nasa.gov/api/citations/20240013903/downloads/LSIC_2024-Tech%20Infusion_Panel-VIPER_Mob-HW.pdf" };
const S_LEMS: Source = { title: "NASA TFAWS: Lunar Environment Monitoring Station (35 kg, about 3 W)", url: "https://tfaws.nasa.gov/wp-content/uploads/TFAWS23-ID-4-Presentation.pdf" };
const S_NOKIA: Source = { title: "Nokia: cellular network ready for the Moon (IM-2)", url: "https://www.nokia.com/about-us/news/releases/2025/01/07/nokias-cellular-network-ready-for-moon-as-intuitive-machines-completes-final-lunar-lander-installation/" };
const S_SSTL: Source = { title: "SSTL Lunar Mission Services (Lunar Pathfinder)", url: "https://sstl.co.uk/what-we-do/lunar-mission-services" };
const S_DTN: Source = { title: "NASA NTRS: Delay/Disruption Tolerant Networking for the ISS", url: "https://ntrs.nasa.gov/api/citations/20160014037/downloads/20160014037.pdf" };
const S_DTN2: Source = { title: "NASA NTRS: NASA delay tolerant networks, operational and evolving", url: "https://ntrs.nasa.gov/api/citations/20230001324/downloads/Paper%20-%20NASA%20Delay%20Tolerant%20Networks%20Operational%20Eveolving%20and%20ready%20for%20expansion%20-%20FINAL-Final.pdf" };
const S_FIPS203: Source = { title: "NIST FIPS 203: ML-KEM", url: "https://csrc.nist.gov/pubs/fips/203/final" };
const S_FIPS204: Source = { title: "NIST FIPS 204: ML-DSA", url: "https://csrc.nist.gov/pubs/fips/204/final" };

export const modules: Module[] = [
  /* ============================ ORBITAL LAB ============================ */

  // Carriers. massKg = vehicle mass the launcher must lift (without cargo). Costs are game estimates.
  {
    id: "ol-cargo-dragon",
    name: "Cargo Dragon 2",
    category: "bus",
    tier: "advanced",
    massKg: 4200, // estimate: capsule plus trunk dry mass, about 4.2 t; SpaceX page gives cargo only
    powerW: 0, // game value: the station supplies power once docked
    costMUsd: 90, // estimate: game value, below the real per-flight CRS price
    reliability: 0.98, // game value: no Cargo Dragon 2 loss in the CRS flight record read
    providerId: "spacex",
    heritage: "SpaceX CRS-21 onward",
    payloadCapacityKg: 6000, // sourced: 6,000 kg up, shared by pressurized and trunk
    satisfies: [],
    blurb: "Most cargo up to the station. Pressurized capsule plus open trunk.",
    sources: [S_DRAGON, S_DRAGON_NASA],
    verified: false,
  },
  {
    id: "ol-cygnus",
    name: "Enhanced Cygnus",
    category: "bus",
    tier: "basic",
    massKg: 1800, // sourced: dry mass 1,800 kg (secondary source)
    powerW: 0, // game value
    costMUsd: 75, // estimate: game value
    reliability: 0.95, // game value: one Antares launch loss in 2014, later flights fine
    providerId: "northrop-grumman",
    heritage: "Northrop Grumman NG-series Enhanced Cygnus with Thales Alenia Space cargo module",
    payloadCapacityKg: 3500, // sourced: 3,500 kg (3,750 kg quoted by another outlet)
    satisfies: [],
    blurb: "Cheaper carrier for smaller loads. Burns up after unberthing.",
    sources: [S_CYGNUS, S_CYGNUS2],
    verified: false,
  },
  {
    id: "ol-htv-x",
    name: "HTV-X",
    category: "bus",
    tier: "advanced",
    massKg: 10000, // estimate: about 16 t launch mass at full load minus 5.8 t cargo, from memory of JAXA data; not opened
    powerW: 0, // game value
    costMUsd: 110, // estimate: game value
    reliability: 0.95, // game value: HTV-X1 flew; HTV heritage record was clean
    providerId: "jaxa",
    heritage: "JAXA HTV-X1, successor to the HTV Kounotori",
    payloadCapacityKg: 5820, // derived: 4,070 kg pressurized + 1,750 kg unpressurized, JAXA page
    satisfies: [],
    blurb: "Big Japanese freighter. Flies on H3 and carries large external cargo.",
    sources: [S_HTVX],
    verified: false,
  },
  {
    id: "ol-dream-chaser",
    name: "Dream Chaser Tenacity",
    category: "bus",
    tier: "advanced",
    massKg: 9000, // estimate: spaceplane plus Shooting Star module, not found in sources
    powerW: 0, // game value
    costMUsd: 130, // estimate: game value
    reliability: 0.88, // game value: new vehicle with a thin flight record
    providerId: "sierra-space",
    heritage: "Sierra Space Dream Chaser cargo system",
    payloadCapacityKg: 5500, // sourced: long-standing 5,500 kg upmass target; some sources differ
    satisfies: [],
    blurb: "Spaceplane with gentle runway return. Good for fragile samples.",
    sources: [S_DC],
    verified: false,
  },

  // Experiments. Mass, power and data are estimates scaled from facility class unless a source is named.
  {
    id: "ol-combustion",
    name: "Flame chamber",
    category: "experiment",
    tier: "advanced",
    massKg: 120, // estimate: rack-scale combustion chamber, scaled from CIR / FLEX class
    powerW: 600, // estimate: within the 2,000 W EXPRESS rack limit
    costMUsd: 18, // game value
    dataGbPerDay: 120, // estimate: high-speed flame video
    scienceValue: 120, // game value
    reliability: 0.94,
    providerId: "nasa",
    heritage: "NASA Combustion Integrated Rack, FLEX and Saffire fire experiments",
    satisfies: ["ol-fire-safety"],
    blurb: "Burns small flames in microgravity to learn how fires behave.",
    sources: [S_EXPRESS, S_ISSACC],
    verified: false,
  },
  {
    id: "ol-biomonitor",
    name: "Health monitoring wearable",
    category: "experiment",
    tier: "basic",
    massKg: 3, // estimate: shirt, sensors and battery pack
    powerW: 2, // estimate: small battery pack, swapped every 48 h
    costMUsd: 3, // game value
    dataGbPerDay: 0.5, // estimate
    scienceValue: 80, // game value
    reliability: 0.97,
    providerId: "csa",
    heritage: "CSA Bio-Monitor (Astroskin) smart shirt",
    satisfies: ["ol-health"],
    blurb: "Smart shirt tracks pulse, breathing, temperature and oxygen.",
    sources: [S_BIOMON],
    verified: false,
  },
  {
    id: "ol-dosimetry",
    name: "Radiation dosimeter",
    category: "experiment",
    tier: "basic",
    massKg: 25, // estimate: two silicon telescopes plus data and power unit, scaled
    powerW: 20, // estimate
    costMUsd: 6, // game value
    dataGbPerDay: 0.2, // estimate
    scienceValue: 60, // game value
    reliability: 0.97,
    providerId: "esa",
    heritage: "ESA/DLR DOSIS 3D in Columbus and NASA ISS-RAD",
    satisfies: ["ol-health"],
    blurb: "Counts cosmic radiation that crew and cells receive on board.",
    sources: [S_DOSIS],
    verified: false,
  },
  {
    id: "ol-plant-chamber",
    name: "Plant growth chamber",
    category: "experiment",
    tier: "basic",
    massKg: 8, // sourced (secondary): Veggie module under 8 kg
    powerW: 70, // sourced: NASA Veggie fact sheet
    costMUsd: 8, // game value
    dataGbPerDay: 30, // estimate: daily plant imaging
    scienceValue: 100, // game value
    reliability: 0.96,
    providerId: "nasa",
    heritage: "NASA Veggie and Advanced Plant Habitat",
    satisfies: ["ol-plants"],
    blurb: "Grows lettuce and radish to test food for long missions.",
    sources: [S_VEGGIE, S_VEGGIE2],
    verified: false,
  },
  {
    id: "ol-protein-crystal",
    name: "Protein crystal growth",
    category: "experiment",
    tier: "basic",
    massKg: 40, // estimate: incubator plus cassettes
    powerW: 100, // estimate
    costMUsd: 5, // game value
    dataGbPerDay: 0.1, // estimate
    scienceValue: 70, // game value
    reliability: 0.97,
    heritage: "ISS National Lab protein crystallization payloads",
    satisfies: [],
    blurb: "Grows cleaner crystals for drug design.",
    sources: [S_ISSACC],
    verified: false,
  },
  {
    id: "ol-bioprinter",
    name: "3D bioprinter",
    category: "experiment",
    tier: "advanced",
    massKg: 150, // estimate: printer plus bioreactor cassette
    powerW: 350, // estimate
    costMUsd: 25, // game value
    dataGbPerDay: 60, // estimate: print camera video
    scienceValue: 130, // game value
    reliability: 0.92,
    heritage: "Redwire/Techshot BioFabrication Facility on the ISS",
    satisfies: [],
    blurb: "Prints tissue with living cells. Gravity does not collapse it.",
    sources: [S_ISSACC],
    verified: false,
  },
  {
    id: "ol-fiber",
    name: "Optical fiber furnace",
    category: "experiment",
    tier: "advanced",
    massKg: 100, // estimate
    powerW: 500, // estimate
    costMUsd: 12, // game value
    dataGbPerDay: 0.3, // estimate
    scienceValue: 100, // game value
    reliability: 0.93,
    heritage: "Flawless Photonics ZBLAN fiber draw on the ISS (about 12 km drawn)",
    satisfies: ["ol-manufacturing"],
    blurb: "Draws ZBLAN glass fiber with fewer flaws than on Earth.",
    sources: [S_ZBLAN],
    verified: false,
  },
  {
    id: "ol-cold-atom",
    name: "Cold atom lab",
    category: "experiment",
    tier: "advanced",
    massKg: 250, // estimate: about mini-fridge size, quad locker; no mass found
    powerW: 300, // estimate
    costMUsd: 40, // game value
    dataGbPerDay: 40, // estimate
    scienceValue: 160, // game value
    reliability: 0.93,
    providerId: "nasa",
    heritage: "NASA JPL Cold Atom Lab",
    satisfies: [],
    blurb: "Chills atoms near absolute zero to test quantum sensors.",
    sources: [S_CAL],
    verified: false,
  },

  // Support: the station supplies power and the data path.
  {
    id: "ol-iss-link",
    name: "ISS data link (Ku-band via TDRS)",
    category: "comms",
    tier: "basic",
    massKg: 5, // estimate: interface kit
    powerW: 30, // estimate
    costMUsd: 4, // game value: integration fee
    downlinkGbPerDay: 690, // derived: 8 Mbps science share x 86,400 s = 691 Gb/day; rack hub allows 100 Mbps
    reliability: 0.97,
    linkFractionBonus: 0.03, // game value
    heritage: "ISS payload Ku-band return link through TDRS",
    blurb: "Shares the station's Ku-band link. Data volume is capped.",
    sources: [S_EXPRESS, S_EXPRESS2],
    verified: false,
  },
  {
    id: "ol-iss-power",
    name: "ISS power allocation",
    category: "power",
    tier: "basic",
    massKg: 5, // estimate: interface kit
    powerW: 0,
    generatesW: 2000, // sourced: EXPRESS rack 2,000 W, 28 Vdc
    costMUsd: 4, // game value: integration fee
    reliability: 0.99,
    sunlightIndependent: true,
    heritage: "ISS EXPRESS rack power",
    blurb: "The station supplies 2 kW per rack in light and in eclipse.",
    sources: [S_EXPRESS, S_EXPRESS2],
    verified: false,
  },

  /* ============================ EARTH GUARDIAN ============================ */

  // Buses
  {
    id: "eg-bus-small",
    name: "Small satellite bus (about 130 kg total)",
    category: "bus",
    tier: "basic",
    massKg: 50, // estimate: ICEYE class satellites are 85 kg all-in
    powerW: 15, // game value
    costMUsd: 8, // game value
    reliability: 0.93, // game value
    heritage: "ICEYE-class 85 kg microsatellite bus",
    payloadCapacityKg: 80, // estimate: total about 130 kg
    blurb: "Fits small rockets. Little room for payload.",
    sources: [S_ICEYE],
    verified: false,
  },
  {
    id: "eg-bus-medium",
    name: "Medium satellite bus (about 500 kg total)",
    category: "bus",
    tier: "advanced",
    massKg: 220, // estimate
    powerW: 60, // game value
    costMUsd: 30, // game value
    reliability: 0.96, // game value
    heritage: "Mid-size Earth observation bus class",
    payloadCapacityKg: 280, // estimate: total about 500 kg
    blurb: "Room for a big radar. Needs a bigger rocket.",
    sources: [S_ICEYE],
    verified: false,
  },

  // Instruments. Data rates are game-scaled from real instruments, see notes.
  {
    id: "eg-lsar",
    name: "L-band SAR",
    category: "instrument",
    tier: "advanced",
    massKg: 180, // estimate: compact phased array, far smaller than NISAR's 12 m reflector
    powerW: 400, // estimate: average, not peak
    costMUsd: 55, // game value
    dataGbPerDay: 1500, // game value: NISAR makes about 35 TB/day (explainer figure), scaled down for a compact duty-cycled radar
    scienceValue: 170, // game value
    reliability: 0.92,
    providerId: "conae",
    heritage: "NISAR L-SAR and CONAE SAOCOM",
    satisfies: ["eg-flood", "eg-crops"],
    blurb: "Sees through clouds and canopy. Flood, soil moisture, biomass.",
    sources: [S_NISAR, S_NISAR2, S_SAOCOM],
    verified: false,
  },
  {
    id: "eg-ssar",
    name: "S-band SAR",
    category: "instrument",
    tier: "advanced",
    massKg: 120, // estimate
    powerW: 300, // estimate
    costMUsd: 40, // game value
    dataGbPerDay: 700, // game value: scaled from NISAR S-band share, see eg-lsar
    scienceValue: 140, // game value
    reliability: 0.92,
    providerId: "isro",
    heritage: "NISAR S-SAR built by ISRO",
    satisfies: ["eg-flood", "eg-crops"],
    blurb: "Radar tuned to crops and vegetation. Pairs well with L-band.",
    sources: [S_NISAR, S_NISAR2],
    verified: false,
  },
  {
    id: "eg-xsar",
    name: "Small X-band SAR",
    category: "instrument",
    tier: "basic",
    massKg: 40, // estimate: payload share of an 85 kg ICEYE-class satellite
    powerW: 250, // estimate: average over duty cycle
    costMUsd: 18, // game value
    dataGbPerDay: 200, // estimate: about 140 Mbit/s downlink, a few passes a day
    scienceValue: 90, // game value
    reliability: 0.94,
    providerId: "iceye",
    heritage: "ICEYE X-band SAR microsatellites",
    satisfies: ["eg-flood", "eg-ships"],
    blurb: "High-detail radar from a small satellite. Good for floods and ships.",
    sources: [S_ICEYE, S_ICEYE2],
    verified: false,
  },
  {
    id: "eg-thermal-ir",
    name: "Thermal infrared fire imager",
    category: "instrument",
    tier: "advanced",
    massKg: 60, // estimate: ECOSTRESS is 266 to 490 kg depending on basis; scaled to a small-sat radiometer
    powerW: 90, // estimate: ECOSTRESS draws about 527 W; scaled down
    costMUsd: 22, // game value
    dataGbPerDay: 150, // estimate: ECOSTRESS averages 2.3 Mbit/s (about 200 Gb/day); VIIRS-class swath is larger
    scienceValue: 120, // game value
    reliability: 0.93,
    providerId: "nasa",
    heritage: "VIIRS fire detection and ECOSTRESS thermal radiometer",
    satisfies: ["eg-wildfire"],
    blurb: "Finds wildfire hotspots by their heat, day and night.",
    sources: [S_ECOSTRESS],
    verified: false,
  },
  {
    id: "eg-msi",
    name: "Multispectral imager",
    category: "instrument",
    tier: "basic",
    massKg: 70, // estimate: Landsat OLI and Sentinel-2 MSI class, scaled
    powerW: 80, // estimate
    costMUsd: 25, // game value
    dataGbPerDay: 500, // game value: scaled from Sentinel-2 class output
    scienceValue: 110, // game value
    reliability: 0.95,
    providerId: "esa",
    heritage: "Landsat OLI and Sentinel-2 MSI",
    satisfies: ["eg-crops"],
    blurb: "Colour and infrared pictures for crops, water and burn scars.",
    sources: [S_ECOSTRESS],
    verified: false,
  },
  {
    id: "eg-ais",
    name: "AIS ship receiver",
    category: "instrument",
    tier: "basic",
    massKg: 2, // estimate
    powerW: 5, // estimate
    costMUsd: 2, // game value
    dataGbPerDay: 0.05, // estimate: text messages only
    scienceValue: 40, // game value
    reliability: 0.97,
    heritage: "Space-based AIS receivers on small satellites",
    satisfies: ["eg-ships"],
    blurb: "Listens to ship transponders. Cheap and light on data.",
    sources: [S_ICEYE],
    verified: false,
  },

  // Power
  {
    id: "eg-array-small",
    name: "Solar arrays, 300 W",
    category: "power",
    tier: "basic",
    massKg: 12, // estimate
    powerW: 0,
    generatesW: 300, // estimate
    costMUsd: 2, // game value
    reliability: 0.97,
    heritage: "Deployable panels on 100 kg class satellites",
    blurb: "Light panels for small buses.",
    sources: [S_ICEYE],
    verified: false,
  },
  {
    id: "eg-array-large",
    name: "Solar arrays, 1,200 W",
    category: "power",
    tier: "advanced",
    massKg: 45, // estimate
    powerW: 0,
    generatesW: 1200, // estimate
    costMUsd: 6, // game value
    reliability: 0.95, // game value: bigger wings, more to go wrong at deployment
    heritage: "Deployable wings on 500 kg class satellites",
    blurb: "Big wings for radar. Heavier, and a bigger deployment risk.",
    sources: [S_ICEYE],
    verified: false,
  },
  {
    id: "eg-batt-small",
    name: "Li-ion pack, 500 Wh",
    category: "battery",
    tier: "basic",
    massKg: 5, // estimate: about 100 Wh/kg at pack level
    powerW: 0,
    storageWh: 500, // estimate
    costMUsd: 0.8, // game value
    reliability: 0.98,
    heritage: "Li-ion packs on small satellites",
    blurb: "Covers short eclipses on a small satellite.",
    sources: [S_ICEYE],
    verified: false,
  },
  {
    id: "eg-batt-large",
    name: "Li-ion pack, 2,000 Wh",
    category: "battery",
    tier: "advanced",
    massKg: 18, // estimate
    powerW: 0,
    storageWh: 2000, // estimate
    costMUsd: 2.5, // game value
    reliability: 0.98,
    heritage: "Li-ion packs on mid-size satellites",
    blurb: "Runs radar through eclipse. Needed away from dawn-dusk.",
    sources: [S_ICEYE],
    verified: false,
  },

  // Comms. Downlink Gb/day = rate x pass time x passes, see notes.
  {
    id: "eg-sband",
    name: "S-band TT&C radio",
    category: "comms",
    tier: "basic",
    massKg: 3, // estimate
    powerW: 15, // estimate
    costMUsd: 1.5, // game value
    downlinkGbPerDay: 8, // estimate: about 2 Mbit/s over ~4 passes of 10 min
    reliability: 0.98,
    linkFractionBonus: 0.03, // game value
    heritage: "Standard small satellite telemetry and command radio",
    blurb: "Commands and health data. Too slow for pictures.",
    sources: [S_ICEYE2],
    verified: false,
  },
  {
    id: "eg-xband",
    name: "X-band downlink",
    category: "comms",
    tier: "basic",
    massKg: 6, // estimate
    powerW: 40, // estimate
    costMUsd: 3, // game value
    downlinkGbPerDay: 330, // derived: 140 Mbit/s x 600 s x 4 passes = 336 Gb, ICEYE constellation page
    reliability: 0.96,
    linkFractionBonus: 0.04, // game value
    heritage: "ICEYE X-band downlink, 140 Mbit/s",
    blurb: "Workhorse image downlink. Enough for one radar, not two.",
    sources: [S_ICEYE2],
    verified: false,
  },
  {
    id: "eg-kaband",
    name: "Ka-band downlink",
    category: "comms",
    tier: "advanced",
    massKg: 9, // estimate
    powerW: 60, // estimate
    costMUsd: 6, // game value
    downlinkGbPerDay: 1900, // estimate: about 800 Mbit/s x 600 s x 4 passes
    reliability: 0.95,
    linkFractionBonus: 0.04, // game value
    heritage: "Ka-band EO downlinks on mid-size satellites",
    blurb: "Several times X-band speed. Costs more power and mass.",
    sources: [S_ICEYE2],
    verified: false,
  },
  {
    id: "eg-optical",
    name: "Optical laser terminal",
    category: "comms",
    tier: "advanced",
    massKg: 8, // estimate: TBIRD is a 3U payload, mass not published in sources read
    powerW: 100, // sourced: TBIRD draws 100 W in 200 Gbps mode
    costMUsd: 12, // game value
    downlinkGbPerDay: 8000, // game value: TBIRD moved 4.8 TB (38 Tb) in one pass; cut for weather and few ground sites
    reliability: 0.88, // game value: new tech, clouds block the beam
    linkFractionBonus: 0.03, // game value
    heritage: "NASA TBIRD CubeSat and LCRD laser links",
    blurb: "Laser link, 200 Gbps in orbit tests. Needs a star tracker to aim.",
    sources: [S_TBIRD, S_TBIRD2],
    verified: false,
  },
  {
    id: "eg-ground-network",
    name: "Partner ground station network",
    category: "comms",
    tier: "basic",
    massKg: 0,
    powerW: 0,
    costMUsd: 4, // game value: service fee
    reliability: 0.97,
    linkFractionBonus: 0.22, // game value: many polar and mid-latitude stations give more daily contact
    heritage: "ESTRACK and commercial ground station networks",
    blurb: "Rents contact time at many stations. Raises daily link time.",
    sources: [S_ICEYE2],
    verified: false,
  },

  // ADCS and computers
  {
    id: "eg-adcs-basic",
    name: "Reaction wheels (basic)",
    category: "adcs",
    tier: "basic",
    massKg: 2, // estimate
    powerW: 6, // estimate
    costMUsd: 0.6, // game value
    reliability: 0.95,
    heritage: "CubeSat to microsat reaction wheel sets",
    blurb: "Coarse pointing. Fine for radar and wide-swath imaging.",
    sources: [S_ICEYE],
    verified: false,
  },
  {
    id: "eg-adcs-adv",
    name: "Star tracker + wheels (advanced)",
    category: "adcs",
    tier: "advanced",
    massKg: 5, // estimate
    powerW: 12, // estimate
    costMUsd: 2.2, // game value
    reliability: 0.97,
    heritage: "Star trackers with reaction wheels, as flown with TBIRD pointing",
    blurb: "Sharp pointing. Needed for lasers and fine imaging.",
    sources: [S_TBIRD],
    verified: false,
  },
  {
    id: "eg-obc-basic",
    name: "Onboard computer (basic)",
    category: "computer",
    tier: "basic",
    massKg: 1, // estimate
    powerW: 5, // estimate
    costMUsd: 0.8, // game value
    reliability: 0.97,
    heritage: "Standard small satellite flight computers",
    blurb: "Stores and sends everything. No data savings.",
    sources: [S_PHISAT],
    verified: false,
  },
  {
    id: "eg-obc-edge-ai",
    name: "Edge-AI computer",
    category: "computer",
    tier: "advanced",
    massKg: 1.5, // estimate
    powerW: 12, // estimate
    costMUsd: 2, // game value
    dataGbPerDay: -400, // game value: NEGATIVE = data removed. Phi-sat-1 saved up to about 30% of bandwidth by dropping cloudy images
    reliability: 0.94, // game value
    providerId: "esa",
    heritage: "ESA PhiSat-1 with Intel Myriad 2 cloud screening",
    blurb: "Drops cloudy images on board. Cuts the data that must come down.",
    sources: [S_PHISAT],
    verified: false,
  },

  /* ============================ MOON BASE ZERO ============================ */
  // Mass of landers is the mass the rocket must send toward the Moon. Where a lander burns its own fuel
  // for the trans-lunar injection, this is a game simplification (see estimate notes).

  // Landers. Reliability is a game value informed by real outcomes:
  // IM-1 and IM-2 both tipped over; Blue Ghost 1 landed upright and worked.
  {
    id: "mb-blue-ghost",
    name: "Blue Ghost lander",
    category: "lander",
    tier: "basic",
    massKg: 1517, // sourced (secondary): Blue Ghost Mission 1 launch mass
    powerW: 150, // game value: lander housekeeping
    generatesW: 400, // sources disagree: 400 W (Wikipedia) vs 650 W (NASA APPEL); conservative value used
    costMUsd: 100, // estimate: CLPS task order was about $100M; not opened
    reliability: 0.92, // game value: Blue Ghost 1 succeeded
    lifetimeDays: 14, // estimate: about one lunar day on lander power alone
    providerId: "firefly",
    heritage: "Firefly Blue Ghost Mission 1, Mare Crisium, March 2025",
    payloadCapacityKg: 150, // sourced: about 150 kg to the surface
    blurb: "Proven upright landing. Small payload, short life without help.",
    sources: [S_BG, S_BG2, S_BG3],
    verified: false,
  },
  {
    id: "mb-nova-c",
    name: "Nova-C lander",
    category: "lander",
    tier: "basic",
    massKg: 1900, // estimate: about 1.9 t launch mass for IM-1; not opened
    powerW: 120, // game value
    generatesW: 200, // estimate
    costMUsd: 70, // estimate: CLPS task orders of $60-80M; not opened
    reliability: 0.82, // game value: IM-1 and IM-2 both tipped over after landing
    lifetimeDays: 10, // estimate: both flights ended within days
    providerId: "intuitive-machines",
    heritage: "Intuitive Machines IM-1 (2024) and IM-2 (2025, south pole)",
    payloadCapacityKg: 130, // estimate: company figure from memory, not opened
    blurb: "Lands near the pole. Two tip-overs in two tries.",
    sources: [S_IM2, S_IM2B],
    verified: false,
  },
  {
    id: "mb-griffin",
    name: "Griffin lander",
    category: "lander",
    tier: "advanced",
    massKg: 5500, // estimate: launch mass for Falcon Heavy, not found
    powerW: 200, // game value
    generatesW: 600, // estimate
    costMUsd: 320, // estimate: CLPS task order about $320M; not opened
    reliability: 0.8, // game value: new design, and a sister lander failed (Peregrine, 2024)
    lifetimeDays: 14, // estimate
    providerId: "astrobotic",
    heritage: "Astrobotic Griffin Mission One",
    payloadCapacityKg: 625, // sourced: Astrobotic states 625 kg to the surface
    blurb: "Carries four times Blue Ghost's load. Not yet flown.",
    sources: [S_GRIFFIN, S_GRIFFIN2],
    verified: false,
  },
  {
    id: "mb-blue-moon",
    name: "Blue Moon Mark 1",
    category: "lander",
    tier: "advanced",
    massKg: 7500, // estimate: game simplification. Wet mass is about 21,350 kg; it burns its own fuel after launch to LEO
    powerW: 400, // game value
    generatesW: 2000, // estimate
    costMUsd: 250, // estimate: game value
    reliability: 0.82, // game value: uncrewed pathfinder, new engines
    lifetimeDays: 30, // estimate
    providerId: "blue-origin",
    heritage: "Blue Origin Blue Moon Mark 1 pathfinder",
    payloadCapacityKg: 3000, // sourced: up to 3 t to the surface on New Glenn 7x2
    blurb: "Three tonnes to the surface. Heavy launcher required.",
    sources: [S_BLUEMOON],
    verified: false,
  },

  // Base elements
  {
    id: "mb-habitat",
    name: "Inflatable habitat demonstrator",
    category: "habitat",
    tier: "advanced",
    massKg: 350, // estimate: scaled from BEAM (about 1.4 t on the ISS); a demonstrator, not a crew module
    powerW: 150, // estimate
    costMUsd: 60, // game value
    scienceValue: 110, // game value
    reliability: 0.9,
    heritage: "Bigelow BEAM on the ISS, scaled for the Moon",
    satisfies: [],
    blurb: "Packs small and inflates on the surface. Tests future shelter.",
    sources: [S_LUNPOWER],
    verified: false,
  },
  {
    id: "mb-vsat",
    name: "Vertical solar array (VSAT)",
    category: "power",
    tier: "advanced",
    massKg: 220, // estimate: mast plus array, not found in sources
    powerW: 20, // estimate: deployment motors and leveling
    generatesW: 3000, // estimate: VSAT targets 5-10 kW; CLPS mass limits it to about 5 kWe; derated
    costMUsd: 35, // game value
    reliability: 0.9,
    providerId: "nasa",
    heritage: "NASA Vertical Solar Array Technology, 10 m mast",
    blurb: "Tall mast catches sun the low ridge misses. Near-constant light.",
    sources: [S_VSAT, S_LUNPOWER],
    verified: false,
  },
  {
    id: "mb-rfc",
    name: "Regenerative fuel cell",
    category: "battery",
    tier: "advanced",
    massKg: 450, // estimate: heavy by design
    powerW: 10, // estimate
    storageWh: 40000, // estimate: sized to ride out several days of darkness
    costMUsd: 55, // game value
    reliability: 0.88, // game value: little flight heritage
    lifetimeDays: 45, // game value: cap on night survival
    sunlightIndependent: true, // stored energy carries the night
    heritage: "NASA regenerative fuel cell studies for the lunar surface",
    satisfies: ["mb-night"],
    blurb: "Stores sunlight as hydrogen and oxygen. Heavy, but lasts the night.",
    sources: [S_LUNPOWER],
    verified: false,
  },
  {
    id: "mb-li-ion",
    name: "Li-ion battery",
    category: "battery",
    tier: "basic",
    massKg: 25, // estimate: about 120 Wh/kg at pack level
    powerW: 0,
    storageWh: 3000, // estimate
    costMUsd: 3, // game value
    reliability: 0.97,
    lifetimeDays: 20, // game value: cap on night survival; the pack cannot cover a long night
    heritage: "Li-ion packs on CLPS landers",
    blurb: "Light and cheap. Cannot cover a long night alone.",
    sources: [S_LUNPOWER],
    verified: false,
  },
  {
    id: "mb-rhu",
    name: "Radioisotope heater units",
    category: "thermal",
    tier: "basic",
    massKg: 1, // estimate: about 20 units at roughly 40 g each (secondary source) plus mounts
    powerW: 0, // heat only, no electric power
    costMUsd: 3, // estimate: game value
    reliability: 0.97,
    lifetimeDays: 45, // game value: keeps electronics warm through the night
    sunlightIndependent: true,
    providerId: "nasa",
    heritage: "NASA light-weight radioisotope heater units, about 1 W thermal each",
    satisfies: ["mb-night"],
    blurb: "Tiny plutonium heaters. Keep electronics warm in the dark.",
    sources: [S_RHU],
    verified: false,
  },
  {
    id: "mb-ice-drill",
    name: "Ice drill + mass spectrometer",
    category: "isru",
    tier: "advanced",
    massKg: 36, // sourced (secondary): PRIME-1 payload mass, drill plus spectrometer
    powerW: 60, // estimate: TRIDENT is described as low power
    costMUsd: 45, // game value
    dataGbPerDay: 2, // estimate
    scienceValue: 190, // game value
    reliability: 0.88,
    providerId: "nasa",
    heritage: "NASA PRIME-1: Honeybee TRIDENT drill and MSolo spectrometer",
    satisfies: ["mb-ice"],
    blurb: "Drills one metre down and sniffs for water ice.",
    sources: [S_PRIME1, S_PRIME1B],
    verified: false,
  },
  {
    id: "mb-rover",
    name: "Small rover",
    category: "rover",
    tier: "advanced",
    massKg: 80, // estimate: between Rashid (10 kg) and VIPER (447 kg roving mass)
    powerW: 120, // estimate
    costMUsd: 40, // game value
    dataGbPerDay: 6, // estimate
    scienceValue: 130, // game value
    reliability: 0.88,
    providerId: "mbrsc",
    heritage: "MBRSC Rashid and NASA VIPER class, scaled",
    satisfies: ["mb-scout"],
    blurb: "Scouts the next landing zone and drives to ice spots.",
    sources: [S_RASHID, S_VIPER],
    verified: false,
  },
  {
    id: "mb-regolith-science",
    name: "Regolith science package",
    category: "instrument",
    tier: "basic",
    massKg: 12, // estimate
    powerW: 25, // estimate
    costMUsd: 12, // game value
    dataGbPerDay: 3, // estimate
    scienceValue: 90, // game value
    reliability: 0.95,
    heritage: "CLPS regolith composition and thermal property instruments",
    satisfies: ["mb-scout"],
    blurb: "Measures soil strength, heat flow and composition.",
    sources: [S_PRIME1B],
    verified: false,
  },
  {
    id: "mb-dust-plasma",
    name: "Dust and plasma sensor",
    category: "instrument",
    tier: "basic",
    massKg: 3, // estimate: LEMS station is 35 kg, this is one sensor
    powerW: 5, // estimate: LEMS runs on about 3 W
    costMUsd: 4, // game value
    dataGbPerDay: 0.5, // estimate
    scienceValue: 60, // game value
    reliability: 0.96,
    heritage: "NASA LEMS environment station sensors",
    blurb: "Tracks dust and charged particles that foul panels.",
    sources: [S_LEMS],
    verified: false,
  },

  // Comms
  {
    id: "mb-dte-xband",
    name: "Direct-to-Earth X-band",
    category: "comms",
    tier: "basic",
    massKg: 8, // estimate
    powerW: 40, // estimate
    costMUsd: 5, // game value
    downlinkGbPerDay: 40, // estimate
    reliability: 0.95,
    linkFractionBonus: 0.12, // game value: Earth sits low on the horizon at the pole
    heritage: "CLPS lander direct-to-Earth radios",
    blurb: "Straight to Earth. Weak at the pole: Earth hugs the horizon.",
    sources: [S_BG],
    verified: false,
  },
  {
    id: "mb-relay",
    name: "Lunar relay service",
    category: "comms",
    tier: "advanced",
    massKg: 15, // estimate: surface terminal only; the relay satellite is a bought service
    powerW: 35, // estimate
    costMUsd: 60, // estimate: service fee, game value
    downlinkGbPerDay: 120, // estimate
    reliability: 0.92, // game value: relay not yet in service
    linkFractionBonus: 0.4, // game value: relay in lunar orbit sees both pole and Earth
    heritage: "SSTL Lunar Pathfinder, ESA Moonlight and NASA LunaNet",
    blurb: "A satellite in lunar orbit relays your data. Biggest link boost.",
    sources: [S_SSTL],
    verified: false,
  },
  {
    id: "mb-mesh",
    name: "Surface mesh network",
    category: "comms",
    tier: "advanced",
    massKg: 6, // estimate: network-in-a-box
    powerW: 20, // estimate
    costMUsd: 8, // game value
    downlinkGbPerDay: 10, // estimate
    reliability: 0.9, // game value: IM-2 tipped over, so the LTE network is unproven
    linkFractionBonus: 0.08, // game value: surface-to-surface only
    heritage: "Nokia LTE network on Intuitive Machines IM-2",
    satisfies: ["mb-surface-net"],
    blurb: "Open surface network; local trades go on during Earth blackout.",
    sources: [S_NOKIA],
    verified: false,
  },
  {
    id: "mb-pq-link",
    name: "Post-quantum secure link",
    category: "comms",
    tier: "advanced",
    massKg: 1.5, // estimate: concept technology, a small crypto board
    powerW: 6, // estimate
    costMUsd: 7, // game value
    reliability: 0.9, // game value: concept technology
    heritage: "NIST FIPS 203 (ML-KEM) and FIPS 204 (ML-DSA) on the link",
    satisfies: ["mb-quantum-link"],
    blurb: "Quantum-safe keys and signatures for Earth–Moon traffic",
    sources: [S_FIPS203, S_FIPS204],
    verified: false,
  },
  {
    id: "mb-dtn-node",
    name: "DTN store-and-forward node",
    category: "computer",
    tier: "advanced",
    massKg: 2, // estimate
    powerW: 8, // estimate
    costMUsd: 4, // game value
    reliability: 0.96,
    heritage: "NASA DTN Bundle Protocol, in use on the ISS",
    blurb: "Holds data through Earth blackouts, then sends it. No loss.",
    sources: [S_DTN, S_DTN2],
    verified: false,
  },
];
