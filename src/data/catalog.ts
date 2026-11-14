import type { Budget, Catalog } from "../types";
import landers from "./landers.json";
import payloads from "./payloads.json";
import rockets from "./rockets.json";
import sites from "./sites.json";

/** Every entry starts as a placeholder (verified: false) until the data owner adds sourced numbers. */
export const catalog = { rockets, landers, sites, payloads } as Catalog;

/** Game setting: the team's own money before any customer pays. */
export const startingBudget: Budget = { startUsd: 90_000_000 };

export const unverifiedCount = [...catalog.rockets, ...catalog.landers, ...catalog.sites, ...catalog.payloads].filter(
  (entry) => !entry.verified,
).length;
