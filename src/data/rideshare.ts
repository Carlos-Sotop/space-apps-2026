import type { RideshareOffer, Source } from "@/engine/types";

const S_GUARANI: Source = { title: "GuaraniSat-1: Paraguay's first satellite, 1U, about 1.3 kg", url: "https://nanosats.eu/sat/guaranisat-1" };
const S_GAINDE: Source = { title: "GaindeSAT: Senegal's first satellite, 1U with UCAM-3 camera", url: "https://www.nanosats.eu/sat/gaindesat" };
const S_LIGHT1: Source = { title: "eoPortal: Light-1 (UAE-Bahrain 3U gamma-ray cubesat)", url: "https://www.eoportal.org/satellite-missions/light-1" };
const S_NIGERIA: Source = { title: "eoPortal: NigeriaSat-X (22 m imager, NASRDA)", url: "https://www.eoportal.org/satellite-missions/nigeriasat-x" };
const S_ANGEO: Source = { title: "Space in Africa: ANGEO-1, Angola's Earth observation satellite", url: "https://spaceinafrica.com/?p=143576" };
const S_SAOCOM: Source = { title: "ESA EO Gateway: SAOCOM (CONAE L-band SAR)", url: "https://dragon3.esa.int/eogateway/missions/saocom" };
const S_TUA: Source = { title: "TUBITAK UZAY: Turkish lunar mission and space exploration", url: "https://uzay.tubitak.gov.tr/en/space-exploration/" };
const S_RASHID: Source = { title: "ESA: Rashid rover (about 10 kg)", url: "https://www.esa.int/ESA_Multimedia/Images/2022/12/Rashid_rover" };
const S_DANURI: Source = { title: "KPLO (Danuri) English press kit: payloads and masses", url: "https://shadowcam.im-ldi.com/KPLO_english_press_kit.pdf" };
const S_EXPRESS: Source = { title: "NASA EXPRESS rack fact sheet", url: "https://nasa.engr.uky.edu/wp-content/uploads/2024/01/ISS_expressrack.pdf" };

