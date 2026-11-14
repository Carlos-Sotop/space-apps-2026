import type { Source } from "@/engine/types";
import type { StepId } from "@/store/steps";

/**
 * Plain-language primers for the web3 and crypto ideas in the game.
 * Each one: an everyday picture, what it does in the game, why it matters off-world.
 */
export type ConceptId = "dao" | "weighted-vote" | "futarchy" | "multisig" | "post-quantum" | "fingerprint" | "desci" | "rideshare";

export interface Concept {
  id: ConceptId;
  title: string;
  /** five words or fewer, shown on chips */
  short: string;
  like: string;
  inGame: string;
  inSpace: string;
  demo?: "hash" | "sign";
  sources: Source[];
}

export const CONCEPTS: Record<ConceptId, Concept> = {
  dao: {
    id: "dao",
    title: "DAO: a team run by shared rules",
    short: "What is a DAO?",
    like: "A club where the rules are written down for everyone to see, and votes are counted automatically. No single boss can change the books.",
    inGame: "Your council of 4 agencies and companies is a DAO. It votes on values, reviews the design and must sign before launch.",
    inSpace: "Big missions already need many nations. The ISS is run by 5 agencies from 15 countries. Shared, visible rules make that trust cheaper.",
    sources: [
      { title: "ethereum.org: Decentralized autonomous organizations (DAOs)", url: "https://ethereum.org/en/dao/" },
      { title: "NASA: International Space Station", url: "https://www.nasa.gov/international-space-station/" },
    ],
  },
  "weighted-vote": {
    id: "weighted-vote",
    title: "Weighted vote: say grows with what you bring",
    short: "Why votes differ",
    like: "Friends splitting a road trip: whoever pays more for fuel gets more say on the route, but everyone still has a voice.",
    inGame: "Each member's vote on science, safety and cost counts in proportion to what it brings: money, rockets, instruments.",
    inSpace: "Partners in joint missions negotiate shares the same way: who builds the module, who gets crew time and data.",
    sources: [{ title: "ethereum.org: How DAOs vote", url: "https://ethereum.org/en/dao/" }],
  },
  futarchy: {
    id: "futarchy",
    title: "Decision market: vote on goals, bet on outcomes",
    short: "Why bots bet",
    like: "A weather forecast you can trust because forecasters lose points when they are wrong. Many guesses together beat one expert.",
    inGame: "Council members stake play credits on which design will score higher. The council adopts the better forecast; after the flight, good forecasters gain reputation.",
    inSpace: "Mission teams already price risk. A market turns hidden doubts into a number before money is spent, not after.",
    sources: [{ title: "Robin Hanson: Futarchy, vote values but bet beliefs", url: "https://mason.gmu.edu/~rhanson/futarchy.html" }],
  },
  multisig: {
    id: "multisig",
    title: "4-of-4 signature: a vault with four keys",
    short: "Why 4 signatures",
    like: "A bank vault that opens only when all four key holders turn their keys at the same time.",
    inGame: "The launch button unlocks only when all 4 council members sign the exact mission plan. Change one module and the signatures no longer match.",
    inSpace: "Launch decisions already need every partner's go. A signature makes that go verifiable by anyone, forever.",
    demo: "sign",
    sources: [{ title: "Bitcoin Wiki: Multi-signature", url: "https://en.bitcoin.it/wiki/Multi-signature" }],
  },
  "post-quantum": {
    id: "post-quantum",
    title: "Post-quantum: locks for the next 30 years",
    short: "Quantum-safe?",
    like: "Someone can record your locked messages today and wait for a master key tomorrow. A quantum computer could be that key.",
    inGame: "Every signature is made twice: with a classic key (ed25519) and with ML-DSA, the US standard designed to resist quantum computers. Both run in your browser.",
    inSpace: "Spacecraft fly for decades. A link designed today must stay safe in 2050. NIST published the first post-quantum standards in 2024.",
    demo: "sign",
    sources: [
      { title: "NIST FIPS 204: Module-Lattice-Based Digital Signature Standard (ML-DSA)", url: "https://csrc.nist.gov/pubs/fips/204/final" },
      { title: "NIST FIPS 203: ML-KEM", url: "https://csrc.nist.gov/pubs/fips/203/final" },
    ],
  },
  fingerprint: {
    id: "fingerprint",
    title: "Fingerprint and ledger: proof nobody edited the plan",
    short: "What is a hash?",
    like: "A fingerprint of a document. Change one comma and the fingerprint is completely different. Pin it on a public board and nobody can swap the document later.",
    inGame: "The mission plan becomes a SHA-256 fingerprint. The council signs the fingerprint, and it can be pinned on a public test ledger.",
    inSpace: "Agreements, data and software updates can be checked by every partner without trusting one server.",
    demo: "hash",
    sources: [{ title: "NIST FIPS 180-4: Secure Hash Standard (SHA-256)", url: "https://csrc.nist.gov/pubs/fips/180-4/upd1/final" }],
  },
  desci: {
    id: "desci",
    title: "Open science: reuse designs, credit flows back",
    short: "What is DeSci?",
    like: "A recipe book where every cook can improve a recipe, and the book remembers who wrote each version.",
    inGame: "The Open Tech Registry lets you adopt designs other players published. The lineage tree credits every author.",
    inSpace: "NASA's open science policy asks missions to share data and code. Shared designs cut cost for small agencies.",
    sources: [
      { title: "NASA Science: Open Science", url: "https://science.nasa.gov/open-science/" },
      { title: "ethereum.org: Decentralized science (DeSci)", url: "https://ethereum.org/en/desci/" },
    ],
  },
  rideshare: {
    id: "rideshare",
    title: "Rideshare market: no empty seats to space",
    short: "Why share space?",
    like: "A carpool app for rockets: spare room on your ride pays part of your fuel.",
    inGame: "Spare mass and power on your spacecraft can carry another team's payload. They pay into your budget.",
    inSpace: "Rideshare launches carry dozens of small satellites at once; that is how many small countries reached orbit.",
    sources: [{ title: "NASA CubeSat 101 (launch opportunities)", url: "https://www.nasa.gov/wp-content/uploads/2017/03/nasa_csli_cubesat_101_508.pdf" }],
  },
};

/** Which primers each Mission Control step offers. */
export const STEP_CONCEPTS: Partial<Record<StepId, ConceptId[]>> = {
  values: ["dao", "weighted-vote"],
  opentech: ["desci"],
  rideshare: ["rideshare"],
  council: ["futarchy", "multisig", "post-quantum", "fingerprint"],
};

export const CONCEPT_ORDER: ConceptId[] = ["dao", "weighted-vote", "futarchy", "fingerprint", "multisig", "post-quantum", "desci", "rideshare"];
