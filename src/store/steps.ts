export type Screen = "intro" | "story" | "missions" | "coalition" | "control" | "flight" | "debrief";

export type StepId = "values" | "objectives" | "launch" | "build" | "opentech" | "rideshare" | "council";

export const SCREENS: Screen[] = ["intro", "story", "missions", "coalition", "control", "flight", "debrief"];

export const STEPS: { id: StepId; label: string; hint: string }[] = [
  { id: "values", label: "Values", hint: "Vote on what matters" },
  { id: "objectives", label: "Objectives", hint: "Pick the science goals" },
  { id: "launch", label: "Launch", hint: "Destination and rocket" },
  { id: "build", label: "Build", hint: "Assemble the spacecraft" },
  { id: "opentech", label: "Open tech", hint: "Adopt shared designs" },
  { id: "rideshare", label: "Rideshare", hint: "Share spare capacity" },
  { id: "council", label: "Council", hint: "Review, bet and sign" },
];
