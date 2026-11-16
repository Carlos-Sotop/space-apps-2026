import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { C, MONO, T180, TOTAL180 } from "./theme";
import { Background, Grain, SceneFade, Vignette, keys, ramp } from "./components";
import { Globe } from "./Globe";
import { Hud, Reveal, SealRow } from "./scenes";
import { Closing180, ClipShow, DataChips, Facts, Network, Pillars, Treaty, Trust, cue } from "./scenes180";
import { EndFade, Scene, Soundtrack } from "./Main";
import { FlightClip } from "./FlightClip";
import { Subtitles } from "./Subtitles";
import { captions180 } from "./captions180";

// Seconds of music180.mp3 (Scott Buckley, "Artemis", CC BY 4.0) to skip at frame 0: the track's build-up at 73.5 s
// lands with "Then I saw SpaceDAO" (frame 950). Dayon approved these times, 2026-11-15.
export const MUSIC180_START_SEC = 41.8;

// One continuous take after the Apollo 11 countdown: never cut, spaced or sped up; the picture follows it.
const VO180: [string, number][] = [["vo180", 100]];

const s = (k: keyof typeof T180) => T180[k][0];
const len = (k: keyof typeof T180) => T180[k][1] - T180[k][0];
// local frame (inside scene k) of the caption that begins with `prefix`
const at = (k: keyof typeof T180, prefix: string) => cue(prefix, s(k)).from;

// the four keys of the council in the clips (the video names no company)
const SEALS = ["NASA", "JAXA", "ESA", "ISRO"].map((label, i) => ({ label, at: at("s06", "a vault") + 12 + i * 22 }));

// Few effects, in the silences (Dayon, 2026-11-15): the countdown before the voice, the reveal's riser and impact,
// low whooshes on scene changes, the four seals. Anything that lands on the voice plays at 0.4x (Soundtrack).
const SFX180: [string, number, number][] = [
  ["countdown", 0, 1],
  ["riser", s("s03") - 80, 0.55],
  ["impact", s("s03"), 1],
  ...(["s02", "s04", "s05", "s06", "s07", "s08", "s09", "s10"] as const).map((k): [string, number, number] => ["whoosh", s(k), 0.35]),
  ...SEALS.map((x): [string, number, number] => ["seal", s("s06") + x.at, 0.55]),
];

const lin = (f: number, pts: [number, number][]) => {
  if (f <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (f <= pts[i][0]) return pts[i - 1][1] + ((f - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0])) * (pts[i][1] - pts[i - 1][1]);
  }
  return pts[pts.length - 1][1];
};

// composition frame -> globe timeline frame (the 30 s beats: 0-120 earth, 126-210 arcs, 214-296 treaty, 300 reveal, 494+ horizon, 830+ end)
const R = s("s03");
const tl = (f: number) => {
  if (f < R + 195) return lin(f, [[0, 0], [150, 120], [s("s02") - 17, 206], [s("s02"), 214], [R - 38, 298], [R - 1, 298], [R, 300], [R + 150, 450], [R + 195, 494]]);
  if (f < s("s10")) return 500 + ((f - (R + 195)) % 300);
  return 830 + (f - s("s10")) * 0.2;
};

const GlobeLayer180: React.FC = () => {
  const f = useCurrentFrame();
  const o = keys(f, [[0, 0], [90, 0], [300, 1], [R + 150, 1], [R + 210, 0.85], [s("s04") - 20, 0.85], [s("s04") + 20, 0.5], [s("s10") - 60, 0.5], [s("s10"), 1]]);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Globe tl={tl} />
    </AbsoluteFill>
  );
};

const BlackOpen: React.FC = () => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{ background: "#000", opacity: ramp(f, 30, 220, 1, 0), pointerEvents: "none" }} />;
};

const HudLayer: React.FC = () => {
  const f = useCurrentFrame();
  return f < R + 210 ? <Hud tl={tl} /> : null;
};

// a glass pill for the technology the narration names (scene 6)
const TechPill: React.FC<{ from: number; children: React.ReactNode; top?: number }> = ({ from, children, top = 34 }) => {
  const f = useCurrentFrame();
  const o = ramp(f, from, from + 14);
  if (o <= 0) return null;
  return (
    <div
      style={{
        position: "absolute", right: 110, top, opacity: o, transform: `translateY(${(1 - o) * -12}px)`, padding: "14px 28px", borderRadius: 999,
        background: "rgba(8,10,26,0.86)", border: "1px solid rgba(34,211,238,0.45)", boxShadow: "0 0 30px rgba(34,211,238,0.25)",
        fontFamily: MONO, fontWeight: 700, fontSize: 22, letterSpacing: "0.08em", color: C.cyanBright,
      }}
    >
      {children}
    </div>
  );
};

