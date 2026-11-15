// SpaceDAO: the shared contract between every module.
// Change this file only when the team agrees, and put [types] in the commit title.
//
// Units, everywhere in the game:
//   mass kg · power W · energy Wh · money USD millions ($M) · data Gb · time days
// Keep numbers in these units in data files and convert only for display (src/lib/format.ts).

/* ------------------------------------------------------------------ */
/* Sources: every real-world number must say where it came from        */
/* ------------------------------------------------------------------ */

export interface Source {
  title: string;
  url: string;
}

export interface Sourced {
  sources: Source[];
  /** false until a person on the team has checked every number against its sources */
  verified: boolean;
}

/* ------------------------------------------------------------------ */
/* Resources                                                           */
/* ------------------------------------------------------------------ */

/** The six resources the challenge asks us to make visible. */
export type ResourceKey = "mass" | "power" | "budget" | "data" | "comms" | "lifetime";

export type ResourceStatus = "ok" | "tight" | "over";

export interface ResourceLine {
  /** what uses or provides this amount, for the breakdown tooltip */
  label: string;
  amount: number;
}

export interface ResourceGauge {
  key: ResourceKey;
  /** amount the design consumes (mass carried, W drawn, $M spent, Gb/day produced...) */
  used: number;
  /** amount available (launch capacity, W generated, treasury, downlink Gb/day...) */
  capacity: number;
  /** "tight" when used/capacity is above TIGHT_RATIO, "over" above 1 */
  status: ResourceStatus;
  usedBy: ResourceLine[];
  providedBy: ResourceLine[];
}

export type ResourceReport = Record<ResourceKey, ResourceGauge>;

/** Margin under which a resource shows as "tight" (amber). Real missions keep 10-20% margin. */
export const TIGHT_RATIO = 0.9;

/* ------------------------------------------------------------------ */
/* Modifiers: how perks and open-tech blueprints change the numbers    */
/* ------------------------------------------------------------------ */

export type StatKey =
  | "launchCost"
  | "launchCapacity"
  | "launchReliability"
  | "moduleMass"
  | "moduleCost"
  | "modulePower"
  | "powerGeneration"
  | "downlinkRate"
  | "scienceValue"
  | "landingReliability"
  | "lifetime"
  | "treasury";

export interface Modifier {
  stat: StatKey;
  /** "mul": multiply by value (0.9 = -10%). "add": add value in the stat's unit. */
  op: "mul" | "add";
  value: number;
  /** limit the modifier to one module category or one mission; omit for all */
  scope?: { category?: ModuleCategory; missionId?: MissionId };
}

/* ------------------------------------------------------------------ */
/* Actors: space agencies and private companies                        */
/* ------------------------------------------------------------------ */

export type ActorKind = "agency" | "company";

export type Capability =
  | "launch"
  | "spacecraft"
  | "landing"
  | "habitat"
  | "robotics"
  | "science"
  | "earth-observation"
  | "comms"
  | "ground-segment"
  | "funding";

/** 1 = some, 2 = strong, 3 = world-class */
export type Strength = 1 | 2 | 3;

/** What a council member cares about; also the weights of the values vote. Sums to 1. */
export interface Values {
  science: number;
  safety: number;
  cost: number;
}

export interface Actor extends Sourced {
  id: string;
  kind: ActorKind;
  /** official full name, e.g. "Indian Space Research Organisation" */
  name: string;
  /** acronym or short name shown on cards, e.g. "ISRO" */
  shortName: string;
  /** ISO 3166-1 alpha-2, or "EU" for ESA; for companies, headquarters country */
  country: string;
  /** emoji flag shown on the card. No logos: Space Apps rules forbid agency logos without permission. */
  flag: string;
  /** accent color for the monogram badge, hex */
  color: string;
  /** one line, shown on the card */
  tagline: string;
  /** 2-3 short real facts, shown when the card is expanded */
  highlights: string[];
  capabilities: Partial<Record<Capability, Strength>>;
  /** what this member puts into the mission treasury, $M (game value, scaled from real budgets) */
  contributionMUsd: number;
  perk: {
    name: string;
    /** one sentence: the real capability behind the perk */
    description: string;
    modifiers: Modifier[];
  };
  /** how this member votes and what it vetoes when it is a bot */
  priorities: Values;
  /** voice of the bot in council chat, one sentence of guidance for writers */
  persona: string;
}

/* ------------------------------------------------------------------ */
/* Launch vehicles                                                     */
/* ------------------------------------------------------------------ */

export type OrbitClass = "LEO" | "ISS" | "SSO" | "GTO" | "TLI";

