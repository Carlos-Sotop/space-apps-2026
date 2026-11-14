import type { Mission, Source } from "@/engine/types";

const S_ISSORBIT: Source = { title: "NASA Space Station Orbit Tutorial (51.6 deg, 90-93 min orbit)", url: "https://eol.jsc.nasa.gov/Tools/orbitTutorial.htm" };
const S_TDRS: Source = { title: "NASA NTRS: ISS payload accommodations and Ku-band return link via TDRS", url: "https://ntrs.nasa.gov/api/citations/20190028718/downloads/20190028718.pdf" };
const S_EXPRESS: Source = { title: "NASA EXPRESS rack fact sheet", url: "https://nasa.engr.uky.edu/wp-content/uploads/2024/01/ISS_expressrack.pdf" };
const S_ISSAT: Source = { title: "NASA ISS Capabilities and Payload Accommodations", url: "https://science.nasa.gov/wp-content/uploads/2023/04/ISS_Accom_110612.pdf" };
const S_NISAR: Source = { title: "NASA JPL NISAR quick facts", url: "https://www.jpl.nasa.gov/press-kits/nisar/quick-facts/" };
const S_NISAR2: Source = { title: "NASA NISAR mission by the numbers", url: "https://science.nasa.gov/blogs/nisar/2025/07/30/nasa-isros-nisar-mission-by-the-numbers" };
const S_ECOSTRESS: Source = { title: "eoPortal: ECOSTRESS", url: "https://eoportal.org/satellite-missions/iss-ecostress" };
const S_ICEYE: Source = { title: "ESA EO Gateway: ICEYE", url: "https://earth.esa.int/eogateway/missions/iceye/description" };
const S_MAZARICO: Source = { title: "Mazarico et al. 2011: Illumination conditions of the lunar polar regions using LOLA topography (NASA NTRS)", url: "https://ntrs.nasa.gov/citations/20120010094" };
const S_BUSSEY: Source = { title: "Bussey et al. 2010: Illumination conditions of the south pole of the Moon derived using Kaguya topography", url: "https://ui.adsabs.harvard.edu/abs/2010Icar..208..558B" };
const S_GLASER: Source = { title: "Gläser et al.: Connecting Ridge, a landing site at the lunar south pole with extended illumination", url: "https://openpolar.no/Record/ftdlr:oai:elib.dlr.de:94242/Map" };
const S_GLASER2: Source = { title: "Lunar Pole Illumination and Communications Maps (JPL IPN Progress Report 42-176)", url: "https://ipnpr.jpl.nasa.gov/progress_report/42-176/176C.pdf" };
const S_MALAPERT: Source = { title: "ILOA: Moonbase Mons Malapert (Earth visibility)", url: "https://iloa.org/media/Moonbase_Mons_Malapert.pdf" };
const S_PGDA: Source = { title: "NASA PGDA: Lunar Polar Illumination", url: "https://pgda.gsfc.nasa.gov/products/69" };
const S_IM2: Source = { title: "NASA: Intuitive Machines mission lands near south pole (IM-2 tipped on its side)", url: "https://www.nasa.gov/blogs/missions/2025/03/06/intuitive-machines-mission-lands-near-south-pole-carrying-nasa-science/" };
const S_BGLAND: Source = { title: "NASA CLPS Firefly Blue Ghost Mission One press kit", url: "https://www.nasa.gov/wp-content/uploads/2025/01/np-2025-01-001-jsc-clps-firefly-press-kit-screen-508-1-10-25-final.pdf" };
const S_DTN: Source = { title: "NASA NTRS: Delay/Disruption Tolerant Networking for the ISS", url: "https://ntrs.nasa.gov/api/citations/20160014037/downloads/20160014037.pdf" };
const S_FIPS203: Source = { title: "NIST FIPS 203: ML-KEM", url: "https://csrc.nist.gov/pubs/fips/203/final" };
const S_FIPS204: Source = { title: "NIST FIPS 204: ML-DSA", url: "https://csrc.nist.gov/pubs/fips/204/final" };

