# Lander Manifest

Working title. NASA Space Apps Challenge 2026, Florianópolis. Challenge: [Space Mission Design Game](https://www.spaceappschallenge.org/2026/challenges/space-mission-design-game/).

A team plans a commercial Moon landing. The lander has a fixed amount of mass, power, heat rejection and data to share, more payloads want a seat than fit, and customers pay to fly. The team picks the lander, the landing site and the manifest, then the game flies it: launch, landing, one lunar day of work, and night. Up to 4 players can split the roles, and in the futarchy round teams stake play tokens on whose manifest will score best.

## Run it

Node 22 or newer.

```
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. `npm run check` runs lint, types and tests. The game works without Supabase; team mode needs the keys in `.env.local`.

## Folders

| Folder | What |
| --- | --- |
| `src/types.ts` | shared types between folders |
| `src/data` | landers, payloads, sites and rockets, with sources |
| `src/sim` | the flight engine |
| `src/app`, `src/ui` | screens |
| `src/play` | team mode and the futarchy round |
| `supabase` | database schema |
| `contracts` | mission record on Arbitrum Sepolia (test network) |

## Team

Carlos-Sotop, xdayon, Eric-lsg, Galmanus.

## NASA data and other references

Every number in `src/data` lists its source. The catalog starts with placeholders (`verified: false`) until each number is checked.

- NASA: [Space Mission Design Game challenge resources](https://www.spaceappschallenge.org/2026/challenges/space-mission-design-game/?tab=resources)

Libraries: Next.js (MIT), React (MIT), Tailwind CSS (MIT), Supabase JS (MIT), Vitest (MIT).

## Use of AI

Code in this repository is written with Claude (Anthropic) and reviewed by the team. Commits made with Claude carry a `Co-Authored-By: Claude` line.

## License

Apache 2.0. See [LICENSE](LICENSE).
