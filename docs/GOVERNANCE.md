# Governance: how the SpaceDAO council decides

SpaceDAO's governance has to be understandable in a five-minute game and still be a serious proposal for real space cooperation. Every mechanism is modeled on how space missions are already run together. Owner of the code: Charlie (`src/engine/council.ts`, `src/engine/forecast.ts`, `src/crypto/`, `src/chain/`).

The futarchy decision market was removed on Sunday 2026-11-15: playtesters read it as gambling, and no space agency decides that way. Governance is now a Mission Charter, a Go / No-Go readiness review, ISS-style barter, a risk assessment and a 4-of-4 signature.

## 1. Council (who decides)

A mission council has four seats: the player's organization plus three partners. Each member brings a treasury contribution and real capabilities. Vote weight = share of the treasury contributed. This mirrors how real joint missions are negotiated (contributions buy influence) while capping nothing in the game.

Why not one-token-one-vote? Space programs are not anonymous token holders; they are accountable institutions. Contribution-weighted seats are closer to reality (e.g. ESA's member contributions) and easy to explain.

## 2. Mission Charter (what the council wants)

At the start, each member sets how much it cares about **science**, **safety** and **cost**. The council's weights are the contribution-weighted average, and they become the mission's scoring function. Members disagree for real reasons (a safety-first agency vs a cost-first one), and the player sees that their vote moves the outcome only as much as their contribution allows.

## 3. Go / No-Go readiness review (is it ready to fly)

Modeled on NASA's pre-launch readiness reviews and the final commit-to-launch poll, where every team must answer "Go" and a single "No-Go" holds the launch ([NPD 8610.24C, Launch Services Program Pre-Launch Readiness Reviews](https://nodis3.gsfc.nasa.gov/displayDir.cfm?t=NPD&c=8610&s=24C)).

- Each of the four seats runs one check with real numbers from the engine: mass, power, comms, budget, reliability, objectives or values, picked from its priorities and capabilities.
- Each vote is GO, GO with a condition, or NO-GO, with a one-line reason, the numbers, a source, and a fix that jumps to the step that solves it.
- Votes are deterministic: the same design always gets the same votes. When a change moves a vote, the review says why ("JAXA: NO-GO to GO, mass margin rose from 4% to 18%").
- A design that cannot work (for example, no battery for the lunar night) gets a NO-GO and cannot launch.
- Unanimous GO unlocks the signatures.

## 4. Barter (how partners settle a disagreement)

ISS partners settle much of what they owe each other in goods and services instead of money. In the game, a partner holding out can be offered a concession: a payload slot, crew time, or first access to the data. Each concession has a visible cost on the six gauges.

## 5. Risk assessment (the odds)

NASA estimates the odds of losing a mission with probabilistic risk assessment: model what can go wrong, run it many times, count the failures ([NASA/SP-2011-3421, PRA Procedures Guide](https://ntrs.nasa.gov/citations/20120001369)). The game flies the exact design 200 times through the flight engine, each with different luck (launch, part failures, live space weather), and shows the share that succeed. The function is `forecast()` in `src/engine/forecast.ts`; the player reads "Risk assessment".

## 6. Ratification: 4-of-4 quantum-safe signatures

Before launch, every council member signs the **manifest hash** (SHA-256 of the canonical design JSON). Each signature is **hybrid**: ed25519 (classical, what Solana uses today) plus **ML-DSA-65** (NIST FIPS 204, post-quantum). A launch needs all four. Verification runs in the browser and the debrief shows the hashes.

Why hybrid: today's signatures (ECDSA, ed25519) are breakable by a large quantum computer; space infrastructure lives 15-30 years. Hybrid signatures stay secure if either scheme holds. It becomes physical in Moon Base Zero's Earth-Moon link.

## 7. Spare capacity market (rideshare)

Launches often fly with unused capacity. After the build step, the spare mass and power become a market: smaller agencies offer payloads that pay into the treasury and add science. The player picks what fits (a knapsack trade-off). In the full product this is a matching market with escrow; in the game it is a curated set of offers.

## 8. Open Tech Registry (DeSci)

Members publish technology as **blueprints**: open designs with a content hash, an author, and a parent if forked. Adopting a blueprint changes numbers (e.g. -12% array mass) and credits its author; forks form visible lineage trees. At the end, the player can publish their own design. In the full product blueprints become IP-NFT-style records with attribution and reputation; in the game they live in local state, then Supabase, optionally anchored on-chain.

## What is real and what is simulated this weekend

| Piece | This weekend | Full product |
|---|---|---|
| Council, charter, bot reviews | Simulated in the browser (engine + bots) | Real members, multiplayer |
| Go / No-Go review | Deterministic checks on the engine's real numbers, one per seat, with fixes and barter concessions | Each partner's own engineers run the checks |
| Risk assessment | 200 simulated flights of the real engine, with live NASA space weather when available | The partners' own PRA models |
| Signatures | **Real** ed25519 + ML-DSA-65 in the browser | Same, plus on-chain multisig (e.g. Squads on Solana) |
| On-chain anchor | **Optional**: Worker relayer writes the manifest hash with the Solana Memo program on **devnet**; the debrief shows the receipt only when it is confirmed | Mainnet anchoring of ratified missions and blueprints |
| Open Tech Registry | Local seed + publish to Supabase | Content-addressed storage + on-chain attribution |
| Rideshare | Curated offers | Open matching market with escrow |

The game never waits on a chain. If the relayer is down or not configured, the debrief shows nothing about it and everything else works.

## Why Solana devnet for the optional anchor

No contract to write or audit (the Memo program already exists), fast confirmations, free devnet SOL and the team's partnership with the Solana community. If Charlie prefers EVM, Base Sepolia with a 20-line event contract is the alternative; the types keep the anchor field generic enough to switch.
