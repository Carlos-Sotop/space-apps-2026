import type { Blueprint, Source } from "@/engine/types";

// Real open entries cite the published design; `example: true` entries illustrate a real
// technology (cited) as a design its author shared. Modifier and integration values are game values.

const S_DTN: Source = { title: "NASA: Delay/Disruption Tolerant Networking (store-and-forward)", url: "https://www.nasa.gov/communicating-with-missions/delay-disruption-tolerant-networking/" };
const S_HDTN: Source = { title: "NASA HDTN: open-source DTN implementation (GitHub)", url: "https://github.com/nasa/HDTN" };
const S_CFS: Source = { title: "NASA Goddard: core Flight System, flight software that powered 40+ NASA missions", url: "https://etd.gsfc.nasa.gov/capabilities/core-flight-system/" };
const S_CFS_CODE: Source = { title: "NASA core Flight System source code (GitHub)", url: "https://github.com/nasa/cFS" };
const S_OSDR: Source = { title: "NASA Open Science Data Repository: open data from spaceflight studies", url: "https://science.nasa.gov/biological-physical/data/" };
const S_CELLS: Source = { title: "NASA Small Spacecraft Technology: Power (III-V cells, about 30% efficiency)", url: "https://www.nasa.gov/smallsat-institute/sst-soa/power-subsystems/" };
const S_SLIM: Source = { title: "JAXA: SLIM, a small lander built for pinpoint landing", url: "https://global.jaxa.jp/projects/sas/slim/" };
const S_CANADARM: Source = { title: "CSA: Canadarm2, the Canadian robotic arm on the Space Station", url: "https://www.asc-csa.gc.ca/eng/iss/canadarm2/" };
const S_RASHID: Source = { title: "ESA: Rashid rover (about 10 kg)", url: "https://www.esa.int/ESA_Multimedia/Images/2022/12/Rashid_rover" };

/** solar arrays the array designs can be fitted to (the ISS power allocation is not an array) */
const ARRAYS = ["eg-array-small", "eg-array-large", "mb-vsat"];
/** flight computers that can run open flight and network software */
const COMPUTERS = ["eg-obc-basic", "eg-obc-edge-ai", "mb-dtn-node"];

