import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { C, T180, TOTAL180 } from "./theme";
import { Background, ClipView, GlassFrame, Grain, Label, Mono, SceneFade, Vignette, keys } from "./components";
import { Globe } from "./Globe";
import { EndCard, Hud, Reveal } from "./scenes";
import { EndFade, Scene, Soundtrack } from "./Main";
import { Subtitles } from "./Subtitles";
import { captions180 } from "./captions180";

export const MUSIC180_START_SEC = 0;

// [file, start frame]; file names vo180_01 ... vo180_NN
const VO180: [string, number][] = [
  ["vo180_01", T180.intro[0] + 6],
  ["vo180_02", T180.problem[0] + 6],
  ["vo180_03", T180.idea[0] + 6],
  ["vo180_04", T180.how[0] + 6],
  ["vo180_05", T180.nasa[0] + 6],
  ["vo180_06", T180.closing[0] + 6],
];
const SFX180: [string, number, number][] = [
  ["quindar", 0, 0.5],
  ["impact", 300, 1],
  ["swell", 303, 0.6],
  ["whoosh", T180.problem[0], 0.4],
  ["whoosh", T180.idea[0], 0.4],
  ["whoosh", T180.how[0], 0.4],
  ["whoosh", T180.nasa[0], 0.4],
  ["riser", T180.closing[0] - 78, 0.5],
  ["impact", T180.closing[0] + 66, 1],
];

// hold the globe in its horizon state after the intro, brighten it for the closing
const tl = (f: number) => (f < 600 ? f : f < T180.closing[0] ? 500 + ((f - 600) % 300) : Math.min(899, 830 + (f - T180.closing[0])));

const GlobeLayer180: React.FC = () => {
  const f = useCurrentFrame();
  const o = keys(f, [[0, 0], [40, 1], [450, 1], [494, 0.55], [T180.closing[0] - 36, 0.55], [T180.closing[0] + 6, 1]]);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Globe tl={tl} />
    </AbsoluteFill>
  );
};

const CLIPS = ["missions", "rocky", "opentech", "data", "rideshare", "review", "sign", "flight", "ops", "debrief"];

const Section: React.FC<{ title: string; span: readonly [number, number]; clips?: boolean }> = ({ title, span, clips }) => {
  const f = useCurrentFrame();
  const dur = span[1] - span[0];
  const name = CLIPS[Math.floor(f / 150) % CLIPS.length];
  return (
    <SceneFade dur={dur} inF={14} outF={14}>
      <div style={{ position: "absolute", left: 120, top: 84 }}>
        <Mono size={20} color={C.cyanBright}>{`${Math.round(span[0] / 30)}s - ${Math.round(span[1] / 30)}s`}</Mono>
        <Label size={54} style={{ marginTop: 14 }}>{title}</Label>
      </div>
      {clips && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <div style={{ marginTop: 60 }}>
            <GlassFrame w={1300} h={731} glow={C.violetBright} strength={0.7}>
              <ClipView name={name} />
            </GlassFrame>
          </div>
        </AbsoluteFill>
      )}
    </SceneFade>
  );
};

export const SpaceDAO180: React.FC = () => (
  <AbsoluteFill style={{ background: C.bg }}>
    <Background />
    <GlobeLayer180 />
    <Sequence from={0} durationInFrames={T180.intro[1]}>
      <Hud />
      <Sequence from={300} durationInFrames={150}><Reveal /></Sequence>
    </Sequence>
    <Scene span={T180.problem}><Section title="The problem" span={T180.problem} /></Scene>
    <Scene span={T180.idea}><Section title="The idea" span={T180.idea} /></Scene>
    <Scene span={T180.how}><Section title="How it works" span={T180.how} clips /></Scene>
    <Scene span={T180.nasa}><Section title="Live NASA data" span={T180.nasa} clips /></Scene>
    <Sequence from={T180.closing[1] - 60} durationInFrames={60}><EndCard /></Sequence>
    <Subtitles captions={captions180} />
    <Vignette />
    <Grain />
    <EndFade total={TOTAL180} />
    <Soundtrack music="music180" vo={VO180} sfx={SFX180} total={TOTAL180} musicStartSec={MUSIC180_START_SEC} />
  </AbsoluteFill>
);
