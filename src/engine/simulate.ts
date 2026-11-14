import type {
  Catalog,
  EventTemplate,
  FlightEvent,
  FlightPhase,
  FlightPhaseId,
  FlightResult,
  LiveContext,
  MissionDesign,
  Objective,
  Source,
  TelemetrySample,
} from "./types";
import { fmt, resolveDesign } from "./design";
import { makeRng } from "./rng";
import { applyStat, effectiveModifiers } from "./modifiers";
import { computeResources, effectiveLinkFraction, moduleDownlinkGb, moduleGeneratesW, modulePowerW, onboardKeep } from "./resources";
import { validateDesign } from "./validate";
import { scoreFlight, ZERO_SCORE, type UnitOutcome } from "./score";

const MAX_SAMPLES = 120;
const LUNAR_CYCLE_DAYS = 29.5;
const EONET_CAP = 40;
const EONET_FEED_LINES = 5;
const EONET_BONUS = 0.5;

interface Unit {
  id: string;
  moduleId?: string;
  name: string;
  category: string;
  satisfies: string[];
  powerW: number;
  genW: number;
  independent: boolean;
  storageWh: number;
  dataPerDay: number;
  downlinkPerDay: number;
  reliability: number;
  scienceValue: number;
  isModule: boolean;
  failed: boolean;
  produced: number;
  queued: number;
  returned: number;
}

function thin<T>(xs: T[], cap: number): T[] {
  if (xs.length <= cap) return xs;
  const out: T[] = [];
  for (let i = 0; i < cap; i++) {
    const x = xs[Math.round((i * (xs.length - 1)) / (cap - 1))];
    if (x !== undefined) out.push(x);
  }
  return out;
}

