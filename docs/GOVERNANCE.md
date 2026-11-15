> **Sunday 2026-11-15:** the futarchy decision market is being removed. Governance becomes Mission Charter + Go / No-Go readiness review (NASA review gates and launch poll) + ISS-style barter + risk assessment + 4-of-4 signatures. See `docs/sprint/SUNDAY.md` and `docs/sprint/CHARLIE.md` (C1, C2); this file is updated in C1.

# Governance: how the SpaceDAO council decides

SpaceDAO's governance has to be understandable in a five-minute game and still be a serious proposal for real space cooperation. We combine four mechanisms, each doing one job. Owner of the code: Charlie (`src/engine/council.ts`, `src/screens/control/market.ts`, `src/chain/`), with Manuel on signatures (`src/crypto/`).

## 1. Council (who decides)

A mission council has four seats: the player's organization plus three partners. Each member brings a treasury contribution and real capabilities. Vote weight = share of the treasury contributed. This mirrors how real joint missions are negotiated (contributions buy influence) while capping nothing in the game.

Why not one-token-one-vote? Space programs are not anonymous token holders; they are accountable institutions. Contribution-weighted seats are closer to reality (e.g. ESA's member contributions) and easy to explain.

## 2. Values vote: "vote on values"

At the start, each member sets how much it cares about **science**, **safety** and **cost**. The council's weights are the contribution-weighted average. These weights become the mission's scoring function. Members disagree for real reasons (a safety-first agency vs a cost-first one), and the player sees that their vote moves the outcome only as much as their contribution allows.

## 3. Decision markets: "bet on beliefs" (futarchy)

Futarchy (Robin Hanson, *"Shall We Vote on Values, But Bet on Beliefs?"*) separates *what we want* (values, voted) from *what will work* (beliefs, predicted by markets). MetaDAO on Solana runs it in production for DAO proposals.

In the game, after the council review:
- the market compares the current design with two alternatives: the best cheaper design and the best upgrade one change away (add, drop or swap a part, or change rocket), each picked by screening candidates with simulated flights;
- each option's price starts at its forecast from 120 simulated flights of the real engine (success probability, expected score);
- each option has its own conditional market on the score it will reach, quoted by an LMSR (logarithmic market scoring rule) market maker with a liquidity of 1,000 **play credits**. Buying "higher" pays the score / 1,000 per share, "lower" pays the rest;
- bots trade where they disagree most with the price: their belief is the forecast, bent by their priorities (cost-first members lean to the cheaper design, science-first to the upgrade, safety-first to the higher success odds) plus noise. The player picks an option, higher or lower, and a stake;
- the council adopts the option with the highest market price;
- after the flight, only the adopted option's market settles against the actual score; trades in the other options are refunded, because their condition never happened. A design changed after the market closed refunds everything;
- every member keeps a forecasting record (play credits won or lost). A better record scales a bot's trading budget from half to double, so accurate forecasters get more say. The record is kept in the browser.

**Play credits only. No real money.**

## 4. Ratification: 4-of-4 quantum-safe multisig

Before launch, every council member signs the **manifest hash** (SHA-256 of the canonical design JSON). Each signature is **hybrid**: ed25519 (classical, what Solana uses today) plus **ML-DSA-65** (NIST FIPS 204, post-quantum). A launch needs all four. Verification runs in the browser and the debrief shows the hashes.

Why hybrid: today's signatures (ECDSA, ed25519) are breakable by a large quantum computer; space infrastructure lives 15-30 years. Hybrid signatures stay secure if either scheme holds. This is Manuel's thread through the whole game, and it becomes physical in Moon Base Zero's Earth–Moon link.

## 5. Spare capacity market (rideshare)

Launches often fly with unused capacity. After the build step, the spare mass and power become a market: smaller agencies offer payloads that pay into the treasury and add science. The player picks what fits (a knapsack trade-off). In the full product this is a matching market with escrow; in the game it is a curated set of offers.

## 6. Open Tech Registry (DeSci)

Members publish technology as **blueprints**: open designs with a content hash, an author, and a parent if forked. Adopting a blueprint changes numbers (e.g. −12% array mass) and credits its author; forks form visible lineage trees ("KASA forked ESA's array, ISRO forked KASA's"). At the end, the player can publish their own design. In the full product blueprints become IP-NFT-style records with attribution and reputation; in the game they live in local state, then Supabase, optionally anchored on-chain.

## What is real and what is simulated this weekend

| Piece | This weekend | Full product |
|---|---|---|
| Council, values vote, bot reviews | Simulated in the browser (engine + bots) | Real members, multiplayer |
| Futarchy market | Real Monte Carlo forecasts, LMSR market maker per option, bot and player trades settled after the flight, forecasting records, play credits | Conditional markets (MetaDAO-style) with play credits or grants |
| Signatures | **Real** ed25519 + ML-DSA-65 in the browser | Same, plus on-chain multisig (e.g. Squads on Solana) |
| On-chain anchor | **Optional**: Worker relayer writes the manifest hash with the Solana Memo program on **devnet**; debrief links the explorer | Mainnet anchoring of ratified missions and blueprints |
| Open Tech Registry | Local seed + publish to Supabase | Content-addressed storage + on-chain attribution |
| Rideshare | Curated offers | Open matching market with escrow |

The game never waits on a chain. If the relayer is down or not configured, the debrief says "anchor not available" and everything else works.

## Why Solana devnet for the optional anchor

No contract to write or audit (the Memo program already exists), fast confirmations, free devnet SOL, the team's partnership with the Solana community, and futarchy's production home (MetaDAO) is on Solana. If Charlie prefers EVM, Base Sepolia with a 20-line event contract is the alternative; the types keep the anchor field generic enough to switch.
