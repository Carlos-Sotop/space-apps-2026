export type Screen = "intro" | "story" | "missions" | "coalition" | "control" | "flight" | "ops" | "debrief" | "leaderboard";

export type StepId = "values" | "objectives" | "launch" | "build" | "opentech" | "rideshare" | "council";

export const SCREENS: Screen[] = ["intro", "story", "missions", "coalition", "control", "flight", "ops", "debrief", "leaderboard"];

/** `id` stays "values" for the Charter step: other code depends on it. */
export const STEPS: { id: StepId; label: string; hint: string; title: string }[] = [
  { id: "values", label: "Charter", hint: "Agree what matters most", title: "Write the mission charter" },
  { id: "objectives", label: "Objectives", hint: "Pick the science goals", title: "Pick your science goals" },
  { id: "launch", label: "Launch", hint: "Destination and rocket", title: "Plan the launch" },
  { id: "build", label: "Build", hint: "Assemble the spacecraft", title: "Build the spacecraft" },
  { id: "opentech", label: "Open tech", hint: "Adopt shared designs", title: "Open Tech Registry" },
  { id: "rideshare", label: "Rideshare", hint: "Share spare capacity", title: "Spare capacity market" },
  { id: "council", label: "Review & Sign", hint: "Go / No-Go review and signatures", title: "Review and sign" },
];
