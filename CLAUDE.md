@AGENTS.md

# Lander Manifest: rules for every Claude on this team

Four people build this at NASA Space Apps 2026 in Florianópolis, each with their own Claude. Submission closes Sunday 2026-11-15 at 23:59 Florianópolis time (America/Sao_Paulo).

Challenge: Space Mission Design Game, https://www.spaceappschallenge.org/2026/challenges/space-mission-design-game/

## What we're building

A team plans a commercial Moon landing. The lander has a fixed amount of mass, power, heat rejection and data to share. More payloads want a seat than fit, and customers pay to fly. The team picks the lander, the landing site and the manifest, then the game flies it: launch, landing, one lunar day of work, and night. In team mode, up to 4 players split the roles. In the futarchy round, teams put forward competing manifests, everyone stakes play tokens on how each will score, the fund backs the top ones, and the flight results settle the stakes.

## Who owns what

Work only inside your folder. If a change needs someone else's folder, tell that person or open an issue.

| Folder | What | Owner |
| --- | --- | --- |
| `src/types.ts` | contract between folders | everyone, by agreement |
| `src/data` | catalog JSON with sources | TBD |
| `src/sim` | flight engine and its tests | TBD |
| `src/app`, `src/ui` | screens | TBD |
| `src/play`, `supabase` | rooms, team mode, futarchy round | TBD |
| `contracts` | mission record on Arbitrum Sepolia | TBD |

`src/types.ts` changes only when the team agrees. Put `[types]` in the commit title.

## Workflow

- Small commits, often. Before every push: `npm run check` (lint, types, tests) passes, then `git pull --rebase origin main`, then push to main.
- Use a branch and a pull request only for `src/types.ts` or another owner's folder.
- CI runs the same check on every push. If main goes red, the person who broke it fixes it first.
- Never commit `.env.local` or any key.

## NASA rules (break one and the project can't be judged)

- Every number in `src/data` has a source (title and URL). `verified` stays false until a person has checked the number against the source.
- The README lists every NASA dataset or document we use. At least one is required.
- No NASA logos, flags or mission patches anywhere, especially in AI-made images.
- AI-made images and video carry a visible watermark. AI-made code, data and audio are noted in the README under Use of AI.
- Our code is Apache 2.0. Every library, image, font, sound or dataset we add must be free to use, and goes in the README references with its license.
- No promotion of commercial products: no product plugs, no "made with" credits, no token sales.
- Play tokens only, test networks only. Real money never moves.
- No names, voices or faces of anyone under 18. No personal data.
- English in the UI and the docs.
- No services or tools from Chinese-owned companies.

## Code

- TypeScript strict. `src/sim` is pure: the same manifest, catalog, budget and seed always give the same result. Never call `Math.random` there; use `makeRng`.
- UI labels are bare nouns and verbs ("Lander", "Fly"). No filler text under controls.
- Keys that are server-only stay on the server: `SUPABASE_SECRET_KEY`, `RELAYER_PRIVATE_KEY`.
- Run it: `npm install`, `npm run dev`, then open http://localhost:3000.
