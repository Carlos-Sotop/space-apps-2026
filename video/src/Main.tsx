import React from "react";
import { AbsoluteFill, Audio, interpolate, Sequence, useCurrentFrame } from "remotion";
import { audio, audioSrc, C, FPS, T, TOTAL } from "./theme";
import { Background, clamp, Grain, keys, ramp, Vignette } from "./components";
import { Globe } from "./Globe";
import { EndCard, Flight, Hud, Montage, Reveal, Share, Sign } from "./scenes";
import { Subtitles } from "./Subtitles";

// Seconds of music.mp3 to skip at frame 0 so its drop lands on frame 300 (0:10).
// Example: drop at 0:14 in the file -> 4. A negative value delays the music instead (-2 = starts at 0:02).
export const MUSIC_START_SEC = 0;

// narration: [file, start frame]
const VO: [string, number][] = [
  ["vo_01", 6],
  ["vo_02", T.belong[0] + 3],
  ["vo_03", T.treaty[0] + 3],
  ["vo_04", T.reveal[0] + 18],
  ["vo_05", T.share[0] + 3],
  ["vo_06", T.sign[0] + 3],
  ["vo_07", T.flight[0] + 3],
  ["vo_08", T.montage[0] + 3],
  ["vo_09", T.end[0] + 3],
];

// effects: [file, frame, volume]
const e = T.belong[0], t = T.treaty[0], r = T.reveal[0], s = T.share[0], g = T.sign[0], fl = T.flight[0], m = T.montage[0], en = T.end[0];
const SFX: [string, number, number][] = [
  ["quindar", 2, 0.5],
  ["swell", e - 6, 0.4],
  ...[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i): [string, number, number] => ["ping", e + 6 + i * 8, 0.3]),
  ["whoosh", t, 0.4],
  ["glitch", t + 4, 0.4], ["glitch", t + 22, 0.35], ["glitch", t + 42, 0.35], ["glitch", t + 60, 0.4],
  ["riser", r - 78, 0.55],
  ["impact", r, 1],
  ["swell", r + 3, 0.6],
  ["whoosh", r + 2, 0.5],
  ["glass", r + 40, 0.4], ["glass", r + 62, 0.3], ["glass", r + 80, 0.3],
  ["whoosh", s, 0.45],
  ["pop", s + 8, 0.4], ["pop", s + 42, 0.4], ["pop", s + 76, 0.4],
  ["whoosh", g, 0.4],
  ...[32, 48, 64, 78].map((d): [string, number, number] => ["seal", g + d, 0.55]),
  ["impact", g + 80, 0.45],
  ["riser", fl - 70, 0.45],
  ["whoosh", fl, 0.5],
  ["roar", fl, 0.32],
  ...[0, 1, 2, 3, 4, 5].map((i): [string, number, number] => ["click", m + i * 20, 0.55]),
  ...[0, 2, 4].map((i): [string, number, number] => ["whoosh", m + i * 20, 0.3]),
  ["riser", en - 78, 0.5],
  ["impact", en + 6, 1],
  ["swell", en + 8, 0.6],
  ["beep", en + 30, 0.25],
];
const SFX_GAIN = 0.55;

const voIntervals = VO.flatMap(([name, at]) => {
  const a = audio(name);
  return a ? [[at, at + Math.round(a.seconds * FPS)] as const] : [];
});
const voActive = (f: number) => voIntervals.some(([a, z]) => f >= a - 4 && f <= z + 4);

const Soundtrack: React.FC = () => {
  const music = audioSrc("music");
  const volume = (f: number) => {
    let duck = 0;
    for (let d = -9; d <= 9; d += 3) duck += voActive(f + d) ? 1 : 0;
    duck /= 7;
    const base = interpolate(duck, [0, 1], [0.5, 0.14]);
    return base * interpolate(f, [0, 20], [0, 1], clamp) * interpolate(f, [TOTAL - 24, TOTAL], [1, 0], clamp);
  };
  const skip = Math.max(0, Math.round(MUSIC_START_SEC * FPS));
  const delay = Math.max(0, Math.round(-MUSIC_START_SEC * FPS));
  return (
    <>
      {music && (
        <Sequence from={delay}>
          <Audio src={music} startFrom={skip} volume={(f) => volume(f + delay)} />
        </Sequence>
      )}
      {VO.map(([name, at]) => {
        const src = audioSrc(name);
        return src ? (
          <Sequence key={name} from={at}>
            <Audio src={src} volume={1} />
          </Sequence>
        ) : null;
      })}
      {SFX.map(([name, at, vol], i) => {
        const src = audioSrc(`sfx_${name}`);
        return src ? (
          <Sequence key={i} from={at}>
            <Audio src={src} volume={vol * SFX_GAIN} />
          </Sequence>
        ) : null;
      })}
    </>
  );
};

const Scene: React.FC<{ span: readonly [number, number]; children: React.ReactNode }> = ({ span, children }) => (
  <Sequence from={span[0]} durationInFrames={span[1] - span[0]}>
    {children}
  </Sequence>
);

const GlobeLayer: React.FC = () => {
  const f = useCurrentFrame();
  const o = keys(f, [[0, 0], [40, 1], [450, 1], [494, 0.55], [716, 0.55], [742, 0.3], [832, 0.3], [868, 1]]);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Globe />
    </AbsoluteFill>
  );
};

const EndFade: React.FC = () => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{ background: "#000", opacity: ramp(f, TOTAL - 10, TOTAL - 1, 0, 1), pointerEvents: "none" }} />;
};

export const SpaceDAO30: React.FC = () => (
  <AbsoluteFill style={{ background: C.bg }}>
    <Background />
    <GlobeLayer />
    <Hud />
    <Scene span={T.reveal}><Reveal /></Scene>
    <Scene span={T.share}><Share /></Scene>
    <Scene span={T.sign}><Sign /></Scene>
    <Scene span={T.flight}><Flight /></Scene>
    <Scene span={T.montage}><Montage /></Scene>
    <Scene span={T.end}><EndCard /></Scene>
    <Subtitles />
    <Vignette />
    <Grain />
    <EndFade />
    <Soundtrack />
  </AbsoluteFill>
);
