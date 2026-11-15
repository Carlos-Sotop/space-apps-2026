import type { SVGProps } from "react";

const PATHS = {
  info: "M12 11v5m0-8.5v.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z",
  lock: "M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z",
  check: "m5 12.5 4.5 4.5L19 7.5",
  x: "M6 6l12 12M18 6 6 18",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  arrow: "M5 12h14m-5-6 6 6-6 6",
  back: "M19 12H5m5-6-6 6 6 6",
  launch: "M12 3c3 2.5 4.5 6 4.5 10l-2 3h-5l-2-3c0-4 1.5-7.5 4.5-10Zm0 6.5v.01M9.5 16 8 20m6.5-4 1.5 4",
  spacecraft: "M8 8h8v8H8zM3 10h5m8 0h5M3 14h5m8 0h5M12 8V4",
  science: "M9 3h6m-5 0v6l-5 9a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-9V3M7.5 15h9",
  comms: "M12 12v9m0-9a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm-5-4a7 7 0 0 0 0 8m10-8a7 7 0 0 1 0 8M4 5a11 11 0 0 0 0 14M20 5a11 11 0 0 1 0 14",
  funding: "M12 4v16m4-12.5c-.8-1-2-1.5-4-1.5-2.5 0-4 1.2-4 3s1.5 2.7 4 3 4 1.2 4 3-1.5 3-4 3c-2 0-3.4-.6-4.2-1.7",
  landing: "M12 3v11m0 0-4-4m4 4 4-4M5 20h14M7 20l1-3m9 3-1-3",
  habitat: "M3 19v-6a9 9 0 0 1 18 0v6M3 19h18M9 19v-5h6v5",
  robotics: "M12 3v3m-6 4h12a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2Zm3 4v2m6-2v2",
  "earth-observation": "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3.5 9h17m-17 6h17M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9s1-6.5 3.5-9Z",
  "ground-segment": "M4 20h16M7 20l5-12 5 12M12 8V4",
  mass: "M6 20h12l-1.5-11h-9zM12 9V6m0 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z",
  power: "m13 3-8 11h6l-1 7 8-11h-6z",
  budget: "M4 7h16v11H4zM4 11h16M8 15h2",
  data: "M5 6c0-1.5 3-3 7-3s7 1.5 7 3-3 3-7 3-7-1.5-7-3Zm0 0v12c0 1.5 3 3 7 3s7-1.5 7-3V6M5 12c0 1.5 3 3 7 3s7-1.5 7-3",
  lifetime: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v4l3 2",
  shield: "M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6z",
  sign: "M4 20h16M6 16l9-9 3 3-9 9H6zM13 9l3 3",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3.5 12h17",
  link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
  external: "M14 4h6v6m0-6-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5",
  skip: "M5 5v14l9-7zM18 5v14",
  play: "M7 5v14l11-7z",
  pause: "M8 5v14m8-14v14",
  moon: "M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z",
  fork: "M7 4v6a4 4 0 0 0 4 4h2a4 4 0 0 0 4-4V4M12 14v6",
  trophy: "M8 4h8v6a4 4 0 0 1-8 0zM8 6H4v2a3 3 0 0 0 4 3m8-5h4v2a3 3 0 0 1-4 3M12 14v4m-3 2h6",
  sun: "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0-13v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4m0-12.8L17 7M7 17l-1.4 1.4",
  earth: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM6 8c2 0 3 1 3.5 2.5S9 13 11 14s1 3 .5 5M15 5c-.5 2 .5 3 2 3.5s2.5 1.5 3 3.5",
  storm: "M7 16a4.5 4.5 0 1 1 1-8.9A5.5 5.5 0 0 1 18.5 9 3.5 3.5 0 0 1 17.5 16M13 12l-3 5h4l-2 4",
  meteor: "M19 5 9 15m-1.5 1.5a4 4 0 1 0 5.7-5.7 4 4 0 0 0-5.7 5.7ZM16 4l-7 7m10-1-7 7M4 4l3 3",
  battery: "M3 8h15a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Zm17 2.5v3M7 11v2m3-2v2m3-2v2",
  antenna: "M12 12v9m-4 0h8M5 10a7 7 0 0 1 14 0H5Zm7 0 3-6",
  water: "M12 3c3.5 4.5 6 7.5 6 11a6 6 0 0 1-12 0c0-3.5 2.5-6.5 6-11Z",
  rover: "M5 14h14l-1.5-5H8L5 14Zm3-5V6h4M7 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm10 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
  build: "M14.5 6.5a4 4 0 0 0 4.9 4.9L12 18.8a2 2 0 0 1-2.8-2.8l7.4-7.4M14 3l-1 3m5 1 3-1M5 21l-2-2",
  rocket: "M12 3c3 2.5 4.5 6 4.5 10l-2 3h-5l-2-3c0-4 1.5-7.5 4.5-10Zm0 6.5v.01M9.5 16 8 20m6.5-4 1.5 4",
  warning: "M12 4 3 20h18L12 4Zm0 6v5m0 3v.01",
  sound: "M4 10v4h4l5 4V6L8 10H4Zm12.5-.5a4 4 0 0 1 0 5M19 7a7.5 7.5 0 0 1 0 10",
  mute: "M4 10v4h4l5 4V6L8 10H4Zm12 0 5 4m0-4-5 4",
  dot: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  sparkle: "M12 3v5m0 8v5M3 12h5m8 0h5M6 6l3 3m6 6 3 3m0-12-3 3m-6 6-3 3",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 18, ...rest }: { name: IconName; size?: number } & Omit<SVGProps<SVGSVGElement>, "name">) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      <path d={PATHS[name]} />
    </svg>
  );
}

export const hasIcon = (name: string): name is IconName => name in PATHS;