export function simulateFlight(
  design: MissionDesign,
  catalog: Catalog,
  seed: number,
  live?: LiveContext,
): FlightResult {
  const issues = validateDesign(design, catalog);
  const blockers = issues.filter((i) => i.severity === "blocker");
  const events: FlightEvent[] = [];
  const push = (day: number, phase: FlightPhaseId, kind: FlightEvent["kind"], title: string, text: string, liveSource?: Source) =>
    events.push({ day, phase, kind, title, text, ...(liveSource ? { liveSource } : {}) });

  if (blockers.length > 0) {
    for (const b of blockers) push(0, "launch", "failure", "Launch scrubbed", `${b.text} ${b.fix}`);
    const lessons = blockers.slice(0, 4).map((b) => `${b.text} ${b.fix}`);
    lessons.push("A design with a blocker never reaches the pad, so it scores zero. Clear every red issue before you trust a forecast.");
    while (lessons.length < 3) lessons.push("Check the council review: each partner names the problems in its own area.");
    return {
      seed,
      success: false,
      lostAt: "launch",
      events,
      telemetry: [],
      objectivesMet: [],
      dataReturnedGb: 0,
      score: { ...ZERO_SCORE },
      lessons: lessons.slice(0, 6),
    };
  }

  const rng = makeRng(seed);
  const r = resolveDesign(design, catalog);
  const mods = effectiveModifiers(design, catalog);
  const rep = computeResources(design, catalog);
  const mid = design.missionId;
  const { mission, vehicle, destination, carrier } = r;
  if (!vehicle || !destination) throw new Error("Design passed validation without a vehicle or destination");
  const linkFrac = effectiveLinkFraction(r);
  const lunar = destination.orbitClass === "TLI";
  const opsDays = Math.max(1, mission.phases.filter((p) => p.id === "operations").reduce((s, p) => s + Math.round(p.days), 0));
  // The design life (lifetime gauge capacity): operations stop on that day if it comes first.
  const lifeDays = rep.lifetime.capacity;
  // The carrier's reliability is its arrival roll; once it has arrived it does not roll again.
  const carrierIndex = carrier ? r.modules.indexOf(carrier) : -1;
  // success chances with the council's perks, quoted the same way in events and lessons
  const launchP = Math.min(1, vehicle.reliability * applyStat(1, "launchReliability", mods, { missionId: mid }));
  const arrivalP = Math.min(
    1,
    (carrier?.reliability ?? 0.98) * destination.arrivalFactor * applyStat(1, "landingReliability", mods, { missionId: mid }),
  );
  // first operations day of lunar night: the cold, not a random day, is what ends a lander
  const firstNight = Math.ceil(destination.sunlightFraction * LUNAR_CYCLE_DAYS);

  const units: Unit[] = [
    ...r.modules.map((m, i): Unit => ({
      id: m.id,
      moduleId: m.id,
      name: m.name,
      category: m.category,
      satisfies: m.satisfies ?? [],
      powerW: modulePowerW(m, mods, mid),
      genW: moduleGeneratesW(m, mods, mid),
      independent: !!m.sunlightIndependent,
      storageWh: m.storageWh ?? 0,
      dataPerDay: m.dataGbPerDay ?? 0,
      downlinkPerDay: moduleDownlinkGb(m, mods, mid),
      reliability: i === carrierIndex ? 1 : m.reliability,
      scienceValue: m.scienceValue ?? 0,
      isModule: true,
      failed: false,
      produced: 0,
      queued: 0,
      returned: 0,
    })),
    ...r.rideshares.map((o): Unit => ({
      id: o.id,
      name: o.payloadName,
      category: "rideshare",
      satisfies: [],
      powerW: o.powerW,
      genW: 0,
      independent: false,
      storageWh: 0,
      dataPerDay: o.dataGbPerDay,
      downlinkPerDay: 0,
      reliability: 1,
      scienceValue: o.scienceValue,
      isModule: false,
      failed: false,
      produced: 0,
      queued: 0,
      returned: 0,
    })),
  ];
  const alive = (u: Unit) => !u.failed;
  // Data a unit is planned to send: its raw output after nominal on-board screening, so screening
  // shrinks the downlink without shrinking the science.
  const nominalKeep = onboardKeep(
    units.reduce((s, u) => s + Math.max(0, u.dataPerDay), 0),
    units.reduce((s, u) => s + Math.max(0, -u.dataPerDay), 0),
  );
  const plannedOf = (u: Unit) => Math.max(0, u.dataPerDay) * nominalKeep * opsDays;

  let day = 0;
  let lostAt: FlightPhaseId | undefined;
  let reachedOps = false;
  let powerLoss = 0;
  let blackoutLeft = 0;
  let skipDays = 0;
  let bonusScience = 0;
  let observed = 0;
  let feedLines = 0;
  let battery = 0;
  let linkUpNow = false;
  let throttledDays = 0;
  let firstThrottleDay = -1;
  let streakWh = 0;
  let streakDays = 0;
  let worst = { wh: 0, days: 0 };
  let startBattery = 0;
  /** day the spacecraft reached its design life and went quiet; -1 if it lasted the mission */
  let quietDay = -1;
  const samples: TelemetrySample[] = [];

  const queuedTotal = () => units.reduce((s, u) => s + u.queued, 0);
  const returnedTotal = () => units.reduce((s, u) => s + u.returned, 0);
  const sample = (d: number, phase: FlightPhaseId, powerW: number) =>
    samples.push({ day: d, phase, powerW, batteryWh: battery, dataQueuedGb: queuedTotal(), dataReturnedGb: returnedTotal(), linkUp: linkUpNow });

  const mitigation = (t: EventTemplate): number => {
    let f = 1;
    for (const m of t.mitigatedBy ?? []) {
      const hit =
        (m.category !== undefined && r.modules.some((x) => x.category === m.category)) ||
        (m.moduleId !== undefined && design.moduleIds.includes(m.moduleId));
      if (hit) f *= m.factor;
    }
    return f;
  };

  /** applies an event's effect; returns true if the mission is lost */
  const fire = (t: EventTemplate, at: number, liveSource?: Source, text?: string): boolean => {
    const loss = t.effect.kind === "mission-loss";
    push(at, t.phase, loss ? "failure" : "warning", t.title, text ?? t.text, liveSource);
    switch (t.effect.kind) {
      case "lose-science":
        for (const u of units) {
          u.queued *= 1 - t.effect.share;
        }
        break;
      case "lose-days":
        if (t.phase === "operations") skipDays += t.effect.days;
        else day += t.effect.days;
        break;
      case "lose-power":
        powerLoss = 1 - (1 - powerLoss) * (1 - t.effect.share);
        break;
      case "comms-blackout":
        blackoutLeft = Math.max(blackoutLeft, t.effect.days);
        break;
      case "mission-loss":
        break;
    }
    return loss;
  };

  const rollEvents = (phase: FlightPhase): boolean => {
    for (const t of mission.events) {
      if (t.phase !== phase.id) continue;
      if (rng() < t.chance * mitigation(t) && fire(t, day, undefined)) return true;
    }
    return false;
  };

  const cme = live?.spaceWeather.find((w) => w.kind === "CME") ?? live?.spaceWeather.find((w) => w.kind === "GST");
  const liveTemplate = cme ? mission.events.find((t) => t.phase === "operations" && t.liveFeed?.startsWith("donki")) : undefined;

  const requiresOk = (req: Objective["requires"]): boolean =>
    (req.categories ?? []).every((c) => units.some((u) => u.category === c && alive(u))) &&
    (!req.moduleIds?.length || req.moduleIds.some((id) => units.some((u) => u.moduleId === id && alive(u))));
  const dataShare = (us: Unit[]): number => {
    const planned = us.reduce((s, u) => s + plannedOf(u), 0);
    return planned > 0 ? us.reduce((s, u) => s + u.returned, 0) / planned : 1;
  };

  for (const phase of mission.phases) {
    if (phase.id === "operations") {
      reachedOps = true;
      const days = Math.max(1, Math.round(phase.days));
      const start = day;
      battery = units.reduce((s, u) => s + u.storageWh, 0);
      startBattery = battery;
      const scheduled = new Map<number, EventTemplate[]>();
      for (const t of mission.events) {
        if (t.phase !== "operations" || t === liveTemplate) continue;
        if (rng() < t.chance * mitigation(t)) {
          const roll = Math.floor(rng() * days);
          const d = lunar && t.effect.kind === "mission-loss" && firstNight < days ? firstNight : roll;
          scheduled.set(d, [...(scheduled.get(d) ?? []), t]);
        }
      }
      let lost = false;
      for (let d = 0; d < days && !lost; d++) {
        const today = start + d;
        if (d >= lifeDays) {
          quietDay = today;
          push(
            today,
            "operations",
            "failure",
            "Design life reached",
            `The spacecraft was built to last ${fmt(lifeDays)} days of operations and went quiet on day ${today}, ${fmt(days - d)} days before the end of the mission.`,
          );
          break;
        }
        for (const u of units) {
          if (u.failed) continue;
          if (rng() < (1 - u.reliability) / days) {
            u.failed = true;
            push(today, "operations", "failure", `${u.name} failed`, `${u.name} stopped working on day ${today}. It no longer produces power or data.`);
          }
        }

        const sunlit = lunar ? d % LUNAR_CYCLE_DAYS < destination.sunlightFraction * LUNAR_CYCLE_DAYS : true;
        const solarShare = lunar ? (sunlit ? 1 : 0) : destination.sunlightFraction;
        const gen = units.reduce((s, u) => (alive(u) ? s + u.genW * (u.independent ? 1 : solarShare) : s), 0) * (1 - powerLoss);
        const load = units.reduce((s, u) => (alive(u) ? s + u.powerW : s), 0);
        const cap = units.reduce((s, u) => (alive(u) ? s + u.storageWh : s), 0);
        const avail = Math.min(battery, cap) + gen * 24;
        const need = load * 24;
        let throttle = 1;
        if (avail >= need) battery = Math.min(cap, avail - need);
        else {
          throttle = need > 0 ? avail / need : 1;
          battery = 0;
        }
        const deficit = Math.max(0, need - gen * 24);
        if (deficit > 0) {
          streakWh += deficit;
          streakDays++;
          if (streakWh > worst.wh) worst = { wh: streakWh, days: streakDays };
        } else {
          streakWh = 0;
          streakDays = 0;
        }
        if (throttle < 1) {
          throttledDays++;
          if (firstThrottleDay < 0) {
            firstThrottleDay = today;
            push(today, "operations", "warning", "Power shortfall", `The batteries ran dry on day ${today}. Instruments are running at ${fmt(throttle * 100)}% until power returns.`);
          }
        }

        const roll = rng();
        const hasComm = units.some((u) => alive(u) && u.downlinkPerDay > 0);
        linkUpNow = roll < linkFrac && blackoutLeft <= 0 && hasComm;
        if (blackoutLeft > 0) blackoutLeft--;

        const producing = skipDays > 0 ? 0 : 1;
        if (skipDays > 0) skipDays--;
        const gains = units.map((u) => (alive(u) ? Math.max(0, u.dataPerDay) * throttle * producing : 0));
        const cuts = units.reduce((s, u) => (alive(u) && u.dataPerDay < 0 ? s - u.dataPerDay : s), 0) * throttle * producing;
        const gross = gains.reduce((s, g) => s + g, 0);
        const keep = onboardKeep(gross, cuts);
        units.forEach((u, i) => {
          const g = (gains[i] ?? 0) * keep;
          u.produced += g;
          u.queued += g;
        });
        if (linkUpNow) {
          const q = queuedTotal();
          const send = Math.min(q, units.reduce((s, u) => (alive(u) ? s + u.downlinkPerDay : s), 0));
          if (q > 0 && send > 0)
            for (const u of units) {
              const part = (u.queued / q) * send;
              u.queued -= part;
              u.returned += part;
            }
        }

        if (mid === "earth-guardian" && live && linkUpNow && throttle >= 1 && observed < Math.min(EONET_CAP, live.earthEvents.length)) {
          const ev = live.earthEvents[observed];
          observed++;
          bonusScience += EONET_BONUS;
          if (ev && feedLines < EONET_FEED_LINES) {
            feedLines++;
            push(today, "operations", "info", "Live Earth event imaged", `Imaged ${ev.category} ${ev.title} from NASA EONET.`, { title: `NASA EONET ${ev.title}`, url: ev.link });
          }
        }

        if (liveTemplate && cme && d === Math.floor(days / 3)) {
          const date = cme.time.slice(0, 10);
          lost = fire(liveTemplate, today, { title: `NASA DONKI ${cme.kind} ${cme.time}`, url: cme.link }, `${liveTemplate.text} NASA DONKI recorded a real ${cme.kind} on ${date}: ${cme.note}`);
        }
        for (const t of scheduled.get(d) ?? []) if (!lost) lost = fire(t, today);

        sample(today, "operations", gen * throttle);
      }
      day = start + days;
      if (lost) {
        lostAt = "operations";
        break;
      }
      continue;
    }

    if (phase.id === "launch") {
      if (!(rng() < launchP)) {
        push(day, "launch", "failure", "Launch failure", `${vehicle.name} failed during launch (it succeeds ${fmt(launchP * 100)}% of the time).`);
        lostAt = "launch";
        break;
      }
      push(day, "launch", "success", "Liftoff", `${vehicle.name} launched on schedule.`);
    } else if (phase.id === "arrival") {
      if (!(rng() < arrivalP)) {
        push(day, "arrival", "failure", "Arrival failed", `The spacecraft was lost during arrival at ${destination.name} (success chance ${fmt(arrivalP * 100)}%).`);
        lostAt = "arrival";
        break;
      }
      push(day, "arrival", "success", "Arrival", `The spacecraft arrived at ${destination.name}.`);
    }
    if (rollEvents(phase)) {
      lostAt = phase.id;
      break;
    }
    const n = Math.max(1, Math.ceil(phase.days));
    for (let i = 0; i < n; i++) sample(day + i, phase.id, 0);
    day += phase.days;
  }

  // objectives: a spacecraft that went quiet before the end of operations meets none
  const objectivesMet: string[] = [];
  if (reachedOps && quietDay < 0) {
    const all = dataShare(units);
    if (all >= 0.5 && requiresOk(mission.primaryObjective.requires)) objectivesMet.push(mission.primaryObjective.id);
    for (const id of design.secondaryObjectiveIds) {
      const obj = mission.secondaryObjectives.find((o) => o.id === id);
      if (!obj) continue;
      const mine = units.filter(
        (u) =>
          u.satisfies.includes(id) ||
          (obj.requires.categories ?? []).includes(u.category as never) ||
          (u.moduleId !== undefined && (obj.requires.moduleIds ?? []).includes(u.moduleId)),
      );
      if (requiresOk(obj.requires) && dataShare(mine) >= 0.5) objectivesMet.push(id);
    }
  }
  const primaryMet = objectivesMet.includes(mission.primaryObjective.id);
  const success = !lostAt && primaryMet;
  const returned = returnedTotal();
  const planned = units.reduce((s, u) => s + plannedOf(u), 0);

  const outcomes: UnitOutcome[] = units.map((u) => ({
    category: u.category,
    scienceValue: u.scienceValue,
    planned: plannedOf(u),
    returned: u.returned,
    failed: u.failed,
    isModule: u.isModule,
  }));
  const score = scoreFlight(design, catalog, { success, reachedOperations: reachedOps, objectivesMet, units: outcomes, bonusScience }, rep);

  if (success)
    push(day, "end", "success", "Mission complete", `${fmt(returned)} Gb of ${fmt(planned)} Gb planned reached Earth and the primary objective was met.`);
  else if (!lostAt && quietDay >= 0)
    push(day, "end", "warning", "Mission ended early", `The spacecraft stopped on day ${quietDay}, before the ${fmt(opsDays)} days of operations were done, so the primary objective was not met.`);
  else if (!lostAt)
    push(day, "end", "warning", "Mission fell short", `Only ${fmt(returned)} Gb of ${fmt(planned)} Gb planned reached Earth, so the primary objective was not met.`);

  // lessons
  const lessons: string[] = [];
  if (lostAt === "launch")
    lessons.push(`${vehicle.name} has a ${fmt((1 - launchP) * 100)}% chance of failing at launch and this was one of those flights.`);
  if (lostAt === "arrival")
    lessons.push(`Arrival is the riskiest step: the carrier and destination gave only a ${fmt(arrivalP * 100)}% chance, so a more reliable carrier or an easier site buys safety.`);
  if (lostAt && lostAt !== "launch" && lostAt !== "arrival") {
    const last = [...events].reverse().find((e) => e.kind === "failure");
    lessons.push(`The mission was lost in ${lostAt}${last ? ` (${last.title}: ${last.text})` : ""}. Modules that mitigate this risk lower its chance.`);
  }
  if (quietDay >= 0)
    lessons.push(
      `The design was built to last ${fmt(lifeDays)} days but the mission needs ${fmt(mission.durationDays)}, so the spacecraft went quiet on day ${quietDay}. ${lunar ? "Radioisotope heaters or a fuel cell keep a lander alive through the lunar night." : "A longer-lived carrier, or thermal and battery modules rated for the full mission, fixes it."}`,
    );
  if (throttledDays > 0)
    lessons.push(
      `Your batteries held ${fmt(startBattery)} Wh but ${worst.days} day${worst.days === 1 ? "" : "s"} ${lunar ? "of lunar night" : "of low generation"} needed ${fmt(worst.wh)} Wh, so instruments ran at reduced output from day ${firstThrottleDay} on (${throttledDays} throttled days). More storage, sunlight-independent power such as an RTG, or a smaller load would have saved it.`,
    );
  const failedUnits = units.filter((u) => u.failed);
  if (failedUnits.length > 0)
    lessons.push(`${failedUnits.map((u) => u.name).join(", ")} failed during operations. Each module has a small chance of failing, so reliable parts and redundancy matter on long missions.`);
  if (reachedOps && planned > 0 && quietDay < 0) {
    const left = queuedTotal();
    const deadLink = units.find((u) => u.failed && u.downlinkPerDay > 0);
    const linkLeft = units.some((u) => !u.failed && u.downlinkPerDay > 0);
    if (left > planned * 0.1 && deadLink && !linkLeft)
      lessons.push(`${fmt(left)} Gb were still waiting on board at the end because the ${deadLink.name} failed and nothing else could send data home. A second comms module keeps the link if one fails.`);
    else if (left > planned * 0.1)
      lessons.push(`${fmt(left)} Gb were still waiting on board at the end because the link was up only ${fmt(linkFrac * 100)}% of the time. A relay or a faster comms module would have returned more.`);
    else if (returned / planned >= 0.9) lessons.push(`${fmt((returned / planned) * 100)}% of the planned data reached Earth, so the comms link kept up with the instruments.`);
    else lessons.push(`Only ${fmt((returned / planned) * 100)}% of the planned data reached Earth, because instruments were throttled, modules failed or events destroyed queued data.`);
  }
  const tightest = Object.values(rep).sort((a, b) => b.used / (b.capacity || 1) - a.used / (a.capacity || 1))[0];
  if (tightest)
    lessons.push(`Your tightest resource was ${tightest.key} at ${fmt((tightest.used / (tightest.capacity || 1)) * 100)}% used. Real missions keep 10-20% margin because problems always show up late.`);
  if (success && throttledDays === 0 && failedUnits.length === 0) lessons.unshift("Everything worked: power, comms and the carrier all held, so the instruments returned what they were built for.");
  lessons.push("One flight is one roll of the dice, so run the forecast to see the odds across many seeds before you commit.");

  return {
    seed,
    success,
    ...(lostAt ? { lostAt } : {}),
    events,
    telemetry: thin(samples, MAX_SAMPLES),
    objectivesMet,
    dataReturnedGb: returned,
    score,
    lessons: lessons.slice(0, 6),
  };
}
