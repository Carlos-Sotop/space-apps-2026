import type { Caption } from "./captions";

// Exact VO text from media/ELEVENLABS_3min.md, split into readable lines (<= ~60 chars) and spread
// across each span in proportion to length. [from, to, start offset, lines]
const spans: [number, number, number, string[]][] = [
  [0, 600, 100, [
    "Every great leap in space was a team effort.",
    "...",
    "Today, five agencies from fifteen nations",
    "run one space station together.",
    "And more than seventy nations",
    "have signed the Artemis Accords.",
  ]],
  [600, 1350, 12, [
    "But the way we work together has barely changed.",
    "...",
    "Every partnership is still negotiated",
    "one treaty at a time.",
    "Designs stay behind export rules.",
    "Data sits in separate archives.",
    "...",
    "And most of the world watches from outside.",
  ]],
  [1350, 2250, 40, [
    "SpaceDAO is our proposal for a planetary space organization.",
    "...",
    "One open network where agencies, companies,",
    "scientists and funders plan missions together.",
    "Share technology as open blueprints.",
    "Share spare capacity on every rocket.",
    "Share the data that comes back.",
    "And decide together, with rules anyone can verify.",
    "...",
    "A second brain for space exploration.",
    "The more we connect, the farther we go.",
  ]],
  [2250, 2700, 12, [
    "We can't build that organization in a weekend.",
    "...",
    "So we built the experience of it:",
    "a mission design game where you can feel how it works.",
  ]],
  [2700, 3300, 12, [
    "Pick a real mission: a lab on the space station,",
    "a satellite that watches fires and floods,",
    "or the first outpost at the lunar south pole.",
    "Represent an agency or a company,",
    "and invite three partners to your council.",
    "Then design it: charter, objectives, rocket, orbit, spacecraft.",
    "Six gauges react to every choice.",
  ]],
  [3300, 3750, 12, [
    "Before launch, your partners review the design,",
    "like a real flight readiness review.",
    "Each one votes Go or No-Go, with numbers.",
    "Only a unanimous Go unlocks the four-of-four signature:",
    "quantum-safe, made right in your browser.",
  ]],
  [3750, 4350, 12, [
    "Then you fly through real space weather",
    "from the last thirty days.",
    "...",
    "On the Moon, you run the base turn by turn:",
    "power through the long lunar night,",
    "data home through the Deep Space Network,",
    "solar storms, impacts... and discoveries.",
  ]],
  [4350, 4800, 12, [
    "When it's over, the debrief explains why it worked...",
    "or why it failed.",
    "And when you publish your design, it joins the network,",
    "so the next mission starts from yours.",
  ]],
  [4800, 5160, 12, [
    "Everything runs on real data: NASA space weather,",
    "Earth events, JPL Horizons,",
    "the live position of the space station,",
    "and the Deep Space Network.",
    "Every number links to its source.",
  ]],
  [5160, 5400, 20, [
    "Space belongs to humanity.",
    "...",
    "Let's explore it together.",
    "...",
    "Play SpaceDAO.",
  ]],
];

export const captions180: Caption[] = spans.flatMap(([from, to, offset, lines], si) => {
  const start = from + offset;
  const end = to - 14;
  const total = lines.reduce((n, l) => n + (l === "..." ? 12 : l.length), 0);
  let cursor = start;
  const out: Caption[] = [];
  for (const l of lines) {
    const len = ((l === "..." ? 12 : l.length) / total) * (end - start);
    if (l !== "...") out.push({ text: l, from: Math.round(cursor), to: Math.round(cursor + len - 3), burn: si === 9 ? false : undefined });
    cursor += len;
  }
  return out;
});
