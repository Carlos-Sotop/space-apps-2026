// Small catalog used only by tests. Numbers are round so formulas are easy to check by hand.
import type {
  Actor,
  Catalog,
  Coalition,
  EventTemplate,
  FlightPhase,
  LaunchVehicle,
  Mission,
  MissionDesign,
  MissionId,
  Module,
  Objective,
} from "./types";

const src = { sources: [{ title: "test", url: "https://example.org" }], verified: false };

function actor(id: string, o: Partial<Actor>): Actor {
  return {
    id,
    kind: "agency",
    name: id,
    shortName: id.toUpperCase(),
    country: "XX",
    flag: "",
    color: "#000000",
    tagline: "",
    highlights: [],
    capabilities: {},
    contributionMUsd: 25,
    perk: { name: "none", description: "", modifiers: [] },
    priorities: { science: 0.4, safety: 0.3, cost: 0.3 },
    persona: "plain",
    ...src,
    ...o,
  };
}

export const actors: Actor[] = [
  actor("lead", { contributionMUsd: 40, capabilities: { science: 3, spacecraft: 2 }, priorities: { science: 0.6, safety: 0.2, cost: 0.2 } }),
  actor("rocketeer", { contributionMUsd: 30, capabilities: { launch: 3, spacecraft: 1 }, priorities: { science: 0.2, safety: 0.5, cost: 0.3 } }),
  actor("linker", { contributionMUsd: 20, capabilities: { comms: 3, "ground-segment": 2 }, priorities: { science: 0.3, safety: 0.3, cost: 0.4 } }),
  actor("banker", { contributionMUsd: 10, capabilities: { funding: 3 }, priorities: { science: 0.2, safety: 0.2, cost: 0.6 } }),
];

export const coalition: Coalition = { leadId: "lead", partnerIds: ["rocketeer", "linker", "banker"] };

const mod = (id: string, category: Module["category"], o: Partial<Module>): Module => ({
  id,
  name: id,
  category,
  tier: "basic",
  massKg: 10,
  powerW: 5,
  costMUsd: 2,
  reliability: 1,
  blurb: "",
  ...src,
  ...o,
});

export const modules: Module[] = [
  mod("bus", "bus", { massKg: 100, powerW: 20, costMUsd: 10, payloadCapacityKg: 300, reliability: 0.98 }),
  mod("lander", "lander", { massKg: 400, powerW: 30, costMUsd: 30, payloadCapacityKg: 500, reliability: 0.9 }),
  mod("solar", "power", { massKg: 20, powerW: 5, costMUsd: 2, generatesW: 200 }),
  mod("rtg", "power", { massKg: 40, powerW: 0, costMUsd: 8, generatesW: 100, sunlightIndependent: true }),
  mod("battery", "battery", { massKg: 10, powerW: 5, costMUsd: 1, storageWh: 400 }),
  mod("battery-big", "battery", { massKg: 60, powerW: 5, costMUsd: 4, storageWh: 20000 }),
  mod("radio", "comms", { massKg: 5, powerW: 15, costMUsd: 3, downlinkGbPerDay: 30 }),
  mod("relay", "comms", { massKg: 15, powerW: 20, costMUsd: 6, downlinkGbPerDay: 40, linkFractionBonus: 0.4 }),
  mod("camera", "instrument", { massKg: 15, powerW: 20, costMUsd: 4, dataGbPerDay: 5, scienceValue: 40, satisfies: ["imaging"] }),
  mod("hyperspectral", "instrument", { massKg: 48, powerW: 40, costMUsd: 12, dataGbPerDay: 15, scienceValue: 100, satisfies: ["spectra"] }),
  mod("heater", "thermal", { massKg: 5, powerW: 10, costMUsd: 2 }),
];

export const launchVehicles: LaunchVehicle[] = [
  { id: "small-rocket", name: "Small Rocket", providerId: "rocketeer", capacityKg: { LEO: 600, SSO: 450, TLI: 150 }, costMUsd: 20, reliability: 0.95, reusable: false, status: "operational", blurb: "", ...src },
  { id: "heavy-rocket", name: "Heavy Rocket", providerId: "rocketeer", capacityKg: { LEO: 6000, SSO: 4000, TLI: 1500 }, costMUsd: 60, reliability: 0.98, reusable: true, status: "operational", blurb: "", ...src },
  { id: "leo-only", name: "LEO Only", providerId: "rocketeer", capacityKg: { LEO: 300 }, costMUsd: 10, reliability: 0.9, reusable: false, status: "operational", blurb: "", ...src },
];

const objective = (id: string, requires: Objective["requires"], scienceValue: number): Objective => ({
  id,
  title: id,
  summary: "",
  requires,
  scienceValue,
});

