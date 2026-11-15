import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { C, T180, TOTAL180 } from "./theme";
import { Background, Grain, LIVE_ZOOM, ROCKY_ZOOM, SceneFade, Vignette, keys, ramp } from "./components";
import { Globe } from "./Globe";
import { Hud, Reveal, SealRow } from "./scenes";
import { Closing180, ClipShow, DataChips, Facts, Network, Pillars, Treaty, cue } from "./scenes180";
import { EndFade, Scene, Soundtrack } from "./Main";
import { Subtitles } from "./Subtitles";
import { captions180 } from "./captions180";

// Seconds of music180.mp3 to skip at frame 0. Negative delays the music. Line the crescendo up with 0:45 (frame 1350).
export const MUSIC180_START_SEC = 0;

// [file, start frame]; vo180_01 starts after the Apollo countdown
const VO180: [string, number][] = [
  ["vo180_01", 100],
  ...(["02", "03", "04", "05", "06", "07", "08", "09", "10"] as const).map((n, i): [string, number] => [`vo180_${n}`, Object.values(T180)[i + 1][0] + 6]),
];

const s = (k: keyof typeof T180) => T180[k][0];
const SFX180: [string, number, number][] = [
  ["countdown", 0, 1],
  ...[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i): [string, number, number] => ["ping", 230 + i * 36, 0.3]),
  ["swell", 150, 0.35],
  ["whoosh", s("s02"), 0.4],
  ...["Designs stay", "Data sits", "And most of the world"].map((p): [string, number, number] => ["glitch", cue(p, 0).from - 2, 0.4]),
  ["riser", s("s03") - 80, 0.55],
  ["impact", s("s03"), 1],
  ["swell", s("s03") + 3, 0.6],
  ["whoosh", s("s03") + 2, 0.5],
  ...["Share technology", "Share spare", "Share the data", "And decide"].map((p): [string, number, number] => ["pop", cue(p, 0).from - 4, 0.45]),
  ["swell", cue("The more we connect", 0).from - 6, 0.5],
  ["whoosh", s("s04"), 0.4],
  ["whoosh", s("s05"), 0.35],
  ["glass", s("s05") + 204, 0.3], ["glass", s("s05") + 404, 0.3],
  ["whoosh", s("s06"), 0.35],
  ...[250, 290, 330, 370].map((d): [string, number, number] => ["seal", s("s06") + d, 0.55]),
  ["impact", s("s06") + 392, 0.45],
  ["whoosh", s("s07"), 0.4],
  ["roar", s("s07"), 0.25],
  ["whoosh", s("s07") + 304, 0.3],
  ["whoosh", s("s08"), 0.35],
  ["swell", s("s08") + 296, 0.5],
  ["ping", s("s08") + 300, 0.5],
  ["whoosh", s("s09"), 0.35],
  ...[0, 1, 2, 3, 4, 5].map((i): [string, number, number] => ["pop", s("s09") + 40 + i * 22, 0.35]),
  ["riser", s("s10") - 78, 0.5],
  ["impact", s("s10") + 36, 1],
  ["swell", s("s10") + 40, 0.5],
  ["roar", s("s10") + 40, 0.3],
  ["impact", s("s10") + 176, 0.9],
];

const lin = (f: number, pts: [number, number][]) => {
  if (f <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (f <= pts[i][0]) return pts[i - 1][1] + ((f - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0])) * (pts[i][1] - pts[i - 1][1]);
  }
  return pts[pts.length - 1][1];
};

// composition frame -> globe timeline frame (the 30 s timeline: 0-120 earth, 126-210 arcs, 214-296 treaty, 300 reveal, 494+ horizon, 830+ end)
const tl = (f: number) => {
  if (f < 1545) return lin(f, [[0, 0], [200, 120], [560, 206], [600, 214], [1200, 298], [1349, 298], [1350, 300], [1500, 450], [1545, 494]]);
  if (f < s("s10")) return 500 + ((f - 1545) % 300);
  return 830 + (f - s("s10")) * 0.2;
};

