import type { Blueprint } from "@/engine/types";

// Blueprints carry no Sourced fields in the contract; real basis is noted per entry.
// Modifier values are game values.

export const blueprints: Blueprint[] = [
  /* Chain A: solar arrays, ESA -> KASA -> ISRO */
  {
    id: "bp-esa-tj-array",
    name: "High-efficiency triple-junction array",
    authorId: "esa",
    parentId: null,
    category: "power",
    // real basis: triple-junction III-V cells above 30% efficiency are standard on ESA missions
    modifiers: [{ stat: "powerGeneration", op: "mul", value: 1.1, scope: { category: "power" } }],
    summary: "Triple-junction cells: about 10% more W per panel",
    contentHash: "",
    adoptions: 34,
  },
  {
    id: "bp-kasa-light-hinge",
    name: "Lighter array hinge",
    authorId: "kasa",
    parentId: "bp-esa-tj-array",
    category: "power",
    // real basis: panel hinge and yoke mass is a known lever on array specific power (W/kg)
    modifiers: [
      { stat: "powerGeneration", op: "mul", value: 1.1, scope: { category: "power" } },
      { stat: "moduleMass", op: "mul", value: 0.94, scope: { category: "power" } },
    ],
    summary: "Forked ESA's array: lighter hinge, 6% less mass",
    contentHash: "",
    adoptions: 18,
  },
  {
    id: "bp-isro-low-cost-substrate",
    name: "Low-cost array substrate",
    authorId: "isro",
    parentId: "bp-kasa-light-hinge",
    category: "power",
    // real basis: ISRO's cost-first design culture; cheaper substrates cut panel cost
    modifiers: [
      { stat: "powerGeneration", op: "mul", value: 1.08, scope: { category: "power" } },
      { stat: "moduleMass", op: "mul", value: 0.94, scope: { category: "power" } },
      { stat: "moduleCost", op: "mul", value: 0.88, scope: { category: "power" } },
    ],
    summary: "Forked KASA's hinge: cheaper substrate, 12% less cost",
    contentHash: "",
    adoptions: 9,
  },

  /* Chain B: delay-tolerant networking, NASA -> AEE */
  {
    id: "bp-nasa-dtn-stack",
    name: "DTN bundle stack",
    authorId: "nasa",
    parentId: null,
    category: "computer",
    // real basis: NASA Bundle Protocol stack in use on the ISS since 2016, and over optical links in 2024
    modifiers: [{ stat: "downlinkRate", op: "mul", value: 1.08 }],
    summary: "Store-and-forward stack: 8% more data gets home",
    contentHash: "",
    adoptions: 40,
  },
  {
    id: "bp-aee-dtn-lite",
    name: "DTN stack for small flight computers",
    authorId: "aee",
    parentId: "bp-nasa-dtn-stack",
    category: "computer",
    // real basis: the open DTN stacks (ION, HDTN, DTNME) run on modest hardware
    modifiers: [
      { stat: "downlinkRate", op: "mul", value: 1.1 },
      { stat: "moduleCost", op: "mul", value: 0.92, scope: { category: "computer" } },
    ],
    summary: "Forked NASA's stack: runs on cheap boards",
    contentHash: "",
    adoptions: 14,
  },

  /* Chain C: robotic arm, CSA -> MBRSC */
  {
    id: "bp-csa-compact-arm",
    name: "Compact robotic arm",
    authorId: "csa",
    parentId: null,
    category: "rover",
    // real basis: Canadarm2 and Canadarm3 robotics heritage, scaled to a rover-mounted arm
    modifiers: [
      { stat: "moduleMass", op: "mul", value: 0.92, scope: { category: "rover" } },
      { stat: "scienceValue", op: "mul", value: 1.05, scope: { category: "rover" } },
    ],
    summary: "Compact arm: 8% lighter rover, 5% more science",
    contentHash: "",
    adoptions: 22,
  },
  {
    id: "bp-mbrsc-sample-arm",
    name: "Sampling arm for micro rovers",
    authorId: "mbrsc",
    parentId: "bp-csa-compact-arm",
    category: "rover",
    // real basis: Rashid micro rover built and flown by MBRSC with a small instrument suite
    modifiers: [
      { stat: "scienceValue", op: "mul", value: 1.08, scope: { category: "rover" } },
      { stat: "moduleCost", op: "mul", value: 0.92, scope: { category: "rover" } },
    ],
    summary: "Forked CSA's arm: cheaper, tuned for soil sampling",
    contentHash: "",
    adoptions: 11,
  },

  /* Chain D: landing camera, JAXA -> ispace */
  {
    id: "bp-jaxa-hazard-camera",
    name: "Hazard-avoidance landing camera",
    authorId: "jaxa",
    parentId: null,
    category: "lander",
    // real basis: JAXA SLIM pinpoint landing used image-based navigation and landed on the Moon in January 2024
    modifiers: [{ stat: "landingReliability", op: "add", value: 0.03, scope: { category: "lander" } }],
    summary: "Image navigation for landing: +3 points of success",
    contentHash: "",
    adoptions: 26,
  },
  {
    id: "bp-ispace-hazard-camera-lite",
    name: "Hazard camera, lite version",
    authorId: "ispace",
    parentId: "bp-jaxa-hazard-camera",
    category: "lander",
    // real basis: ispace Hakuto-R landers use vision-based navigation and build on JAXA know-how
    modifiers: [
      { stat: "landingReliability", op: "add", value: 0.03, scope: { category: "lander" } },
      { stat: "moduleCost", op: "mul", value: 0.9, scope: { category: "lander" } },
    ],
    summary: "Forked JAXA's camera: same gain, 10% cheaper",
    contentHash: "",
    adoptions: 7,
  },
];