const phases = (opsDays: number): FlightPhase[] => [
  { id: "launch", label: "Launch", days: 1 },
  { id: "transfer", label: "Transfer", days: 3 },
  { id: "arrival", label: "Arrival", days: 1 },
  { id: "operations", label: "Operations", days: opsDays },
  { id: "end", label: "End", days: 0 },
];

const events: EventTemplate[] = [
  { id: "storm", phase: "operations", title: "Solar storm", text: "A solar storm hit the spacecraft.", chance: 0.1, mitigatedBy: [{ category: "thermal", factor: 0.5 }], effect: { kind: "lose-power", share: 0.2 }, liveFeed: "donki-cme" },
  { id: "debris", phase: "operations", title: "Debris strike", text: "A particle damaged the data recorder.", chance: 0.1, effect: { kind: "lose-science", share: 0.3 } },
  { id: "tli-glitch", phase: "transfer", title: "Trajectory glitch", text: "A burn ran long.", chance: 0.05, effect: { kind: "lose-days", days: 1 } },
];

function mission(id: MissionId, o: Partial<Mission>): Mission {
  return {
    id,
    name: id,
    tagline: "",
    difficulty: 1,
    briefing: "",
    primaryObjective: objective(`${id}-primary`, { categories: ["instrument"] }, 100),
    secondaryObjectives: [
      objective("sec-imaging", { moduleIds: ["camera"] }, 30),
      objective("sec-spectra", { moduleIds: ["hyperspectral"] }, 50),
      objective("sec-thermal", { categories: ["thermal"] }, 20),
    ],
    destinations: [],
    launchVehicleIds: ["small-rocket", "heavy-rocket", "leo-only"],
    moduleIds: modules.map((m) => m.id),
    requiredCategories: ["bus", "power", "comms", "instrument"],
    durationDays: 30,
    requiredLinkFraction: 0.25,
    baseTreasuryMUsd: 20,
    phases: phases(30),
    events,
    rideshareOfferIds: ["cubesat"],
    ...src,
    ...o,
  };
}

const leo = { id: "leo", name: "Low Earth orbit", orbitClass: "LEO" as const, tradeoff: "", capacityFactor: 1, sunlightFraction: 0.6, earthLinkFraction: 0.3, scienceFactor: 1, arrivalFactor: 1, lightTimeS: 0.01 };
const moon = { id: "moon-rim", name: "Lunar rim", orbitClass: "TLI" as const, tradeoff: "", capacityFactor: 1, sunlightFraction: 0.5, earthLinkFraction: 0.5, scienceFactor: 1.5, arrivalFactor: 0.9, lightTimeS: 1.3 };

export const missions: Mission[] = [
  mission("orbital-lab", { destinations: [leo] }),
  mission("earth-guardian", {
    destinations: [{ ...leo, id: "sso", orbitClass: "SSO" }],
    primaryObjective: objective("eg-primary", { categories: ["instrument"] }, 100),
  }),
  mission("moon-base-zero", {
    destinations: [moon],
    durationDays: 60,
    phases: phases(60),
    requiredCategories: ["lander", "power", "comms", "instrument"],
    baseTreasuryMUsd: 60,
  }),
];

export const catalog: Catalog = {
  missions,
  actors,
  launchVehicles,
  modules,
  blueprints: [
    { id: "light-solar", name: "Light solar array", authorId: "lead", parentId: null, category: "power", modifiers: [{ stat: "moduleMass", op: "mul", value: 0.5, scope: { category: "power" } }], summary: "", contentHash: "", adoptions: 0 },
  ],
  rideshareOffers: [
    { id: "cubesat", actorId: "banker", payloadName: "CubeSat", massKg: 10, powerW: 5, dataGbPerDay: 1, paysMUsd: 5, scienceValue: 10, blurb: "", ...src },
  ],
};

/** A valid orbital-lab design: carrier bus, solar, battery, radio, camera. */
export function orbitalDesign(over: Partial<MissionDesign> = {}): MissionDesign {
  return {
    missionId: "orbital-lab",
    coalition,
    values: { science: 0.4, safety: 0.3, cost: 0.3 },
    secondaryObjectiveIds: [],
    destinationId: "leo",
    launchVehicleId: "small-rocket",
    moduleIds: ["bus", "solar", "battery", "radio", "camera"],
    blueprintIds: [],
    rideshareIds: [],
    ...over,
  };
}

/** A Moon design with a lander, solar and no batteries: it should lose power at night. */
export function moonDesign(over: Partial<MissionDesign> = {}): MissionDesign {
  return {
    missionId: "moon-base-zero",
    coalition,
    values: { science: 0.4, safety: 0.3, cost: 0.3 },
    secondaryObjectiveIds: [],
    destinationId: "moon-rim",
    launchVehicleId: "heavy-rocket",
    moduleIds: ["lander", "solar", "radio", "camera"],
    blueprintIds: [],
    rideshareIds: [],
    ...over,
  };
}
