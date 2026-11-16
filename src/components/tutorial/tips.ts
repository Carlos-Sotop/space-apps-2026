import type { RockyPose } from "./Rocky";

export interface Tip {
  /** value of the data-coach attribute to point at; omitted tips float in the corner */
  anchor?: string;
  pose: RockyPose;
  text: string;
}

/**
 * Tips per context: a screen id, or "control.<step>" inside Mission Control.
 * Two short sentences at most, and an anchor on the smallest element that shows what is meant:
 * Rocky stands next to it, so the words and the thing are read together.
 */
export const TIPS: Record<string, Tip[]> = {
  missions: [
    { anchor: "missions.cards", pose: "wave", text: "Hi, I'm Rocky! Pick a mission to design." },
    { anchor: "missions.card", pose: "point", text: "Tap the i on a card to see where its facts come from." },
  ],
  coalition: [
    { anchor: "coalition.cards", pose: "point", text: "Space is a team sport. Choose who you represent." },
    { anchor: "coalition.council", pose: "think", text: "Now pick 3 partners. Good ones cover what you cannot do alone." },
  ],
  control: [
    { anchor: "control.gauges", pose: "point", text: "These six gauges are your mission's health. Every choice moves them." },
    { anchor: "control.steps", pose: "point", text: "Work through the steps in order. This list shows where you are." },
    { anchor: "control.next", pose: "wave", text: "Happy with this step? Press Next." },
  ],
  "control.values": [
    { anchor: "charter.vote", pose: "think", text: "Say what matters most: science, safety or cost." },
    { anchor: "control.gauges", pose: "point", text: "Watch the gauges while you decide. Green is good, red is trouble." },
  ],
  "control.charter": [
    { anchor: "charter.vote", pose: "think", text: "Say what matters most: science, safety or cost." },
    { anchor: "charter.recommended", pose: "point", text: "In a hurry? Take the recommended charter." },
  ],
  "control.objectives": [
    { anchor: "objectives.list", pose: "point", text: "Pick your science goals. Each one needs certain parts." },
    { anchor: "objectives.count", pose: "think", text: "More goals means more mass and power. Keep an eye on the gauges." },
  ],
  "control.launch": [
    { anchor: "launch.destinations", pose: "point", text: "Choose where the mission goes." },
    { anchor: "launch.rockets", pose: "worried", text: "Then pick the rocket. If mass turns red, you need a bigger one." },
  ],
  "control.build": [
    { anchor: "build.module", pose: "point", text: "Add modules to your spacecraft. Each costs mass, power and money." },
    { anchor: "build.ship", pose: "cheer", text: "Your ship takes shape here. The cyan volume is spare room." },
    { anchor: "control.issues-panel", pose: "think", text: "Anything wrong shows up here, with the way to fix it." },
  ],
  "control.opentech": [
    { anchor: "opentech.cards", pose: "point", text: "Adopt a design another team shared. It saves money." },
  ],
  "control.rideshare": [
    { anchor: "rideshare.spare", pose: "point", text: "Spare room can carry a partner's payload." },
    { anchor: "rideshare.offers", pose: "cheer", text: "Sharing a ride makes space cheaper for everyone." },
  ],
  "control.council": [
    { anchor: "council.vote", pose: "think", text: "Your partners vote Go or No-Go on the real numbers." },
    { anchor: "council.vote", pose: "worried", text: "A No-Go says what is short. Fix it for me does it in one tap." },
    { anchor: "council.sign", pose: "cheer", text: "When all four say GO, you can sign and fly." },
  ],
  flight: [
    { anchor: "flight.main", pose: "cheer", text: "Liftoff! Real NASA data feeds this flight." },
  ],
  ops: [
    { anchor: "ops.ap", pose: "point", text: "You arrived! Each turn gives you a few action points." },
    { anchor: "ops.warnings", pose: "worried", text: "Keep energy up and data flowing home. Storms can hit any day." },
  ],
  debrief: [
    { anchor: "debrief.grade", pose: "cheer", text: "Mission report! Here is how it went, and why." },
    { anchor: "debrief.publish", pose: "wave", text: "Share your design to join the SpaceDAO network." },
  ],
};

export function tipContext(screen: string, step: string): string {
  if (screen !== "control") return screen;
  return TIPS[`control.${step}`] ? `control.${step}` : "control";
}
