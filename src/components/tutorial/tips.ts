import type { RockyPose } from "./Rocky";

export interface Tip {
  /** value of the data-coach attribute to point at; omitted tips float in the corner */
  anchor?: string;
  pose: RockyPose;
  text: string;
}

/** Tips per context: a screen id, or "control.<step>" inside Mission Control. */
export const TIPS: Record<string, Tip[]> = {
  missions: [
    { anchor: "missions.cards", pose: "wave", text: "Hi, I'm Rocky! Pick a mission. Orbital Lab is the easiest, Moon Base Zero is the hardest." },
    { anchor: "missions.cards", pose: "point", text: "Tap the i on a card to see what the mission needs and where the facts come from." },
  ],
  coalition: [
    { anchor: "coalition.main", pose: "point", text: "Space is a team sport. First choose who you represent, then pick 3 partners." },
    { anchor: "coalition.main", pose: "think", text: "Good partners cover what you cannot do alone: rockets, comms, science." },
  ],
  control: [
    { anchor: "control.gauges", pose: "point", text: "These six gauges are your mission's health. Every choice you make moves them." },
    { anchor: "control.steps", pose: "point", text: "Work through the steps one by one. The list shows where you are." },
    { anchor: "control.nav", pose: "wave", text: "Happy with this step? Press Next to continue." },
  ],
  "control.values": [
    { anchor: "control.body", pose: "think", text: "Your council votes on what matters most: science, safety or cost. It shapes how they judge your design." },
    { anchor: "control.gauges", pose: "point", text: "Watch these gauges while you decide. Green is good, red means trouble." },
  ],
  "control.charter": [
    { anchor: "control.body", pose: "think", text: "The charter says what your council cares about most: science, safety or cost." },
    { anchor: "control.gauges", pose: "point", text: "Watch these gauges while you decide. Green is good, red means trouble." },
  ],
  "control.objectives": [
    { anchor: "control.body", pose: "point", text: "Pick the science goals. Each one needs certain parts and earns science points." },
    { anchor: "control.gauges", pose: "think", text: "More goals means more mass and power. Keep an eye on the gauges." },
  ],
  "control.launch": [
    { anchor: "control.body", pose: "point", text: "Choose where your mission goes and which rocket carries it." },
    { anchor: "control.gauges", pose: "worried", text: "A small rocket can only lift so much. If mass turns red, pick a bigger one." },
  ],
  "control.build": [
    { anchor: "control.body", pose: "point", text: "Add modules to your spacecraft. Each one costs mass, power and money." },
    { anchor: "control.issues", pose: "think", text: "If something is wrong, it shows up here with a way to fix it." },
  ],
  "control.opentech": [
    { anchor: "control.body", pose: "point", text: "Adopt open designs shared by other teams. It saves money and the whole network learns." },
  ],
  "control.rideshare": [
    { anchor: "control.body", pose: "point", text: "Spare room on your rocket can carry a partner's payload. Sharing makes space cheaper for everyone." },
  ],
  "control.council": [
    { anchor: "control.body", pose: "think", text: "Your partners review the design and vote Go or No-Go. When everyone says Go, you can sign." },
    { anchor: "control.issues", pose: "worried", text: "Blockers must be fixed before launch. Each one tells you how." },
  ],
  flight: [
    { anchor: "flight.main", pose: "cheer", text: "Liftoff! Watch your spacecraft fly its route. Real NASA data feeds the simulation." },
  ],
  ops: [
    { anchor: "ops.panel", pose: "point", text: "You arrived! Now run the base. Each turn you have a few action points to spend." },
    { anchor: "ops.panel", pose: "worried", text: "Keep energy up and data flowing home. Storms and impacts can happen any day." },
  ],
  debrief: [
    { anchor: "debrief.main", pose: "cheer", text: "Mission report! See your grades and why things worked or failed." },
    { anchor: "debrief.main", pose: "wave", text: "You can redesign and fly again. Share your design to join the SpaceDAO network." },
  ],
};

export function tipContext(screen: string, step: string): string {
  if (screen !== "control") return screen;
  return TIPS[`control.${step}`] ? `control.${step}` : "control";
}