export interface LaunchVehicle extends Sourced {
  id: string;
  name: string;
  /** Actor id of the builder or operator */
  providerId: string;
  /** payload the vehicle can deliver to each orbit class, kg (absent = can't reach) */
  capacityKg: Partial<Record<OrbitClass, number>>;
  /** price of one launch, $M */
  costMUsd: number;
  /** share of successful flights, 0 to 1 (game uses this as the launch success chance) */
  reliability: number;
  reusable: boolean;
  status: "operational" | "in-development";
  /** one line shown on the card */
  blurb: string;
}

/* ------------------------------------------------------------------ */
/* Modules: subsystems, instruments and payloads you can fly           */
/* ------------------------------------------------------------------ */

export type ModuleCategory =
  | "bus"
  | "power"
  | "battery"
  | "comms"
  | "computer"
  | "adcs"
  | "propulsion"
  | "thermal"
  | "lander"
  | "instrument"
  | "experiment"
  | "habitat"
  | "isru"
  | "rover";

export interface Module extends Sourced {
  id: string;
  name: string;
  category: ModuleCategory;
  tier: "basic" | "advanced";
  massKg: number;
  /** average power drawn in operation, W */
  powerW: number;
  /** power generated, W (solar arrays, RTG) */
  generatesW?: number;
  /** energy stored, Wh (batteries); needed to survive eclipses and lunar night */
  storageWh?: number;
  costMUsd: number;
  /** science data produced per day, Gb */
  dataGbPerDay?: number;
  /** data the module can send to Earth per day, Gb (comms modules) */
  downlinkGbPerDay?: number;
  /** points when all its data reaches Earth */
  scienceValue?: number;
  /** chance the module works for the whole mission, 0 to 1 */
  reliability: number;
  /** extra design life it adds or the cap it sets, days (e.g. a battery that limits night survival) */
  lifetimeDays?: number;
  /** Actor id of the builder, if it is a real product or heritage design */
  providerId?: string;
  /** the real mission or product it is based on, e.g. "SLIM landing radar" */
  heritage?: string;
  /** objective ids this module contributes to */
  satisfies?: string[];
  /** carriers only (category "lander" or "bus"): payload mass it can take to the destination, kg */
  payloadCapacityKg?: number;
  /** power that does not depend on sunlight (RTG, radioisotope heaters) */
  sunlightIndependent?: boolean;
  /** comms only: share of the day it adds to link coverage (relay satellites, ground networks), 0 to 1 */
  linkFractionBonus?: number;
  /** one line shown on the card; deeper text goes in the info panel */
  blurb: string;
}

/* ------------------------------------------------------------------ */
/* Missions                                                            */
/* ------------------------------------------------------------------ */

export type MissionId = "orbital-lab" | "earth-guardian" | "moon-base-zero";

export interface Objective {
  id: string;
  title: string;
  /** one line for the card */
  summary: string;
  /** what must fly to achieve it: every listed category, and at least one of the listed module ids */
  requires: { categories?: ModuleCategory[]; moduleIds?: string[] };
  /** points if achieved */
  scienceValue: number;
}

export interface Destination {
  id: string;
  /** "Low Earth orbit, 420 km, 51.6°" or "Shackleton connecting ridge" */
  name: string;
  orbitClass: OrbitClass;
  /** one line on what this choice means for the mission */
  tradeoff: string;
  /** multiplies launch capacity (higher orbits or a landing cost payload) */
  capacityFactor: number;
  /** share of time in sunlight, 0 to 1 (eclipses, lunar night) */
  sunlightFraction: number;
  /** share of time with a direct link to Earth ground stations, 0 to 1 */
  earthLinkFraction: number;
  /** multiplies the science value of everything flown here */
  scienceFactor: number;
  /** multiplies the landing or docking success chance */
  arrivalFactor: number;
  /** one-way light time to Earth, seconds */
  lightTimeS: number;
  lat?: number;
  lon?: number;
}

export type FlightPhaseId =
  | "launch"
  | "ascent"
  | "orbit-insertion"
  | "transfer"
  | "arrival"
  | "operations"
  | "downlink"
  | "end";

export interface FlightPhase {
  id: FlightPhaseId;
  label: string;
  /** game days the phase lasts in the simulation */
  days: number;
}