export const blueprints: Blueprint[] = [
  /* Real: NASA open-source software and data */
  {
    id: "bp-nasa-dtn-stack",
    name: "DTN bundle stack",
    authorId: "nasa",
    parentId: null,
    category: "computer",
    hostIds: ["ol-iss-link", ...COMPUTERS],
    modifiers: [{ stat: "downlinkRate", op: "mul", value: 1.08 }],
    integration: { powerW: 3, costMUsd: 0.5 },
    summary: "Store-and-forward: data waits out broken links, 8% more gets home",
    provenance: "Open source, runs on NASA's space networks",
    sources: [S_DTN, S_HDTN],
    contentHash: "",
    adoptions: 40,
  },
  {
    id: "bp-nasa-cfs",
    name: "core Flight System software",
    authorId: "nasa",
    parentId: null,
    category: "computer",
    hostIds: COMPUTERS,
    modifiers: [{ stat: "moduleCost", op: "mul", value: 0.97 }],
    integration: { powerW: 2, costMUsd: 1 },
    summary: "Reused flight software: 3% off the cost of every module",
    provenance: "Powered 40+ NASA missions",
    sources: [S_CFS, S_CFS_CODE],
    contentHash: "",
    adoptions: 0,
  },
  {
    id: "bp-nasa-osdr",
    name: "Open spaceflight science data",
    authorId: "nasa",
    parentId: null,
    category: "experiment",
    modifiers: [{ stat: "scienceValue", op: "mul", value: 1.1, scope: { category: "experiment" } }],
    integration: { costMUsd: 2 },
    summary: "Build on past flights' open data: 10% more science",
    provenance: "NASA's open archive of spaceflight studies",
    sources: [S_OSDR],
    contentHash: "",
    adoptions: 0,
  },
  {
    id: "bp-aee-dtn-lite",
    name: "DTN stack for small flight computers",
    authorId: "aee",
    parentId: "bp-nasa-dtn-stack",
    category: "computer",
    hostIds: COMPUTERS,
    modifiers: [
      { stat: "downlinkRate", op: "mul", value: 1.1 },
      { stat: "moduleCost", op: "mul", value: 0.92, scope: { category: "computer" } },
    ],
    integration: { powerW: 2, costMUsd: 0.3 },
    summary: "Forked NASA's stack: runs on cheap boards, 10% more data home",
    example: true,
    sources: [S_HDTN],
    contentHash: "",
    adoptions: 14,
  },

  /* Examples: solar arrays, ESA -> KASA -> ISRO */
  {
    id: "bp-esa-tj-array",
    name: "High-efficiency triple-junction array",
    authorId: "esa",
    parentId: null,
    category: "power",
    hostIds: ARRAYS,
    modifiers: [{ stat: "powerGeneration", op: "mul", value: 1.1, scope: { category: "power" } }],
    integration: { massKg: 1, costMUsd: 1 },
    summary: "Triple-junction cells: about 10% more W per panel",
    example: true,
    sources: [S_CELLS],
    contentHash: "",
    adoptions: 34,
  },
  {
    id: "bp-kasa-light-hinge",
    name: "Lighter array hinge",
    authorId: "kasa",
    parentId: "bp-esa-tj-array",
    category: "power",
    hostIds: ARRAYS,
    modifiers: [
      { stat: "powerGeneration", op: "mul", value: 1.1, scope: { category: "power" } },
      { stat: "moduleMass", op: "mul", value: 0.94, scope: { category: "power" } },
    ],
    integration: { massKg: 0.5, costMUsd: 1.5 },
    summary: "Forked ESA's array: lighter hinge, 6% less array mass",
    example: true,
    sources: [S_CELLS],
    contentHash: "",
    adoptions: 18,
  },
  {
    id: "bp-isro-low-cost-substrate",
    name: "Low-cost array substrate",
    authorId: "isro",
    parentId: "bp-kasa-light-hinge",
    category: "power",
    hostIds: ARRAYS,
    modifiers: [
      { stat: "powerGeneration", op: "mul", value: 1.08, scope: { category: "power" } },
      { stat: "moduleMass", op: "mul", value: 0.94, scope: { category: "power" } },
      { stat: "moduleCost", op: "mul", value: 0.88, scope: { category: "power" } },
    ],
    integration: { massKg: 0.5, costMUsd: 0.5 },
    summary: "Forked KASA's hinge: cheaper substrate, 12% less array cost",
    example: true,
    sources: [S_CELLS],
    contentHash: "",
    adoptions: 9,
  },

  /* Examples: robotic arm, CSA -> MBRSC */
  {
    id: "bp-csa-compact-arm",
    name: "Compact robotic arm",
    authorId: "csa",
    parentId: null,
    category: "rover",
    modifiers: [
      { stat: "moduleMass", op: "mul", value: 0.92, scope: { category: "rover" } },
      { stat: "scienceValue", op: "mul", value: 1.05, scope: { category: "rover" } },
    ],
    integration: { massKg: 2, powerW: 5, costMUsd: 2 },
    summary: "Compact arm: 8% lighter rover, 5% more science",
    example: true,
    sources: [S_CANADARM],
    contentHash: "",
    adoptions: 22,
  },
  {
    id: "bp-mbrsc-sample-arm",
    name: "Sampling arm for micro rovers",
    authorId: "mbrsc",
    parentId: "bp-csa-compact-arm",
    category: "rover",
    modifiers: [
      { stat: "scienceValue", op: "mul", value: 1.08, scope: { category: "rover" } },
      { stat: "moduleCost", op: "mul", value: 0.92, scope: { category: "rover" } },
    ],
    integration: { massKg: 1.5, powerW: 4, costMUsd: 1 },
    summary: "Forked CSA's arm: cheaper, tuned for soil sampling",
    example: true,
    sources: [S_RASHID, S_CANADARM],
    contentHash: "",
    adoptions: 11,
  },

  /* Examples: landing camera, JAXA -> ispace */
  {
    id: "bp-jaxa-hazard-camera",
    name: "Hazard-avoidance landing camera",
    authorId: "jaxa",
    parentId: null,
    category: "lander",
    modifiers: [{ stat: "landingReliability", op: "add", value: 0.03 }],
    integration: { massKg: 2, powerW: 8, costMUsd: 3 },
    summary: "Image navigation for landing: +3 points of success",
    example: true,
    sources: [S_SLIM],
    contentHash: "",
    adoptions: 26,
  },
  {
    id: "bp-ispace-hazard-camera-lite",
    name: "Hazard camera, lite version",
    authorId: "ispace",
    parentId: "bp-jaxa-hazard-camera",
    category: "lander",
    modifiers: [
      { stat: "landingReliability", op: "add", value: 0.03 },
      { stat: "moduleCost", op: "mul", value: 0.9, scope: { category: "lander" } },
    ],
    integration: { massKg: 1.5, powerW: 6, costMUsd: 2 },
    summary: "Forked JAXA's camera: same gain, 10% cheaper lander",
    example: true,
    sources: [S_SLIM],
    contentHash: "",
    adoptions: 7,
  },
];
