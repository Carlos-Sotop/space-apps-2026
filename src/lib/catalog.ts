// Lookups over the catalog. The UI never assumes an id exists: every getter can return undefined.
import { catalog } from "@/data";
import type { Actor, Blueprint, LaunchVehicle, Mission, MissionId, Module, ModuleCategory, RideshareOffer } from "@/engine/types";

const index = <T extends { id: string }>(xs: T[]) => new Map(xs.map((x) => [x.id, x]));

const actorMap = index(catalog.actors);
const missionMap = index<Mission>(catalog.missions);
const moduleMap = index(catalog.modules);
const vehicleMap = index(catalog.launchVehicles);
const blueprintMap = index(catalog.blueprints);
const offerMap = index(catalog.rideshareOffers);

export const getActor = (id: string): Actor | undefined => actorMap.get(id);
export const getMission = (id: MissionId | string): Mission | undefined => missionMap.get(id);
export const getModule = (id: string): Module | undefined => moduleMap.get(id);
export const getVehicle = (id: string): LaunchVehicle | undefined => vehicleMap.get(id);
export const getBlueprint = (id: string): Blueprint | undefined => blueprintMap.get(id);
export const getOffer = (id: string): RideshareOffer | undefined => offerMap.get(id);

export const missionModules = (m: Mission): Module[] => m.moduleIds.map(getModule).filter((x): x is Module => !!x);
export const missionVehicles = (m: Mission): LaunchVehicle[] => m.launchVehicleIds.map(getVehicle).filter((x): x is LaunchVehicle => !!x);
export const missionOffers = (m: Mission): RideshareOffer[] => m.rideshareOfferIds.map(getOffer).filter((x): x is RideshareOffer => !!x);

export const CATEGORY_LABEL: Record<ModuleCategory, string> = {
  bus: "Bus", power: "Power", battery: "Battery", comms: "Comms", computer: "Computer", adcs: "Pointing", propulsion: "Propulsion",
  thermal: "Thermal", lander: "Lander", instrument: "Instruments", experiment: "Experiments", habitat: "Habitat", isru: "ISRU", rover: "Rover",
};

export const CATEGORY_COLOR: Record<ModuleCategory, string> = {
  bus: "#8b93c9", power: "#fbbf24", battery: "#34d399", comms: "#60a5fa", computer: "#a78bfa", adcs: "#c4b5fd", propulsion: "#fb923c",
  thermal: "#fb7185", lander: "#94a3b8", instrument: "#f472b6", experiment: "#f472b6", habitat: "#2dd4bf", isru: "#a3e635", rover: "#fde68a",
};

/** Stable fallback label when a data row refers to an actor that is not in the catalog. */
export const actorName = (id: string) => getActor(id)?.shortName ?? id.toUpperCase();