export interface EventTemplate {
  id: string;
  phase: FlightPhaseId;
  title: string;
  /** what happened, in plain words */
  text: string;
  /** chance per flight, 0 to 1, before mitigation */
  chance: number;
  /** module categories that reduce or remove the effect, with how much they cut the chance */
  mitigatedBy?: { category?: ModuleCategory; moduleId?: string; factor: number }[];
  effect:
    | { kind: "lose-science"; share: number }
    | { kind: "lose-days"; days: number }
    | { kind: "lose-power"; share: number }
    | { kind: "comms-blackout"; days: number }
    | { kind: "mission-loss" };
  /** a live NASA data feed that can trigger it (e.g. DONKI solar flares) */
  liveFeed?: "donki-flr" | "donki-cme" | "eonet";
}

export interface RideshareOffer extends Sourced {
  id: string;
  /** Actor id of the partner asking for a seat (often a smaller agency) */
  actorId: string;
  payloadName: string;
  massKg: number;
  powerW: number;
  dataGbPerDay: number;
  /** what they pay into the treasury, $M */
  paysMUsd: number;
  scienceValue: number;
  blurb: string;
}

export interface Mission extends Sourced {
  id: MissionId;
  name: string;
  tagline: string;
  /** 1 easy · 2 medium · 3 hard */
  difficulty: 1 | 2 | 3;
  /** who commissions it (partner editions only; the NASA build leaves it empty) */
  client?: string;
  /** two or three sentences for the briefing card */
  briefing: string;
  primaryObjective: Objective;
  /** pick up to MAX_SECONDARY */
  secondaryObjectives: Objective[];
  destinations: Destination[];
  launchVehicleIds: string[];
  /** modules offered in this mission */
  moduleIds: string[];
  /** a design must fly at least one module of each */
  requiredCategories: ModuleCategory[];
  /** nominal mission length, days */
  durationDays: number;
  /** share of the day the team must be able to talk to the spacecraft, 0 to 1 (drives the comms gauge) */
  requiredLinkFraction: number;
  /** starting treasury before members contribute, $M */
  baseTreasuryMUsd: number;
  phases: FlightPhase[];
  events: EventTemplate[];
  rideshareOfferIds: string[];
}

export const MAX_SECONDARY = 2;

/* ------------------------------------------------------------------ */
/* DeSci: the Open Tech Registry                                       */
/* ------------------------------------------------------------------ */

/** An open design someone published to the registry. Adopting it changes numbers via modifiers. */
export interface Blueprint {
  id: string;
  name: string;
  /** Actor id of the publisher */
  authorId: string;
  /** blueprint it was forked from; null for originals */
  parentId: string | null;
  /** module category it improves */
  category: ModuleCategory;
  modifiers: Modifier[];
  /** one line, e.g. "Forked ESA's array, +30% W/kg" */
  summary: string;
  /** content hash recorded on-chain when published; empty for seeded entries not yet on-chain */
  contentHash: string;
  /** Solana devnet transaction signature when anchored from the game */
  txHash?: string;
  /** missions that adopted it (grows as people play) */
  adoptions: number;
}

/* ------------------------------------------------------------------ */
/* The player's design                                                 */
/* ------------------------------------------------------------------ */

export interface Coalition {
  /** the Actor the player represents */
  leadId: string;
  /** three bot partners */
  partnerIds: [string, string, string];
}

export interface MissionDesign {
  missionId: MissionId;
  coalition: Coalition;
  /** outcome of the values vote: weights for the final score */
  values: Values;
  secondaryObjectiveIds: string[];
  destinationId: string;
  launchVehicleId: string;
  moduleIds: string[];
  blueprintIds: string[];
  rideshareIds: string[];
}

/* ------------------------------------------------------------------ */
/* Validation and council review                                       */
/* ------------------------------------------------------------------ */

export type Domain = "launch" | "spacecraft" | "science" | "comms" | "budget";

export interface Issue {
  id: string;
  domain: Domain;
  severity: "blocker" | "warning";
  /** what is wrong, in plain words */
  text: string;
  /** what would fix it */
  fix: string;
  /** the resource it is about, if any */
  resource?: ResourceKey;
}

export type Verdict = "approve" | "concern" | "veto";

export interface Review {
  actorId: string;
  verdict: Verdict;
  /** chat line in the bot's voice */
  message: string;
  issueIds: string[];
}

/* ------------------------------------------------------------------ */
/* Futarchy: vote on values, bet on beliefs                            */
/* ------------------------------------------------------------------ */

/** A design decision the council settles with a decision market. */
export interface DecisionMarket {
  id: string;
  question: string;
  options: {
    id: string;
    label: string;
    /** the design the option would produce */
    design: MissionDesign;
  }[];
}

export interface Forecast {
  /** Monte Carlo over many seeds */
  successProbability: number;
  expectedScore: number;
  p10: number;
  p90: number;
  runs: number;
}

