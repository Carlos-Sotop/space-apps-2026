// Frames at 30 fps, matching the narration script. burn: false keeps a line in the VTT only.
// v2 narration (Dayon, 2026-11-15): one continuous take, vo30.mp3, starting at frame 24. Total 840 frames (28.0 s).
export type Caption = { text: string; from: number; to: number; burn?: boolean };

export const captions: Caption[] = [
  { text: "Space doesn't belong to one nation.", from: 24, to: 102 },
  { text: "It belongs to all of us.", from: 112, to: 161 },
  { text: "Yet today, space exploration remains divided.", from: 176, to: 288 },
  { text: "Enter SpaceDAO: one open network to share technology,", from: 304, to: 433 },
  { text: "resources, and knowledge.", from: 437, to: 488 },
  { text: "Decide together.", from: 502, to: 538 },
  { text: "Launch together.", from: 547, to: 578 },
  { text: "Design your mission with live NASA data.", from: 591, to: 664 },
  { text: "Play SpaceDAO.", from: 676, to: 707 },
  { text: "Space belongs to humanity.", from: 723, to: 787, burn: false },
];
