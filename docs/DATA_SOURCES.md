# Data sources

Every real-world number and every API we use is listed here and in the README. Tested from Florianópolis on 2026-11-14.

## Live APIs (through our Worker, `/api/live/*`, cached, with bundled snapshots as fallback)

| API | What we use it for | Endpoint | Key | Status 2026-11-14 |
|---|---|---|---|---|
| NASA DONKI (CCMC) | Real coronal mass ejections (CME) and geomagnetic storms (GST) of the last 30 days trigger space-weather events in the flight | `https://api.nasa.gov/DONKI/CME`, `/DONKI/GST` (`/DONKI/FLR` returned 404 today) | `NASA_API_KEY` (DEMO_KEY works, 30 req/h) | ✅ CME, GST |
| NASA EONET v3 | Open natural events (wildfires, storms, volcanoes) as Earth Guardian targets on the globe | `https://eonet.gsfc.nasa.gov/api/v3/events?status=open` | none | ✅ |
| JPL Horizons | Real Earth–Moon distance today → light delay for Moon comms | `https://ssd.jpl.nasa.gov/api/horizons.api` | none | ✅ |
| NASA SSCWeb | Real ISS position for Orbital Lab | `https://sscweb.gsfc.nasa.gov/WS/sscr/2/locations/iss/{start},{end}/geo/` | none | ✅ |
| NASA DSN Now | Live Deep Space Network dishes (Goldstone, Madrid, Canberra) and what they track, for the comms panel | `https://eyes.nasa.gov/dsn/data/dsn.xml` | none | ✅ |
| NASA APOD | Astronomy picture of the day (intro/debrief backdrop) | `https://api.nasa.gov/planetary/apod` | `NASA_API_KEY` | ✅ with `date=` |
| NASA FIRMS | Active fire hotspots (MODIS/VIIRS) for Earth Guardian (stretch) | `https://firms.modaps.eosdis.nasa.gov/api/area/` | `FIRMS_MAP_KEY` (free) | needs key |
| NASA Image and Video Library | Public-domain imagery for mission backdrops (check: no logos in the image) | `https://images-api.nasa.gov/search` | none | ✅ |
| NASA NeoWs / JPL CNEOS CAD | Near-Earth asteroid close approaches (possible flavor event) | `https://api.nasa.gov/neo/rest/v1/feed`, `https://ssd-api.jpl.nasa.gov/cad.api` | key / none | ✅ |

**Keys to request (free, takes 2 minutes, do it today):**
- NASA API key at https://api.nasa.gov (1,000 requests/hour instead of DEMO_KEY's 30/hour).
- FIRMS MAP_KEY at https://firms.modaps.eosdis.nasa.gov/api/map_key/.
Put them in `.dev.vars` locally and `wrangler secret put NASA_API_KEY` / `FIRMS_MAP_KEY` in production. Never paste keys in chat, issues or commits.

## Used by Operations and the 3D scenes

- NASA DONKI storms, DSN Now load and EONET events feed the Operations schedule (`src/lib/opsLive.ts`).
- Textures: NASA Blue Marble, Black Marble, SVS CGI Moon Kit (LRO LROC color, LOLA elevation). Credits in `public/textures/CREDITS.md`.
- Operations numbers cite Mazarico et al. 2011 (polar illumination), LCROSS (ice in Cabeus), NASA Veggie, CubeSat 101 (`src/ops/sources.ts`).
- Challenge resources reviewed 2026-11-14 (downloads and a summary in the parent folder `reference/nasa-resources/`): NASA "Design and Develop a Science Mission" deck (lifecycle: need, concept, requirements, design, build and verify, implement), NASA CubeSat 101 (16 phases, margins, operations), JPL Concept Maturity Levels paper, Goddard Mission Design Lab, GMAT, NASA mission-viz, Webb "Build It Yourself", CSA games.

## Reference datasets and documents (static numbers in `src/data/`)

Each entry in `src/data/*.ts` carries its own `sources`. Main families:
- Launch vehicles: provider user guides and payload planner's guides, published prices, flight records.
- Cargo craft, landers and instruments: NASA, ESA, JAXA, ISRO mission pages; NASA CLPS; NSSDCA; NTRS papers.
- Lunar south pole illumination and Earth visibility: LRO LOLA based studies (e.g. Mazarico et al. 2011; Gläser et al.), NASA Artemis candidate regions.
- ISS resources: NASA ISS researcher's guides (EXPRESS rack power and data).
- Earth observation: NISAR, VIIRS, ECOSTRESS, Landsat mission pages; SAR data rates.
- Agencies: official agency sites and budgets.

More NASA and partner data catalogs (from the Florianópolis data atlas): Earthdata Search, GIBS/Worldview, LRO LOLA/LROC, PDS, Lunar ODE, OSDR, NASA POWER, CDAWeb, SVS.

## Sourcing rules

1. A real number needs a source you opened that states it. Derived numbers say how in a `// derived:` comment.
2. `verified: false` until a human checks the number against the source. Before submission, the data owner of each file flips verified entries.
3. Game values (perk sizes, science points, treasury contributions) are labeled `// game value`. They need no source but must be plausible.
4. Never invent a URL.