const GlobeLayer180: React.FC = () => {
  const f = useCurrentFrame();
  const o = keys(f, [[0, 0], [90, 0], [300, 1], [1500, 1], [1560, 0.85], [2230, 0.85], [2270, 0.5], [5100, 0.5], [5160, 1]]);
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
  return f < 1560 ? <Hud tl={tl} /> : null;
};

export const SpaceDAO180: React.FC = () => (
  <AbsoluteFill style={{ background: C.bg }}>
    <Background />
    <GlobeLayer180 />
    <BlackOpen />
    <HudLayer />
    <Scene span={T180.s01}><SceneFade dur={600} inF={1} outF={20}><Facts /></SceneFade></Scene>
    <Scene span={T180.s02}><SceneFade dur={750} inF={20} outF={14}><Treaty /></SceneFade></Scene>
    <Scene span={T180.s03}>
      <Sequence from={0} durationInFrames={150}><Reveal /></Sequence>
      <SceneFade dur={900} inF={1} outF={16}><Pillars /></SceneFade>
    </Scene>
    <Scene span={T180.s04}>
      <SceneFade dur={450} inF={14} outF={12}>
        <ClipShow items={[{ name: "intro", from: 0, to: 236, label: "THE GAME" }, { name: "rocky", from: 220, to: 450, label: "MEET ROCKY", zoom: ROCKY_ZOOM }]} />
      </SceneFade>
    </Scene>
    <Scene span={T180.s05}>
      <SceneFade dur={600} inF={14} outF={12}>
        <ClipShow
          items={[
            { name: "missions", from: 0, to: 216, label: "PICK A REAL MISSION" },
            { name: "coalition", from: 200, to: 416, label: "FORM YOUR COUNCIL" },
            { name: "design", from: 400, to: 600, label: "DESIGN IT / SIX GAUGES" },
          ]}
        />
      </SceneFade>
    </Scene>
    <Scene span={T180.s06}>
      <SceneFade dur={450} inF={14} outF={12}>
        <ClipShow
          w={1100} top={80}
          items={[{ name: "review", from: 0, to: 230, label: "GO / NO-GO REVIEW" }, { name: "sign", from: 214, to: 450, label: "FOUR-OF-FOUR SIGNATURE" }]}
        />
        <SealRow top={745} seals={[{ label: "AGENCY", at: 250 }, { label: "COMPANY", at: 290 }, { label: "SCIENCE", at: 330 }, { label: "FUNDER", at: 370 }]} />
      </SceneFade>
    </Scene>
    <Scene span={T180.s07}>
      <SceneFade dur={600} inF={14} outF={12}>
        <ClipShow items={[{ name: "flight", from: 0, to: 320, label: "FLIGHT / REAL SPACE WEATHER" }, { name: "ops", from: 304, to: 600, label: "MOON OPERATIONS" }]} />
      </SceneFade>
    </Scene>
    <Scene span={T180.s08}>
      <SceneFade dur={450} inF={14} outF={12}>
        <ClipShow fadeLast items={[{ name: "debrief", from: 0, to: 236, label: "DEBRIEF" }]} />
        <Sequence from={210} durationInFrames={240}><Network joinAt={50} /></Sequence>
      </SceneFade>
    </Scene>
    <Scene span={T180.s09}>
      <SceneFade dur={360} inF={14} outF={12}>
        <ClipShow items={[{ name: "nasalive", from: 0, to: 360, label: "EVERYTHING RUNS ON REAL DATA", zoom: LIVE_ZOOM }]} w={1000} left={80} top={250} labelTop={84} />
        <DataChips />
      </SceneFade>
    </Scene>
    <Scene span={T180.s10}><Closing180 /></Scene>
    <Subtitles captions={captions180} />
    <Vignette />
    <Grain />
    <EndFade total={TOTAL180} />
    <Soundtrack music="music180" vo={VO180} sfx={SFX180} total={TOTAL180} musicStartSec={MUSIC180_START_SEC} />
  </AbsoluteFill>
);