export const rideshareOffers: RideshareOffer[] = [
  /* Orbital Lab */
  {
    id: "ol-rs-aep",
    actorId: "aep",
    payloadName: "Radiation cube (GuaraniSat heritage)",
    massKg: 2, // estimate: 1U cube is about 1.3 kg; GuaraniSat-1 was deployed from the ISS
    powerW: 5, // estimate
    dataGbPerDay: 0.1, // estimate
    paysMUsd: 6, // game value
    scienceValue: 40, // game value
    blurb: "Paraguay's student cube logs radiation inside the station.",
    sources: [S_GUARANI],
    verified: false,
  },
  {
    id: "ol-rs-nssa",
    actorId: "nssa",
    payloadName: "Gamma-ray detector (Light-1 heritage)",
    massKg: 4, // estimate: Light-1 is a 3U cubesat, detector share scaled
    powerW: 8, // estimate
    dataGbPerDay: 0.2, // estimate
    paysMUsd: 10, // game value
    scienceValue: 60, // game value
    blurb: "Bahrain's detector hunts gamma flashes from thunderstorms.",
    sources: [S_LIGHT1],
    verified: false,
  },
  {
    id: "ol-rs-ases",
    actorId: "ases",
    payloadName: "Seed germination box",
    massKg: 3, // estimate
    powerW: 5, // estimate
    dataGbPerDay: 0.3, // estimate
    paysMUsd: 6, // game value: fictional proposal; GaindeSAT shows Senegal's student-led small payload skills
    scienceValue: 40, // game value
    blurb: "Senegal tests millet and cowpea seeds in microgravity.",
    sources: [S_GAINDE, S_EXPRESS],
    verified: false,
  },
  {
    id: "ol-rs-tua",
    actorId: "tua",
    payloadName: "Microgravity experiment bundle",
    massKg: 15, // estimate
    powerW: 20, // estimate
    dataGbPerDay: 0.5, // estimate
    paysMUsd: 14, // game value: fictional proposal; Turkiye flew its first astronaut to the ISS in 2024
    scienceValue: 70, // game value
    blurb: "Türkiye's set of small experiments on materials and cells.",
    sources: [S_TUA],
    verified: false,
  },

  /* Earth Guardian */
  {
    id: "eg-rs-nasrda",
    actorId: "nasrda",
    payloadName: "Disaster-monitoring camera",
    massKg: 12, // estimate: hosted camera, NigeriaSat-X imager is 22 m resolution
    powerW: 20, // estimate
    dataGbPerDay: 40, // estimate
    paysMUsd: 12, // game value
    scienceValue: 60, // game value
    blurb: "Nigeria adds a wide camera for flood and fire damage maps.",
    sources: [S_NIGERIA],
    verified: false,
  },
  {
    id: "eg-rs-ggpen",
    actorId: "ggpen",
    payloadName: "Farm-monitoring camera cube",
    massKg: 4, // estimate: cubesat class
    powerW: 10, // estimate
    dataGbPerDay: 8, // estimate
    paysMUsd: 8, // game value: fictional proposal; Angola is building its first EO satellite ANGEO-1
    scienceValue: 45, // game value
    blurb: "Angola wants crop images for small farms in the highlands.",
    sources: [S_ANGEO],
    verified: false,
  },
  {
    id: "eg-rs-ases",
    actorId: "ases",
    payloadName: "Coastal camera cube (GaindeSAT heritage)",
    massKg: 2, // estimate: GaindeSAT-1A is a 1 kg, 1U satellite
    powerW: 4, // estimate
    dataGbPerDay: 0.5, // estimate
    paysMUsd: 5, // game value
    scienceValue: 30, // game value
    blurb: "Senegal's low-cost camera watches its coast and fisheries.",
    sources: [S_GAINDE],
    verified: false,
  },
  {
    id: "eg-rs-conae",
    actorId: "conae",
    payloadName: "L-band sensor (SAOCOM heritage)",
    massKg: 30, // estimate: scaled compact sensor, SAOCOM instrument itself is far larger
    powerW: 80, // estimate
    dataGbPerDay: 200, // estimate
    paysMUsd: 30, // game value
    scienceValue: 100, // game value
    blurb: "Argentina shares a soil-moisture radar for its farms.",
    sources: [S_SAOCOM],
    verified: false,
  },

  /* Moon Base Zero */
  {
    id: "mb-rs-mbrsc",
    actorId: "mbrsc",
    payloadName: "Rashid 2 micro rover",
    massKg: 10, // sourced: Rashid is about 10 kg
    powerW: 20, // estimate
    dataGbPerDay: 1, // estimate
    paysMUsd: 30, // game value
    scienceValue: 90, // game value
    blurb: "The UAE tries again after Rashid was lost with Hakuto-R.",
    sources: [S_RASHID],
    verified: false,
  },
  {
    id: "mb-rs-kasa",
    actorId: "kasa",
    payloadName: "High-resolution camera (Danuri heritage)",
    massKg: 15, // sourced: LUTI camera is about 15 kg per KPLO press kit
    powerW: 25, // estimate
    dataGbPerDay: 2, // estimate
    paysMUsd: 25, // game value
    scienceValue: 80, // game value
    blurb: "Korea's camera maps boulders near the landing zone.",
    sources: [S_DANURI],
    verified: false,
  },
  {
    id: "mb-rs-tua",
    actorId: "tua",
    payloadName: "Lunar imaging package",
    massKg: 8, // estimate
    powerW: 15, // estimate
    dataGbPerDay: 1, // estimate
    paysMUsd: 18, // game value
    scienceValue: 60, // game value: Türkiye's first lunar mission carries high-resolution and wide-angle cameras
    blurb: "Türkiye's first surface cameras, after its lunar orbiter flight.",
    sources: [S_TUA],
    verified: false,
  },
  {
    id: "mb-rs-nssa",
    actorId: "nssa",
    payloadName: "Gamma-ray spectrometer (Light-1 heritage)",
    massKg: 3, // estimate
    powerW: 6, // estimate
    dataGbPerDay: 0.2, // estimate
    paysMUsd: 8, // game value
    scienceValue: 40, // game value
    blurb: "Bahrain's small detector reads the radiation on the surface.",
    sources: [S_LIGHT1],
    verified: false,
  },
];