/** Play credits a member stakes on an option's predicted score. Play only: never real money. */
export interface Stake {
  marketId: string;
  optionId: string;
  actorId: string;
  credits: number;
  /** the score the member predicts for this option */
  predictedScore: number;
}

/* ------------------------------------------------------------------ */
/* Live NASA data the simulation can use                               */
/* ------------------------------------------------------------------ */

export interface LiveSpaceWeather {
  id: string;
  kind: "CME" | "GST" | "FLR";
  /** ISO time */
  time: string;
  /** one line from the NASA record */
  note: string;
  link: string;
  /** Kp index for GST, class like "M1.2" for FLR */
  magnitude?: string;
}

export interface LiveEarthEvent {
  id: string;
  title: string;
  /** EONET category, e.g. "wildfires", "severeStorms", "volcanoes" */
  category: string;
  lat: number;
  lon: number;
  link: string;
}

/** Real data fetched at play time (or the bundled snapshot when offline). Optional everywhere. */
export interface LiveContext {
  fetchedAt: string;
  /** true when the data came from the bundled snapshot instead of a live call */
  snapshot: boolean;
  spaceWeather: LiveSpaceWeather[];
  earthEvents: LiveEarthEvent[];
  /** Earth-Moon distance now, km (JPL Horizons) */
  moonDistanceKm?: number;
}

/* ------------------------------------------------------------------ */
/* Flight simulation                                                   */
/* ------------------------------------------------------------------ */

export interface FlightEvent {
  day: number;
  phase: FlightPhaseId;
  kind: "info" | "success" | "warning" | "failure";
  title: string;
  text: string;
  /** set when a live NASA feed triggered the event */
  liveSource?: Source;
}

export interface TelemetrySample {
  day: number;
  phase: FlightPhaseId;
  powerW: number;
  batteryWh: number;
  dataQueuedGb: number;
  dataReturnedGb: number;
  linkUp: boolean;
}

export interface ScoreBreakdown {
  /** science points returned, weighted by values.science */
  science: number;
  /** reliability margin and risks taken, weighted by values.safety */
  safety: number;
  /** treasury left and rideshare revenue, weighted by values.cost */
  efficiency: number;
  /** partners' capabilities used, rideshares flown, open tech adopted */
  collaboration: number;
  total: number;
  /** "S" | "A" | "B" | "C" | "F" */
  grade: string;
}

export interface FlightResult {
  seed: number;
  success: boolean;
  /** the phase where the mission ended, if it was lost */
  lostAt?: FlightPhaseId;
  events: FlightEvent[];
  telemetry: TelemetrySample[];
  objectivesMet: string[];
  dataReturnedGb: number;
  score: ScoreBreakdown;
  /** plain-language lessons for the debrief: why it went the way it did */
  lessons: string[];
}

/* ------------------------------------------------------------------ */
/* Council signatures and the on-chain anchor (play only, test network) */
/* ------------------------------------------------------------------ */
// The game never waits on a chain. Signatures are real cryptography made in the browser;
// anchoring the hash on Solana devnet is optional and shown as a receipt when it works.

export interface CouncilSignature {
  actorId: string;
  /** classical signature over the manifest digest */
  classical: { scheme: "ed25519"; publicKey: string; signature: string };
  /** ML-DSA-65 (NIST FIPS 204) post-quantum signature over the same digest, hex */
  postQuantum?: { scheme: "ml-dsa-65"; publicKey: string; signature: string };
}

export interface Ratification {
  /** SHA-256 of the canonical design JSON, hex */
  manifestHash: string;
  signatures: CouncilSignature[];
  /** set when the relayer anchored it on a test network */
  anchor?: { network: "solana-devnet"; txSignature: string; explorerUrl: string };
}

/* ------------------------------------------------------------------ */
/* Design steps and patches (Sunday sprint contract, C0)               */
/* ------------------------------------------------------------------ */

/** A step of Mission Control a recommendation or a readiness fix can point at. */
export type DesignStep = "charter" | "objectives" | "launch" | "build" | "opentech" | "rideshare";

/** Fields a recommendation or a readiness fix changes. The mission and the coalition never change. */
export type DesignPatch = Partial<Omit<MissionDesign, "missionId" | "coalition">>;

/* ------------------------------------------------------------------ */
/* Catalog: everything the engine reads                                */
/* ------------------------------------------------------------------ */

export interface Catalog {
  missions: Mission[];
  actors: Actor[];
  launchVehicles: LaunchVehicle[];
  modules: Module[];
  blueprints: Blueprint[];
  rideshareOffers: RideshareOffer[];
}
