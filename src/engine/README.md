# SpaceDAO mission engine

Pure TypeScript, deterministic, no DOM, no Node APIs. Units: kg, W, Wh, $M, Gb, days. Randomness comes only from `makeRng(seed)` (mulberry32).

## Modifiers
Perks of the lead and the 3 partners plus every adopted blueprint. For a stat: all matching `mul` values multiply the base, then all `add` values are added. `scope.category` limits a modifier to modules of that category, `scope.missionId` to that mission.

## Resources (`computeResources`)
The carrier is the first `lander` or `bus` module with `payloadCapacityKg`. Payload = all other modules + rideshares. Status: `over` above 100% used, `tight` above `TIGHT_RATIO` (90%).
- mass: used = payload mass. capacity = min(carrier payload limit, rocket capacity - carrier mass); rocket capacity = vehicle capacity to the orbit class x destination.capacityFactor x launchCapacity modifiers. No carrier: rocket capacity. No vehicle or destination: 0.
- power: capacity = sum of generatesW x (1 if sunlight-independent, else sunlightFraction) x powerGeneration. used = module powerW x modulePower + rideshare powerW.
- budget: capacity = (base treasury + member contributions + rideshare payments) with treasury modifiers. used = launch cost x launchCost + module cost x moduleCost.
- data: used = raw data - on-board cut. Computer modules may have a negative dataGbPerDay (edge preprocessing drops cloudy images); together they cut at most `MAX_ONBOARD_CUT` (67%) of the raw data, the share of Earth that is cloud-covered at any time (NASA Earth Observatory). The screening lines in the breakdown show the cut that applies. capacity = sum of downlink x downlinkRate x link fraction.
- comms: used = required link fraction. capacity = min(1, destination.earthLinkFraction + comms module bonuses).
- lifetime: used = duration. base = the carrier's lifetimeDays if defined, else 1.5 x duration. capacity = max(base, longest lifetimeDays among thermal and battery modules), then lifetime modifiers. Other categories' lifetimeDays are ignored. In flight, operations stop when the capacity runs out (see Flight).

## Validation (`validateDesign`)
Blockers: missing vehicle, destination, modules or required category; mass over; budget over; vehicle cannot reach the orbit class; more than MAX_SECONDARY secondaries; the primary objective's modules missing. Warnings: unmet secondary requirements, power over (a blocker at the station, orbit class ISS: it switches off any payload above its allocation), data over, comms under, lifetime under (the text says the design will go quiet and miss the main objective), any tight resource, batteries smaller than (load - sunlight-independent power) x dark hours, except at the station, which powers payloads through eclipse (Moon: (1 - sunlight) x 708 h; orbit: (1 - sunlight) x 1.5 h). Every issue has plain `text` and a concrete `fix`.

## Council
- Weights: contribution / total. Values: weighted average of priorities, the lead using the player's values, normalized to 1.
- Review: each bot owns the domains of its strongest capabilities (strength 2+ or its best). An issue is raised only by the bot owning its domain (mass: launch; power, lifetime: spacecraft; budget: budget; data: science; comms: comms). A domain no partner owns goes to the partner with the highest priorities.safety. `veto` for a blocker it raises, or priorities.safety >= 0.45 with an over resource it raises. `concern` for any other issue it raises. No issues: `approve`.
- defaultDesign tries destinations x vehicles x carriers with the cheapest module of each required category (and what the primary objective needs) and returns the cheapest design with no blockers, falling back to the first choices.

## Flight (`simulateFlight`)
Blockers: no launch, score 0. Otherwise walk the phases. Launch succeeds if rng < vehicle reliability x launchReliability. Arrival succeeds if rng < carrier reliability (0.98 without carrier) x arrivalFactor x landingReliability. Other phases roll their events.
Operations, per day: if the day reaches the design life (lifetime capacity, rounded down), the spacecraft goes quiet: a "Design life reached" event, operations end, and the flight meets no objectives. Each module except the carrier fails with probability (1 - reliability) / days (once); the carrier's reliability was its arrival roll, so it is not rolled again. Solar output follows the destination: on the Moon a 29.5-day cycle (lit for sunlightFraction of it), elsewhere a daily average of sunlightFraction. Energy = battery + generation x 24 h against load x 24 h; a shortfall throttles science proportionally and warns once. Link is up if rng < link fraction. Data is queued and sent up to the downlink capacity. Events roll once at phase start with chance x mitigations and land on a random day. A live CME or GST fires the first `donki*` template once, with a NASA DONKI source. In `earth-guardian`, each live Earth event (max 40) imaged with link and power fine adds 0.5 science; at most 5 feed lines.
Primary objective met: operations reached and completed within the design life, at least 50% of planned data returned, required modules flown and not failed. Planned data is each module's raw output x the nominal on-board keep share x operations days, so screening shrinks what must come down without shrinking the science. A secondary also needs 50% of its own modules' data. Success = not lost and primary met. Telemetry: one sample per day, thinned to 120.

## Score
- science = min(100, 100 x returned / reference). Reference is per mission: primary value + 2 best secondaries + 3 best offered modules (x destination.scienceFactor x scienceValue modifiers) + 2 best offered rideshares. Returned = met objectives + module science x data share + rideshare science.
- safety = 100 x (0.5 x average clamp(margin / 0.2) over 6 resources + 0.5 x launch x arrival x average reliability of the modules other than the carrier). The carrier is already in the arrival term.
- efficiency = 100 x (0.7 x treasury left share + 0.3 x rideshare revenue share).
- collaboration = min(100, 25 x members used + 10 x rideshares + 10 x blueprints).
- total = round(10 x (values.science x science + values.safety x safety + values.cost x efficiency) x (success ? 1 : 0.25) + 2 x collaboration). S >= 950, A >= 800, B >= 600, C >= 400, else F.

## Forecast
`simulateFlight` for seeds 1..runs (default 200): success share, mean total, p10, p90 (linear interpolation).

## Balance
`balance.test.ts` names at least three good and two bad designs per mission and checks them on the real catalog: good designs succeed in at least 60% of 200 flights, each mission's starting design in at least 65%, and bad designs succeed in at most 40% and fail for the reason they are named for (a blocker, a warning, or a flight event such as "Launch failure" or "Design life reached").
