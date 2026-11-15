// Frames at 30 fps, matching the narration script. burn: false keeps a line in the VTT only.
export type Caption = { text: string; from: number; to: number; burn?: boolean };

export const captions: Caption[] = [
  { text: "Space doesn't belong to one nation...", from: 6, to: 66 },
  { text: "...or one company.", from: 68, to: 118 },
  { text: "It belongs to all of us.", from: 124, to: 205 },
  { text: "But today, every partnership is negotiated one treaty at a time.", from: 213, to: 298 },
  { text: "Imagine SpaceDAO: one open network where agencies, companies, scientists and funders...", from: 318, to: 448 },
  { text: "...share technology, data, and spare rocket capacity.", from: 453, to: 566 },
  { text: "Decide together.", from: 573, to: 612 },
  { text: "Sign together.", from: 614, to: 655 },
  { text: "Because the more we connect, the farther we go.", from: 663, to: 716 },
  { text: "Design your own mission with live NASA data.", from: 723, to: 790 },
  { text: "Play SpaceDAO.", from: 792, to: 838 },
  { text: "Space belongs to humanity.", from: 843, to: 895, burn: false },
];
