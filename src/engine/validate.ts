import { MAX_SECONDARY, type Catalog, type Domain, type Issue, type MissionDesign, type ResourceKey } from "./types";
import { categoryDomain, fmt, getBlueprint, getLaunchVehicle, getModule, getObjective, resolveDesign } from "./design";
import { applyStat, blueprintFit, effectiveModifiers } from "./modifiers";
import { computeResources, massOverKg, moduleCostMUsd, moduleMassKg, modulePowerW } from "./resources";

export const RESOURCE_DOMAIN: Record<ResourceKey, Domain> = {
  mass: "launch",
  power: "spacecraft",
  budget: "budget",
  data: "science",
  comms: "comms",
  lifetime: "spacecraft",
};

const LUNAR_DAY_HOURS = 708;
const ORBIT_DARK_HOURS = 1.5;

export function validateDesign(design: MissionDesign, catalog: Catalog): Issue[] {
  const r = resolveDesign(design, catalog);
  const rep = computeResources(design, catalog);
  const mods = effectiveModifiers(design, catalog);
  const mid = design.missionId;
  const { mission, vehicle, destination, modules, payload } = r;
  const issues: Issue[] = [];
  const add = (i: Issue) => issues.push(i);

  if (!vehicle)
    add({
      id: "missing-launch-vehicle",
      domain: "launch",
      severity: "blocker",
      text: "No launch vehicle is chosen, so nothing can leave the ground.",
      fix: "Pick a launch vehicle from the list.",
    });
  if (!destination)
    add({
      id: "missing-destination",
      domain: "launch",
      severity: "blocker",
      text: "No destination is chosen, so the rocket has no target.",
      fix: "Pick a destination for the mission.",
    });
  if (modules.length === 0)
    add({
      id: "missing-modules",
      domain: "spacecraft",
      severity: "blocker",
      text: "The spacecraft has no modules yet.",
      fix: "Add the required modules to the spacecraft.",
    });
  for (const cat of mission.requiredCategories) {
    if (modules.some((m) => m.category === cat)) continue;
    add({
      id: `missing-category-${cat}`,
      domain: categoryDomain(cat),
      severity: "blocker",
      text: `This mission needs at least one ${cat} module and the design has none.`,
      fix: `Add a ${cat} module.`,
    });
  }

  const reaches =
    !!vehicle && !!destination && (vehicle.capacityKg[destination.orbitClass] ?? 0) > 0;
  if (vehicle && destination && !reaches) {
    const options = mission.launchVehicleIds
      .map((id) => getLaunchVehicle(catalog, id))
      .filter((v) => (v.capacityKg[destination.orbitClass] ?? 0) > 0)
      .map((v) => v.name);
    add({
      id: "launch-cannot-reach",
      domain: "launch",
      severity: "blocker",
      text: `${vehicle.name} cannot deliver payload to ${destination.orbitClass}.`,
      fix: options.length
        ? `Choose ${options.join(" or ")}, or pick a different destination.`
        : "Pick a different destination.",
    });
  }

  const heaviest = [...payload].sort(
    (a, b) => moduleMassKg(b, mods, mid) - moduleMassKg(a, mods, mid),
  )[0];
  const priciest = [...modules].sort(
    (a, b) => moduleCostMUsd(b, mods, mid) - moduleCostMUsd(a, mods, mid),
  )[0];
  const hungriest = [...modules].sort(
    (a, b) => modulePowerW(b, mods, mid) - modulePowerW(a, mods, mid),
  )[0];

  if (reaches && rep.mass.status === "over") {
    const over = massOverKg(design, catalog);
    // the carrier alone outweighs what the rocket lifts: dropping payload cannot fix that
    const carrier = over > rep.mass.used + 1e-9 ? r.carrier : undefined;
    add({
      id: "mass-over",
      resource: "mass",
      domain: "launch",
      severity: "blocker",
      text: carrier
        ? `The ${carrier.name} alone weighs more than the ${vehicle!.name} can send to ${destination!.orbitClass}: ${fmt(over)} kg over.`
        : `The payload weighs ${fmt(rep.mass.used)} kg but only ${fmt(rep.mass.capacity)} kg can be delivered.`,
      fix: carrier
        ? `Choose a bigger launch vehicle or a lighter ${carrier.category}.`
        : heaviest
          ? `Drop or swap the ${heaviest.name} (-${fmt(moduleMassKg(heaviest, mods, mid))} kg), choose a bigger launch vehicle in Launch, or take a partner's open tech that makes modules lighter.`
          : "Choose a bigger launch vehicle.",
    });
  }
  if (rep.budget.status === "over")
    add({
      id: "budget-over",
      resource: "budget",
      domain: "budget",
      severity: "blocker",
      text: `The design costs $${fmt(rep.budget.used)}M but the treasury holds $${fmt(rep.budget.capacity)}M.`,
      fix: priciest
        ? `Drop the ${priciest.name} (-$${fmt(moduleCostMUsd(priciest, mods, mid))}M), choose a cheaper rocket, or accept a rideshare that pays into the treasury.`
        : "Choose a cheaper rocket or accept a rideshare that pays into the treasury.",
    });

  if (design.secondaryObjectiveIds.length > MAX_SECONDARY)
    add({
      id: "too-many-secondaries",
      domain: "science",
      severity: "blocker",
      text: `${design.secondaryObjectiveIds.length} secondary objectives are selected but the limit is ${MAX_SECONDARY}.`,
      fix: `Deselect ${design.secondaryObjectiveIds.length - MAX_SECONDARY} secondary objective(s).`,
    });
  {
    // The council will not sign a mission that cannot meet its primary objective.
    const req = mission.primaryObjective.requires;
    const anyOf = req.moduleIds ?? [];
    const missing = [
      ...(req.categories ?? []).filter((c) => !modules.some((m) => m.category === c)),
      ...(anyOf.length && !anyOf.some((x) => design.moduleIds.includes(x)) ? [`one of: ${anyOf.map((x) => modules.find((m) => m.id === x)?.name ?? catalog.modules.find((m) => m.id === x)?.name ?? x).join(", ")}`] : []),
    ];
    if (design.moduleIds.length && missing.length)
      add({
        id: "primary-unmet",
        domain: "science",
        severity: "blocker",
        text: `The main objective "${mission.primaryObjective.title}" can't be met: the spacecraft lacks ${missing.join("; ")}.`,
        fix: `Add ${missing.join("; ")}.`,
      });
  }
  for (const id of design.secondaryObjectiveIds) {
    const obj = getObjective(mission, id);
    const missingCats = (obj.requires.categories ?? []).filter((c) => !modules.some((m) => m.category === c));
    const anyOf = obj.requires.moduleIds ?? [];
    const missingIds = anyOf.length && !anyOf.some((x) => design.moduleIds.includes(x)) ? [`one of: ${anyOf.map((x) => modules.find((m) => m.id === x)?.name ?? catalog.modules.find((m) => m.id === x)?.name ?? x).join(", ")}`] : [];
    if (missingCats.length || missingIds.length)
      add({
        id: `secondary-unmet-${id}`,
        domain: "science",
        severity: "warning",
        text: `The objective "${obj.title}" cannot be met because the spacecraft lacks ${[...missingCats, ...missingIds].join(", ")}.`,
        fix: `Add ${[...missingCats, ...missingIds].join(", ")} or deselect "${obj.title}".`,
      });
  }

  // warnings, except power over at the station: it gives each payload a fixed allocation and
  // switches the payload off above it, so that one blocks the flight
  const station = destination?.orbitClass === "ISS";
  if (rep.power.status === "over")
    add({
      id: "power-over",
      resource: "power",
      domain: "spacecraft",
      severity: station ? "blocker" : "warning",
      text: station
        ? `The experiments draw ${fmt(rep.power.used)} W but the station allocates ${fmt(rep.power.capacity)} W, and it will not run a payload over its allocation.`
        : `The spacecraft draws ${fmt(rep.power.used)} W but generates ${fmt(rep.power.capacity)} W on average, so instruments will be throttled.`,
      fix: hungriest
        ? station
          ? `Drop the ${hungriest.name} (-${fmt(modulePowerW(hungriest, mods, mid))} W) or swap it for a smaller experiment.`
          : `Generation is short, and batteries cannot fix that (they only store power). Add a solar array in Build, drop the ${hungriest.name} (-${fmt(modulePowerW(hungriest, mods, mid))} W), or take an open tech that cuts power use.`
        : "Add a solar array.",
    });
  if (destination && rep.data.status === "over")
    add({
      id: "data-over",
      resource: "data",
      domain: "comms",
      severity: "warning",
      text: `Instruments produce ${fmt(rep.data.used)} Gb/day but the link can return only ${fmt(rep.data.capacity)} Gb/day, so data will pile up on board.`,
      fix: "Add a faster comms module or a relay, or drop a data-hungry instrument.",
    });
  if (destination && rep.comms.status === "over")
    add({
      id: "comms-under",
      resource: "comms",
      domain: "comms",
      severity: "warning",
      text: `The team needs ${fmt(rep.comms.used * 100)}% link coverage but the design gets ${fmt(rep.comms.capacity * 100)}%.`,
      fix: "Add a relay or ground-network comms module, or choose a destination with better visibility from Earth.",
    });
  if (rep.lifetime.status === "over") {
    const carrierName = r.carrier?.name;
    add({
      id: "lifetime-under",
      resource: "lifetime",
      domain: "spacecraft",
      severity: "warning",
      text: `The design lasts ${fmt(rep.lifetime.capacity)} days but the mission needs ${fmt(rep.lifetime.used)}, so it will go quiet after ${fmt(rep.lifetime.capacity)} days and miss the main objective.`,
      fix: "Add a thermal or battery module that keeps the spacecraft alive through the night (radioisotope heaters, fuel cells)"
        + (carrierName ? `, or pick a carrier that lasts longer than the ${carrierName}.` : ", or add a longer-lived carrier."),
    });
  }
  for (const key of Object.keys(rep) as ResourceKey[]) {
    const g = rep[key];
    if (g.status !== "tight") continue;
    if ((key === "mass" || key === "comms" || key === "data") && !destination) continue;
    if (key === "mass" && !vehicle) continue;
    add({
      id: `${key}-tight`,
      resource: key,
      domain: RESOURCE_DOMAIN[key],
      severity: "warning",
      text: `The ${key} margin is under 10% (${fmt((g.used / g.capacity) * 100)}% used). Real missions keep 10-20% margin because estimates always grow.`,
      fix: `Free up some ${key}: drop or swap the biggest item in the ${key} breakdown.`,
    });
  }

  // an adopted open design that attaches to nothing on board adds nothing (and costs nothing)
  for (const id of design.blueprintIds) {
    const bp = getBlueprint(catalog, id);
    const fit = blueprintFit(bp, design, catalog);
    if (fit.ok) continue;
    const names = fit.optionIds.map((x) => getModule(catalog, x).name);
    add({
      id: `opentech-unfit-${id}`,
      domain: categoryDomain(bp.category),
      severity: "warning",
      text: names.length
        ? `${bp.name} does nothing yet: it attaches to ${names.join(" or ")}, and the spacecraft flies none.`
        : `${bp.name} does nothing: no module on this mission can carry it.`,
      fix: names.length ? `Add ${names[0]} in Build, or drop ${bp.name} in Open tech.` : `Drop ${bp.name} in Open tech.`,
    });
  }

  // the station powers its payloads through eclipse, so only free flyers and landers need batteries
  if (destination && !station && destination.sunlightFraction < 1 && rep.power.used > 0) {
    const dark =
      destination.orbitClass === "TLI"
        ? (1 - destination.sunlightFraction) * LUNAR_DAY_HOURS
        : (1 - destination.sunlightFraction) * ORBIT_DARK_HOURS;
    const independentW = modules.reduce(
      (s, m) => s + (m.sunlightIndependent ? applyStat(m.generatesW ?? 0, "powerGeneration", mods, { category: m.category, missionId: mid }) : 0),
      0,
    );
    const needWh = Math.max(0, rep.power.used - independentW) * dark;
    const storage = modules.reduce((s, m) => s + (m.storageWh ?? 0), 0);
    // under ~15 minutes of darkness (e.g. a dawn-dusk orbit) the bus capacitors and margins cover it
    if (dark >= 0.25 && storage < needWh)
      add({
        id: "battery-small",
      resource: "power",
        domain: "spacecraft",
        severity: "warning",
        text: `The batteries hold ${fmt(storage)} Wh but the ${dark < 2 ? `${fmt(dark * 60)}-minute` : `${fmt(dark)}-hour`} dark period needs about ${fmt(needWh)} Wh.`,
        fix: `Solar arrays make nothing in shadow, so more panels will not help; only stored energy does. The load is ${fmt(rep.power.used - independentW)} W for ${dark < 2 ? `${fmt(dark * 60)} min` : `${fmt(dark)} h`} of shadow. Add a bigger battery, add sunlight-independent power such as an RTG, cut the load${hungriest ? ` (the ${hungriest.name} draws ${fmt(modulePowerW(hungriest, mods, mid))} W)` : ""}, or pick a destination with more sunlight.`,
      });
  }

  return issues;
}