// Event factor semantics assumed: mitigatedBy.factor multiplies the event chance (0.5 halves it).
// liveFeed "donki-gst" is not in the type, so geomagnetic storm events use "donki-cme" (CMEs cause GSTs).

export const missions: Mission[] = [
  {
    id: "orbital-lab",
    name: "Orbital Lab",
    tagline: "30 days of science on the space station",
    difficulty: 1,
    briefing:
      "The station is full and the schedule is short. Pick a cargo ship and fill it with experiments that make the most of 2 kW of power and a shared data link. What you learn about fire, health and plants helps crews fly farther from home.",
    primaryObjective: {
      id: "ol-primary",
      title: "Run 30 days of microgravity science",
      summary: "Deliver experiments to the ISS and return their data.",
      requires: { categories: ["bus", "experiment"] },
      scienceValue: 100, // game value
    },
    secondaryObjectives: [
      {
        id: "ol-fire-safety",
        title: "Flame in Freefall",
        summary: "Study how fire spreads in microgravity.",
        requires: { moduleIds: ["ol-combustion"] },
        scienceValue: 80, // game value
      },
      {
        id: "ol-health",
        title: "Watch astronaut health",
        summary: "Track vital signs or radiation dose of the crew.",
        requires: { moduleIds: ["ol-biomonitor", "ol-dosimetry"] }, // any of
        scienceValue: 70, // game value
      },
      {
        id: "ol-plants",
        title: "Grow food for long missions",
        summary: "Raise plants in orbit as a step to Moon and Mars food.",
        requires: { moduleIds: ["ol-plant-chamber"] },
        scienceValue: 70, // game value
      },
      {
        id: "ol-manufacturing",
        title: "Make things only space can make",
        summary: "Draw better optical fiber in microgravity.",
        requires: { moduleIds: ["ol-fiber"] },
        scienceValue: 60, // game value
      },
    ],
    destinations: [
      {
        id: "ol-iss",
        name: "Low Earth orbit, 420 km, 51.6°",
        orbitClass: "ISS",
        tradeoff: "Station power and data link, but docking slots are tight.",
        capacityFactor: 1, // game value
        sunlightFraction: 0.61, // derived: ~92 min orbit with ~36 min of eclipse (eclipse length varies with sun angle), 56/92
        earthLinkFraction: 0.88, // estimate: TDRS relay covers most of the orbit
        scienceFactor: 1, // game value
        arrivalFactor: 0.95, // game value: docking or berthing can be aborted
        lightTimeS: 0.25, // derived: two hops to a geostationary TDRS, about 2 x 36,000 km / c
      },
    ],
    launchVehicleIds: ["falcon-9", "vulcan-centaur", "h3"], // the carriers fly on Falcon 9 (Dragon, Cygnus), H3 (HTV-X) and Vulcan (Dream Chaser)
    moduleIds: [
      "ol-cargo-dragon",
      "ol-cygnus",
      "ol-htv-x",
      "ol-dream-chaser",
      "ol-combustion",
      "ol-biomonitor",
      "ol-dosimetry",
      "ol-plant-chamber",
      "ol-protein-crystal",
      "ol-bioprinter",
      "ol-fiber",
      "ol-cold-atom",
      "ol-iss-link",
      "ol-iss-power",
    ],
    requiredCategories: ["bus", "experiment", "power", "comms"], // power and comms = the station allocation modules
    durationDays: 30,
    requiredLinkFraction: 0.6,
    baseTreasuryMUsd: 150, // game value
    phases: [
      { id: "launch", label: "Launch", days: 0 },
      { id: "ascent", label: "Ascent", days: 0 },
      { id: "orbit-insertion", label: "Orbit insertion", days: 0 },
      { id: "transfer", label: "Chase the station", days: 1 },
      { id: "arrival", label: "Dock or berth", days: 1 },
      { id: "operations", label: "Run experiments", days: 30 },
      { id: "downlink", label: "Send final data", days: 1 },
    ],
    events: [
      {
        id: "ol-launch-scrub",
        phase: "launch",
        title: "Launch scrub",
        text: "Weather and a range conflict push the launch back a few days.",
        chance: 0.2, // game value
        effect: { kind: "lose-days", days: 3 },
      },
      {
        id: "ol-docking-abort",
        phase: "arrival",
        title: "Docking abort",
        text: "The ship backs off from the port after a sensor glitch. It tries again a day later.",
        chance: 0.25, // game value
        mitigatedBy: [{ moduleId: "ol-cargo-dragon", factor: 0.6 }], // Dragon has autonomous docking heritage
        effect: { kind: "lose-days", days: 1 },
      },
      {
        id: "ol-debris-avoidance",
        phase: "operations",
        title: "Debris avoidance burn",
        text: "The station fires its engines to dodge a piece of space junk. Experiments pause.",
        chance: 0.15, // game value
        effect: { kind: "lose-days", days: 1 },
      },
      {
        id: "ol-solar-storm",
        phase: "operations",
        title: "Solar storm",
        text: "A CME raises radiation. The crew shelters and sensitive samples are damaged.",
        chance: 0.12, // game value
        effect: { kind: "lose-science", share: 0.15 },
        liveFeed: "donki-cme",
      },
      {
        id: "ol-geomagnetic-drag",
        phase: "operations",
        title: "Geomagnetic storm drag",
        text: "A storm swells the upper air. The station loses height and a reboost eats crew time.",
        chance: 0.1, // game value
        effect: { kind: "lose-days", days: 2 },
        liveFeed: "donki-cme",
      },
      {
        id: "ol-tdrs-outage",
        phase: "operations",
        title: "Relay satellite outage",
        text: "A TDRS relay drops out. Your data waits in the rack until the link returns.",
        chance: 0.2, // game value
        effect: { kind: "comms-blackout", days: 1 },
      },
      {
        id: "ol-rack-trip",
        phase: "operations",
        title: "Rack power trip",
        text: "A breaker trips on the rack. Some experiments lose a run before it is reset.",
        chance: 0.15, // game value
        effect: { kind: "lose-power", share: 0.3 },
      },
    ],
    rideshareOfferIds: ["ol-rs-aep", "ol-rs-nssa", "ol-rs-ases", "ol-rs-tua"],
    sources: [S_ISSORBIT, S_TDRS, S_EXPRESS, S_ISSAT],
    verified: false,
  },

  {
    id: "earth-guardian",
    name: "Earth Guardian",
    tagline: "A watchful satellite for fires, floods and farms",
    difficulty: 2,
    briefing:
      "Fires, floods and failed harvests hit people fast, and clouds hide them from cameras. Design a satellite that sees through smoke and cloud and gets the data home in time to help. Radar sees a lot, but it makes more data than you can send.",
    primaryObjective: {
      id: "eg-primary",
      title: "Watch the planet for a year",
      summary: "Fly an instrument and send its images to the ground.",
      requires: {
        categories: ["bus", "power", "comms"],
        moduleIds: ["eg-thermal-ir", "eg-lsar", "eg-ssar", "eg-xsar", "eg-msi"], // at least one imager: fires and floods need imaging, not ship tracking
      },
      scienceValue: 100, // game value
    },
    secondaryObjectives: [
      {
        id: "eg-wildfire",
        title: "Spot wildfire hotspots",
        summary: "Detect fires by heat and help harmonize MODIS and VIIRS data.",
        requires: { moduleIds: ["eg-thermal-ir"] },
        scienceValue: 90, // game value
      },
      {
        id: "eg-flood",
        title: "Map floods and surface change",
        summary: "Use radar to see water and ground motion through cloud.",
        requires: { moduleIds: ["eg-lsar", "eg-ssar", "eg-xsar"] }, // any of
        scienceValue: 90, // game value
      },
      {
        id: "eg-crops",
        title: "Protect crops and farms",
        summary: "Track crop health and soil moisture for the Field Shift theme.",
        requires: { moduleIds: ["eg-msi", "eg-lsar", "eg-ssar"] }, // any of
        scienceValue: 80, // game value
      },
      {
        id: "eg-ships",
        title: "Track ships at sea",
        summary: "Follow vessels with AIS and radar images.",
        requires: { moduleIds: ["eg-ais", "eg-xsar"] }, // any of
        scienceValue: 50, // game value
      },
    ],
    destinations: [
      {
        id: "eg-sso-dawn-dusk",
        name: "Sun-synchronous, 550 km, dawn-dusk",
        orbitClass: "SSO",
        tradeoff: "Constant sun means small batteries, but optical light is poor.",
        capacityFactor: 1, // game value
        sunlightFraction: 0.99, // estimate: near-continuous sunlight for a dawn-dusk terminator orbit
        earthLinkFraction: 0.08, // estimate: polar stations see a pass about every orbit, ~4-10 min each
        scienceFactor: 0.95, // game value: good for radar, worse lit for optical
        arrivalFactor: 1, // game value
        lightTimeS: 0.002, // derived: 550 km / c
      },
      {
        id: "eg-sso-1030",
        name: "Sun-synchronous, 700 km, 10:30 descending",
        orbitClass: "SSO",
        tradeoff: "Good light for cameras, but eclipses need bigger batteries.",
        capacityFactor: 0.92, // game value: higher orbit costs some launch capacity
        sunlightFraction: 0.65, // estimate: about 35 percent in eclipse (per spec)
        earthLinkFraction: 0.08, // estimate
        scienceFactor: 1.1, // game value: best optical lighting
        arrivalFactor: 1, // game value
        lightTimeS: 0.0023, // derived: 700 km / c
      },
      {
        id: "eg-low-inc-alcantara",
        name: "Low inclination, 600 km, from Alcântara",
        orbitClass: "LEO",
        tradeoff: "Revisits the tropics often and lifts more, but skips the poles.",
        capacityFactor: 1, // game value: uses the larger LEO capacity, an equatorial launch gives a free speed boost
        sunlightFraction: 0.65, // estimate: typical LEO eclipse of about 35 percent
        earthLinkFraction: 0.06, // estimate: a single tropical ground station and fewer passes
        scienceFactor: 1.12, // game value: more looks at tropical fires and crops
        arrivalFactor: 1, // game value
        lightTimeS: 0.002, // derived: 600 km / c
        lat: -2.3, // approximate latitude of the Alcântara launch site
        lon: -44.4, // approximate longitude of the Alcântara launch site
      },
    ],
    launchVehicleIds: [
      "electron",
      "firefly-alpha",
      "nuri",
      "pslv",
      "vega-c",
      "neutron",
      "falcon-9",
      "h3",
      "ariane-62",
    ],
    moduleIds: [
      "eg-bus-small",
      "eg-bus-medium",
      "eg-lsar",
      "eg-ssar",
      "eg-xsar",
      "eg-thermal-ir",
      "eg-msi",
      "eg-ais",
      "eg-array-small",
      "eg-array-large",
      "eg-batt-small",
      "eg-batt-large",
      "eg-sband",
      "eg-xband",
      "eg-kaband",
      "eg-optical",
      "eg-ground-network",
      "eg-adcs-basic",
      "eg-adcs-adv",
      "eg-obc-basic",
      "eg-obc-edge-ai",
    ],
    requiredCategories: ["bus", "power", "instrument", "comms"],
    durationDays: 365,
    requiredLinkFraction: 0.25,
    baseTreasuryMUsd: 90, // game value
    phases: [
      { id: "launch", label: "Launch", days: 0 },
      { id: "ascent", label: "Ascent", days: 0 },
      { id: "orbit-insertion", label: "Orbit insertion", days: 0 },
      { id: "transfer", label: "Early orbit checkout", days: 3 },
      { id: "arrival", label: "Instrument commissioning", days: 4 },
      { id: "operations", label: "Watch the Earth", days: 365 },
      { id: "downlink", label: "Final data dump", days: 1 },
    ],
    events: [
      {
        id: "eg-launch-scrub",
        phase: "launch",
        title: "Launch scrub",
        text: "A high-altitude wind shear delays the launch by a few days.",
        chance: 0.15, // game value
        effect: { kind: "lose-days", days: 3 },
      },
      {
        id: "eg-array-glitch",
        phase: "orbit-insertion",
        title: "Solar array deployment glitch",
        text: "One wing opens late and only partly. Power is lower for the whole mission.",
        chance: 0.1, // game value
        mitigatedBy: [{ moduleId: "eg-array-small", factor: 0.6 }], // fewer hinges, less to go wrong
        effect: { kind: "lose-power", share: 0.3 },
      },
      {
        id: "eg-sar-bottleneck",
        phase: "operations",
        title: "SAR data bottleneck",
        text: "Radar fills the memory faster than the downlink can empty it. Images are dropped.",
        chance: 0.5, // game value
        mitigatedBy: [
          { moduleId: "eg-kaband", factor: 0.4 },
          { moduleId: "eg-optical", factor: 0.2 },
          { moduleId: "eg-obc-edge-ai", factor: 0.5 },
          { moduleId: "eg-ground-network", factor: 0.7 },
        ],
        effect: { kind: "lose-science", share: 0.3 },
      },
      {
        id: "eg-solar-storm",
        phase: "operations",
        title: "Solar storm hit",
        text: "A CME shower upsets the computer. Part of the image queue is lost.",
        chance: 0.12, // game value
        effect: { kind: "lose-science", share: 0.1 },
        liveFeed: "donki-cme",
      },
      {
        id: "eg-geomagnetic-drag",
        phase: "operations",
        title: "Geomagnetic storm drag",
        text: "A storm swells the thin air. The satellite drags and loses pointing for days.",
        chance: 0.1, // game value
        mitigatedBy: [{ category: "adcs", factor: 0.7 }],
        effect: { kind: "lose-days", days: 3 },
        liveFeed: "donki-cme",
      },
      {
        id: "eg-wheel-failure",
        phase: "operations",
        title: "Reaction wheel failure",
        text: "A wheel seizes. Pointing gets rougher and some images blur.",
        chance: 0.1, // game value
        mitigatedBy: [{ moduleId: "eg-adcs-adv", factor: 0.5 }],
        effect: { kind: "lose-science", share: 0.25 },
      },
      {
        id: "eg-eclipse-battery",
        phase: "operations",
        title: "Eclipse battery stress",
        text: "Long eclipses drain the battery. The radar shuts off to save the satellite.",
        chance: 0.25, // game value
        mitigatedBy: [
          { moduleId: "eg-batt-large", factor: 0.3 },
          { moduleId: "eg-batt-small", factor: 0.7 },
        ],
        effect: { kind: "lose-power", share: 0.2 },
      },
    ],
    rideshareOfferIds: ["eg-rs-nasrda", "eg-rs-ggpen", "eg-rs-ases", "eg-rs-conae"],
    sources: [S_NISAR, S_NISAR2, S_ECOSTRESS, S_ICEYE],
    verified: false,
  },

  {
    id: "moon-base-zero",
    name: "Moon Base Zero",
    tagline: "First outpost at the lunar south pole",
    difficulty: 3,
    briefing:
      "An international coalition wants a first outpost near the lunar south pole, where sunlit ridges sit beside craters that may hold ice. It must survive the dark, find water and stay in touch with Earth. A secure link and a local network show how a base can run when Earth drops out of view.",
    primaryObjective: {
      id: "mb-primary",
      title: "Land and run a powered outpost",
      summary: "Store energy, keep a link to Earth and send site data for 45 days.",
      // an instrument: the outpost must return data, so power, link and lifetime all count
      requires: { categories: ["lander", "battery", "comms", "instrument"] },
      scienceValue: 120, // game value
    },
    secondaryObjectives: [
      {
        id: "mb-night",
        title: "Survive the lunar night",
        summary: "Keep electronics warm and powered through darkness.",
        requires: { moduleIds: ["mb-rhu", "mb-rfc"] }, // any of
        scienceValue: 90, // game value
      },
      {
        id: "mb-ice",
        title: "Prospect water ice",
        summary: "Drill and measure ice that could become water and fuel.",
        requires: { moduleIds: ["mb-ice-drill"] },
        scienceValue: 110, // game value
      },
      {
        id: "mb-quantum-link",
        title: "Quantum-safe Earth–Moon link",
        summary: "Protect keys and signatures against future quantum computers.",
        requires: { moduleIds: ["mb-pq-link"] },
        scienceValue: 70, // game value
      },
      {
        id: "mb-surface-net",
        title: "Open surface network",
        summary: "Local network for trades and data when Earth is out of view.",
        requires: { moduleIds: ["mb-mesh"] },
        scienceValue: 70, // game value
      },
      {
        id: "mb-scout",
        title: "Scout the next landing zone",
        summary: "Map rocks and slopes for the next modules (Landing Site Navigator).",
        requires: { moduleIds: ["mb-rover", "mb-regolith-science"] }, // any of
        scienceValue: 80, // game value
      },
    ],
    destinations: [
      {
        id: "mb-connecting-ridge",
        name: "Shackleton connecting ridge",
        orbitClass: "TLI",
        tradeoff: "Almost always sunlit, but Earth is in view only part of the time.",
        capacityFactor: 1, // game value: the lander's own capacity is the limit
        sunlightFraction: 0.88, // sourced: Gläser et al., up to ~88-92 percent at 2 m height (values differ by terrain model)
        earthLinkFraction: 0.45, // estimate: Earth visible roughly half the month at the Shackleton rim (ILOA/JPL), partial at the ridge
        scienceFactor: 1, // game value
        arrivalFactor: 0.9, // game value: steep, rough terrain; IM-2 tipped near the pole
        lightTimeS: 1.28, // sourced: mean Earth-Moon distance 384,400 km / c
        lat: -89.45, // approximate
        lon: -137.3, // approximate (222.7 E)
      },
      {
        id: "mb-de-gerlache-rim",
        name: "de Gerlache crater rim",
        orbitClass: "TLI",
        tradeoff: "Next to dark craters rich in ice, but with longer shadows.",
        capacityFactor: 1, // game value
        sunlightFraction: 0.75, // estimate: below the ridge and Shackleton rim values of Bussey 2010 and Mazarico 2011
        earthLinkFraction: 0.35, // estimate: less Earth view than the ridge
        scienceFactor: 1.15, // game value: closer to permanently shadowed ice
        arrivalFactor: 0.88, // game value
        lightTimeS: 1.28,
        lat: -88.5, // approximate
        lon: -87.1, // approximate
      },
      {
        id: "mb-malapert",
        name: "Malapert massif",
        orbitClass: "TLI",
        tradeoff: "Earth in sight nearly always, but less sun and a farther drive to ice.",
        capacityFactor: 1, // game value
        sunlightFraction: 0.58, // estimate: lower than the Shackleton ridge, source for relative ranking Mazarico 2011
        earthLinkFraction: 0.9, // sourced (secondary): summit probably has Earth always in view, ILOA; game value slightly lower
        scienceFactor: 0.9, // game value: farther from the best ice
        arrivalFactor: 0.95, // game value: broad massif, gentler for landing
        lightTimeS: 1.28,
        lat: -85.99, // approximate
        lon: 0.12, // approximate
      },
    ],
    launchVehicleIds: [
      "falcon-9",
      "falcon-heavy",
      "falcon-heavy-expendable",
      "starship",
      "new-glenn",
      "vulcan-centaur",
      "ariane-64",
    ],
    moduleIds: [
      "mb-blue-ghost",
      "mb-nova-c",
      "mb-griffin",
      "mb-blue-moon",
      "mb-habitat",
      "mb-vsat",
      "mb-rfc",
      "mb-li-ion",
      "mb-rhu",
      "mb-ice-drill",
      "mb-rover",
      "mb-regolith-science",
      "mb-dust-plasma",
      "mb-dte-xband",
      "mb-relay",
      "mb-mesh",
      "mb-pq-link",
      "mb-dtn-node",
    ],
    requiredCategories: ["lander", "battery", "comms", "instrument"], // every lander carries its own solar panels; the VSAT mast is an upgrade
    durationDays: 45, // includes one lunar night
    requiredLinkFraction: 0.5,
    baseTreasuryMUsd: 220, // game value: best options need rideshare money
    phases: [
      { id: "launch", label: "Launch", days: 0 },
      { id: "ascent", label: "Ascent", days: 0 },
      { id: "orbit-insertion", label: "Orbit insertion", days: 0 },
      { id: "transfer", label: "Trip to the Moon", days: 5 }, // game value: Blue Ghost 1 took about 45 days on a low-energy path
      { id: "arrival", label: "Landing", days: 2 },
      { id: "operations", label: "Run the outpost", days: 45 },
      { id: "downlink", label: "Final data dump", days: 1 },
    ],
    events: [
      {
        id: "mb-launch-scrub",
        phase: "launch",
        title: "Launch scrub",
        text: "A fuel valve alarm holds the rocket on the pad for a few days.",
        chance: 0.2, // game value
        effect: { kind: "lose-days", days: 3 },
      },
      {
        id: "mb-lander-tips",
        phase: "arrival",
        title: "Lander tips over",
        text: "The lander lands on a slope and falls on its side. Panels point the wrong way and power drops by half.",
        chance: 0.25, // game value: IM-1 and IM-2 both tipped; Blue Ghost 1 did not
        mitigatedBy: [
          { moduleId: "mb-blue-ghost", factor: 0.4 },
          { moduleId: "mb-blue-moon", factor: 0.5 },
        ],
        effect: { kind: "lose-power", share: 0.5 }, // game value: IM-2 lay on its side and its panels could not charge the batteries
      },
      {
        id: "mb-solar-storm",
        phase: "operations",
        title: "Solar storm on the surface",
        text: "A CME hits with no air to shield the base. Electronics reset and samples are lost.",
        chance: 0.15, // game value
        effect: { kind: "lose-science", share: 0.2 },
        liveFeed: "donki-cme",
      },
      {
        id: "mb-dust-panels",
        phase: "operations",
        title: "Dust on the panels",
        text: "Charged regolith dust sticks to the arrays. Power drops until it blows off.",
        chance: 0.3, // game value
        mitigatedBy: [{ moduleId: "mb-vsat", factor: 0.5 }], // a tall array sits above the lofted dust
        effect: { kind: "lose-power", share: 0.15 },
      },
      {
        id: "mb-earth-blackout",
        phase: "operations",
        title: "Earth below the horizon",
        text: "Earth sets for days at the pole. The direct link goes quiet and data piles up.",
        chance: 0.55, // game value
        mitigatedBy: [
          { moduleId: "mb-relay", factor: 0.2 },
          { moduleId: "mb-dtn-node", factor: 0.5 },
          { moduleId: "mb-mesh", factor: 0.8 },
        ],
        effect: { kind: "comms-blackout", days: 5 },
      },
      {
        id: "mb-night-freeze",
        phase: "operations",
        title: "Lunar night freeze",
        text: "The sun sets for days. Without heat or stored power, the cold kills the electronics.",
        chance: 0.35, // game value
        // A lander with no heat or night storage already stops at its design life (lifetime gauge);
        // this is the risk left once heaters or a fuel cell fly.
        mitigatedBy: [
          { moduleId: "mb-rhu", factor: 0.15 }, // game value
          { moduleId: "mb-rfc", factor: 0.15 }, // game value
          { moduleId: "mb-li-ion", factor: 0.8 },
        ],
        effect: { kind: "mission-loss" },
      },
    ],
    rideshareOfferIds: ["mb-rs-mbrsc", "mb-rs-kasa", "mb-rs-tua", "mb-rs-nssa"],
    sources: [S_MAZARICO, S_BUSSEY, S_GLASER, S_GLASER2, S_MALAPERT, S_PGDA, S_IM2, S_BGLAND, S_DTN, S_FIPS203, S_FIPS204],
    verified: false,
  },
];
