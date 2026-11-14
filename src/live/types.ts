import type { LiveContext, LiveEarthEvent, LiveSpaceWeather } from "../engine/types.ts";

export interface LiveMoon {
  moonDistanceKm: number;
  lightTimeS: number;
}

export interface LiveIss {
  lat: number;
  lon: number;
  altitudeKm: number;
  time: string;
}

export interface LiveDsnDish {
  name: string;
  activity: string;
  targets: string[];
  downlinkActive: boolean;
}

export interface LiveDsnStation {
  name: string;
  friendlyName: string;
  dishes: LiveDsnDish[];
}

export interface LiveDsn {
  stations: LiveDsnStation[];
}

export interface LiveApod {
  title: string;
  url: string;
  mediaType: string;
  date: string;
  copyright?: string;
}

/** Every /api/live/* response carries the flag and the time it was produced. */
export type WithMeta<T> = T & { snapshot: boolean; fetchedAt: string };

export type { LiveContext, LiveEarthEvent, LiveSpaceWeather };
