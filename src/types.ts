// Shared contract between every folder in src/.
// Change it only when the whole team agrees, and put [types] in the commit or pull request title.

/** Where a number came from. */
export interface Source {
  title: string;
  url: string;
}

/** Every catalog entry carries its sources. */
export interface Sourced {
  sources: Source[];
  /** false until a person on the team has checked every number against its sources */
  verified: boolean;
}

export interface Rocket extends Sourced {
  id: string;
  name: string;
  /** chance the launch puts the lander on its way to the Moon, 0 to 1 */
  launchSuccess: number;
}

export interface Lander extends Sourced {
  id: string;
  name: string;
  rocketId: string;
  /** payload mass the lander can carry to the surface, kg */
  payloadMassKg: number;
  /** average power the lander gives its payloads on the surface, W */
  payloadPowerW: number;
  /** data the lander can send to Earth on a day with Earth in view, MB */
  downlinkMbPerDay: number;
  /** payload heat the lander can get rid of, W */
  heatRejectionW: number;
  /** chance of landing upright and working, 0 to 1 */
  landingSuccess: number;
  /** price an outside customer pays to fly one kg, USD */
  pricePerKgUsd: number;
  /** what the flight costs the mission team, USD */
  missionCostUsd: number;
  /** true if the lander is built to work through a lunar night */
  survivesNight: boolean;
}

export interface Site extends Sourced {
  id: string;
  name: string;
  latitudeDeg: number;
  longitudeDeg: number;
  /** Earth days of sunlight in one lunar day at this site */
  sunlitDays: number;
  /** share of sunlit days with Earth above the horizon, 0 to 1 */
  earthVisibleFraction: number;
  /** multiplies the lander's landing chance (terrain, lighting), 0 to 1 */
  landingFactor: number;
  /** multiplies the science value of payloads landed here */
  scienceFactor: number;
}

export type PayloadKind = "science" | "technology" | "commercial" | "memorial";

export interface Payload extends Sourced {
  id: string;
  name: string;
  kind: PayloadKind;
  owner: string;
  massKg: number;
  powerW: number;
  /** data it produces per sunlit day, MB */
  dataMbPerDay: number;
  /** heat it gives off, W */
  heatW: number;
  /** science points when all of its data reaches Earth */
  scienceValue: number;
  /** what the customer pays the team to fly it, USD (0 for the team's own payloads) */
  paysUsd: number;
}

export interface Catalog {
  rockets: Rocket[];
  landers: Lander[];
  sites: Site[];
  payloads: Payload[];
}

/** What a team decides to fly. */
export interface Manifest {
  landerId: string;
  siteId: string;
  payloadIds: string[];
}

export interface Budget {
  /** money the team starts with, before customers pay, USD */
  startUsd: number;
}

export interface Usage {
  used: number;
  limit: number;
}

export interface ResourceUse {
  massKg: Usage;
  powerW: Usage;
  heatW: Usage;
  dataMbPerDay: Usage;
  costUsd: Usage;
}

export type Phase = "launch" | "landing" | "surface" | "night" | "end";

export interface FlightEvent {
  day: number;
  phase: Phase;
  kind: "info" | "warning" | "failure" | "success";
  text: string;
}

export interface Score {
  science: number;
  customersServed: number;
  moneyLeftUsd: number;
  total: number;
}

export interface FlightResult {
  /** true when the lander landed and worked */
  ok: boolean;
  events: FlightEvent[];
  /** MB that reached Earth, by payload id */
  dataReturnedMb: Record<string, number>;
  score: Score;
}

// Team play and the futarchy round.

export type Role = "lead" | "spacecraft" | "science" | "power-comms";

export interface Player {
  id: string;
  name: string;
  role: Role;
  tokens: number;
}

/** A manifest a team puts forward in a round. */
export interface Proposal {
  id: string;
  teamName: string;
  manifest: Manifest;
}

/** Play tokens a player stakes on a proposal. */
export interface Bet {
  playerId: string;
  proposalId: string;
  tokens: number;
}
