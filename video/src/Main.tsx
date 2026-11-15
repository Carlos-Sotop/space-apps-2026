import React from "react";
import { AbsoluteFill, Audio, interpolate, Sequence, useCurrentFrame } from "remotion";
import { audio, audioSrc, C, FPS, T, TOTAL } from "./theme";
import { Background, clamp, Grain, keys, ramp, Vignette } from "./components";
import { Globe } from "./Globe";
import { EndCard, Flight, Hud, Montage, Reveal, Share, SIGN_SEALS, Sign } from "./scenes";
import { Subtitles } from "./Subtitles";

// Seconds of music.mp3 (Scott Buckley, "Artemis", CC BY 4.0) to skip at frame 0: the track's build-up at 27.0 s
// lands on frame 300 with the "Enter SpaceDAO" impact (Dayon, 2026-11-15). Negative delays the music instead.
export const MUSIC_START_SEC = 17.0;

// narration: [file, start frame]. One continuous take: never cut, spaced or sped up; the picture follows it.
const VO: [string, number][] = [["vo30", 24]];

// effects: [file, frame, volume]. Few, in the silences (Dayon, 2026-11-15): the reveal's riser and impact,
// low whooshes on scene changes, the four seals. Anything that lands on the voice plays at 0.4x (Soundtrack).
const r = T.reveal[0], g = T.sign[0];
const SFX: [string, number, number][] = [
  ["riser", r - 78, 0.55],
  ["impact", r, 1],
  ...[T.treaty[0], T.share[0], T.sign[0], T.flight[0], T.montage[0]].map((at): [string, number, number] => ["whoosh", at, 0.35]),
  ...SIGN_SEALS.map((x): [string, number, number] => ["seal", g + x.at, 0.55]),
];
const SFX_GAIN = 0.25;

// duck: music gain under the voice; idle: with no voice; lifts: [from, to, gain] windows where the music rises anyway
type SoundtrackProps = {
  music: string; vo: [string, number][]; sfx: [string, number, number][]; total: number; musicStartSec?: number;
  duck?: number; idle?: number; lifts?: [number, number, number][];
};

export const Soundtrack: React.FC<SoundtrackProps> = ({ music: musicName, vo: VO, sfx: SFX, total: TOTAL, musicStartSec = MUSIC_START_SEC, duck: duckGain = 0.12, idle = 0.45, lifts = [] }) => {
  const music = audioSrc(musicName);
  // where the voice is speaking: the take's speech runs (scripts/assets.mjs) or, without them, the whole file
  const voIntervals = VO.flatMap(([name, at]) => {
    const a = audio(name);
    if (!a) return [];
    return a.speech?.length
      ? a.speech.map(([x, y]) => [at + Math.round(x * FPS), at + Math.round(y * FPS)] as const)
      : [[at, at + Math.round(a.seconds * FPS)] as const];
  });
  // the duck lands 8 frames before each word so a soft first consonant is never under a music swell
  const voActive = (f: number) => voIntervals.some(([a, z]) => f >= a - 8 && f <= z + 3);
  const volume = (f: number) => {
    // share of the 9 frames around f where the voice speaks: an ~8-frame ramp in and out of the duck
    let duck = 0;
    for (let d = -4; d <= 4; d++) duck += voActive(f + d) ? 1 : 0;
    duck /= 9;
    // lifts only where the voice is silent
    const lift = Math.max(0, ...lifts.map(([a, z, gain]) => gain * Math.min(ramp(f, a, a + 6), ramp(f, z - 12, z, 1, 0)))) * (1 - duck);
    const base = Math.max(interpolate(duck, [0, 1], [idle, duckGain]), lift);
    return base * interpolate(f, [0, 20], [0, 1], clamp) * interpolate(f, [TOTAL - 24, TOTAL], [1, 0], clamp);
  };
  const skip = Math.max(0, Math.round(musicStartSec * FPS));
  const delay = Math.max(0, Math.round(-musicStartSec * FPS));
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
            <Audio src={src} volume={vol * SFX_GAIN * (voActive(at) ? 0.4 : 1)} />
          </Sequence>
        ) : null;
      })}
    </>
  );
};

export const Scene: React.FC<{ span: readonly [number, number]; children: React.ReactNode }> = ({ span, children }) => (
  <Sequence from={span[0]} durationInFrames={span[1] - span[0]}>
    {children}
  </Sequence>
);

// v2 spans -> the globe and HUD timeline, which keeps the original 900-frame beats
// (earth 0-120, arcs 120-210, treaty 210-300, reveal 300-450, horizon 450-494, end card 840)
const BEATS: [number, number][] = [[0, 0], [108, 120], [172, 210], [300, 300], [400, 450], [498, 570], [545, 660], [588, 720], [718, 840], [840, 900]];
export const tl30 = (f: number) => {
  if (f <= 0) return 0;
  for (let i = 1; i < BEATS.length; i++) {
    const [a, x] = BEATS[i - 1], [b, y] = BEATS[i];
    if (f <= b) return x + ((f - a) / (b - a)) * (y - x);
  }
  return 900 + (f - 840);
};

const GlobeLayer: React.FC = () => {
  const f = tl30(useCurrentFrame());
  const o = keys(f, [[0, 0], [40, 1], [450, 1], [494, 0.55], [716, 0.55], [742, 0.3], [832, 0.3], [868, 1]]);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Globe tl={tl30} />
    </AbsoluteFill>
  );
};

export const EndFade: React.FC<{ total?: number }> = ({ total = TOTAL }) => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{ background: "#000", opacity: ramp(f, total - 10, total - 1, 0, 1), pointerEvents: "none" }} />;
};

export const SpaceDAO30: React.FC = () => (
  <AbsoluteFill style={{ background: C.bg }}>
    <Background />
    <GlobeLayer />
    <Hud tl={tl30} />
    <Scene span={T.reveal}><Reveal dur={T.reveal[1] - T.reveal[0]} wordAt={4} tagAt={26} /></Scene>
    <Scene span={T.share}><Share /></Scene>
    <Scene span={T.sign}><Sign /></Scene>
    <Scene span={T.flight}><Flight /></Scene>
    <Scene span={T.montage}><Montage /></Scene>
    <Scene span={T.end}><EndCard dur={T.end[1] - T.end[0]} /></Scene>
    <Subtitles />
    <Vignette />
    <Grain />
    <EndFade />
    {/* the voice leads: music 0.12 under it, 0.45 in its pauses, rising before "Enter SpaceDAO" and after the last line */}
    <Soundtrack music="music" vo={VO} sfx={SFX} total={TOTAL} duck={0.12} idle={0.45} lifts={[[270, 302, 0.7], [787, 840, 0.7]]} />
  </AbsoluteFill>
);