export const SpaceDAO180: React.FC = () => (
  <AbsoluteFill style={{ background: C.bg }}>
    <Background />
    <GlobeLayer180 />
    <BlackOpen />
    <HudLayer />
    <Scene span={T180.s01}><SceneFade dur={len("s01")} inF={1} outF={20}><Facts /></SceneFade></Scene>
    <Scene span={T180.s02}><SceneFade dur={len("s02")} inF={20} outF={14}><Treaty /></SceneFade></Scene>
    <Scene span={T180.s03}>
      <Sequence from={0} durationInFrames={230}>
        <Reveal dur={230} wordAt={30} tagAt={at("s03", "A planetary") + 50} tagline="Run as a DAO · smart contracts" />
      </Sequence>
      <SceneFade dur={len("s03")} inF={1} outF={16}><Pillars /></SceneFade>
    </Scene>
    <Scene span={T180.s04}>
      <SceneFade dur={len("s04")} inF={14} outF={12}>
        <ClipShow items={[{ name: "intro", from: 0, to: 132, label: "THE GAME" }, { name: "rocky", from: 118, to: len("s04"), label: "MEET ROCKY" }]} />
      </SceneFade>
    </Scene>
    <Scene span={T180.s05}>
      <SceneFade dur={len("s05")} inF={14} outF={12}>
        <ClipShow
          items={[
            { name: "missions", from: 0, to: at("s05", "Invite") - 2, label: "PICK A REAL MISSION" },
            { name: "coalition", from: at("s05", "Invite") - 16, to: at("s05", "Design the rocket") + 4, label: "FORM YOUR COUNCIL" },
            { name: "design", from: at("s05", "Design the rocket") - 10, to: len("s05"), label: "DESIGN IT / SIX GAUGES" },
          ]}
        />
      </SceneFade>
    </Scene>
    <Scene span={T180.s06}>
      <SceneFade dur={len("s06")} inF={14} outF={12}>
        <ClipShow
          w={1100} top={80}
          items={[
            { name: "review", from: 0, to: at("s06", "a vault") + 10, label: "GO / NO-GO REVIEW" },
            { name: "sign", from: at("s06", "a vault") - 6, to: len("s06"), label: "4-OF-4 MULTI-SIGNATURE" },
          ]}
        />
        <SealRow top={745} seals={SEALS} title="4-OF-4 MULTI-SIGNATURE" />
        <TechPill from={at("s06", "And those keys")}>QUANTUM-SAFE · ML-DSA-65 (NIST FIPS 204)</TechPill>
      </SceneFade>
    </Scene>
    <Scene span={T180.s07}>
      <SceneFade dur={len("s07")} inF={14} outF={12}>
        <ClipShow items={[{ name: "flight", from: 0, to: at("s07", "On the Moon") + 4, label: "FLIGHT / REAL SPACE WEATHER", render: () => <FlightClip /> }, { name: "ops", from: at("s07", "On the Moon") - 12, to: len("s07"), label: "MOON OPERATIONS" }]} />
      </SceneFade>
    </Scene>
    <Scene span={T180.s08}>
      <SceneFade dur={len("s08")} inF={14} outF={12}>
        <ClipShow fadeLast items={[{ name: "debrief", from: 0, to: at("s08", "And your design") + 14, label: "DEBRIEF" }]} />
        <Sequence from={at("s08", "And your design") - 12} durationInFrames={at("s08", "Now picture") - at("s08", "And your design") + 24}>
          <Network joinAt={14} />
        </Sequence>
        <Trust />
      </SceneFade>
    </Scene>
    <Scene span={T180.s09}>
      <SceneFade dur={len("s09")} inF={14} outF={12}>
        <ClipShow items={[{ name: "nasalive", from: 0, to: len("s09"), label: "EVERYTHING RUNS ON LIVE NASA DATA" }]} w={1000} left={80} top={250} labelTop={84} />
        <DataChips />
      </SceneFade>
    </Scene>
    <Scene span={T180.s10}><Closing180 /></Scene>
    <Subtitles captions={captions180} />
    <Vignette />
    <Grain />
    <EndFade total={TOTAL180} />
    {/* the voice leads: music 0.12 under it, 0.45 in its pauses, rising before "Then I saw SpaceDAO" and after "Play SpaceDAO." */}
    <Soundtrack music="music180" vo={VO180} sfx={SFX180} total={TOTAL180} musicStartSec={MUSIC180_START_SEC} duck={0.12} idle={0.45} lifts={[[900, 948, 0.7], [5290, 5385, 0.7]]} />
  </AbsoluteFill>
);
