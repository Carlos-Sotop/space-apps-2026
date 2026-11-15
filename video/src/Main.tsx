import React from "react";
import { AbsoluteFill, Audio, interpolate, Sequence, useCurrentFrame } from "remotion";
import { audio, audioSrc, C, FPS, T, TOTAL } from "./theme";
import { Background, clamp, Grain, keys, ramp, Vignette } from "./components";
import { Globe } from "./Globe";
import { EndCard, Flight, Hud, Montage, Reveal, SHARE_FOCUS, Share, SIGN_SEALS, Sign } from "./scenes";
import { Subtitles } from "./Subtitles";

// Seconds of music.mp3 (Scott Buckley, "Artemis", CC BY 4.0) to skip at frame 0: the track's build-up at 27.0 s
// lands on frame 300 with the "Enter SpaceDAO" impact (Dayon, 2026-11-15). Negative delays the music instead.
export const MUSIC_START_SEC = 17.0;

// narration: [file, start frame]. One continuous take: never cut, spaced or sped up; the picture follows it.
const VO: [string, number][] = [["vo30", 24]];

// effects: [file, frame, volume]
const e = T.belong[0], t = T.treaty[0], r = T.reveal[0], s = T.share[0], g = T.sign[0], fl = T.flight[0], m = T.montage[0], en = T.end[0];
const SFX: [string, number, number][] = [
  ["quindar", 0, 0.5],
  ["swell", e - 6, 0.4],
  ...[0, 1, 2, 3, 4, 5, 6, 7].map((i): [string, number, number] => ["ping", e + 6 + i * 7, 0.3]),
  ["whoosh", t, 0.4],
  ["glitch", t + 10, 0.4], ["glitch", t + 40, 0.35], ["glitch", t + 72, 0.35], ["glitch", t + 104, 0.4],
  ["riser", r - 78, 0.55],
  ["impact", r, 1],
  ["swell", r + 3, 0.6],
  ["whoosh", r + 2, 0.5],
  ["glass", r + 30, 0.4], ["glass", r + 48, 0.3], ["glass", r + 64, 0.3],
  ["whoosh", s, 0.45],
  // pops on the carousel moves: "technology", "resources", "knowledge"
  ["pop", s + 4, 0.4], ["pop", s + SHARE_FOCUS[1][0], 0.4], ["pop", s + SHARE_FOCUS[3][0], 0.4],
  ["whoosh", g, 0.4],
  ...SIGN_SEALS.map((x): [string, number, number] => ["seal", g + x.at, 0.55]),
  ["impact", g + SIGN_SEALS[3].at + 4, 0.45],
  ["riser", fl - 60, 0.45],
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

// duck: music gain under the voice; idle: with no voice; lifts: [from, to, gain] windows where the music rises anyway
type SoundtrackProps = {
  music: string; vo: [string, number][]; sfx: [string, number, number][]; total: number; musicStartSec?: number;
  duck?: number; idle?: number; lifts?: [number, number, number][];
};

export const Soundtrack: React.FC<SoundtrackProps> = ({ music: musicName, vo: VO, sfx: SFX, total: TOTAL, musicStartSec = MUSIC_START_SEC, duck: duckGain = 0.14, idle = 0.5, lifts = [] }) => {
  const music = audioSrc(musicName);
  const voIntervals = VO.flatMap(([name, at]) => {
    const a = audio(name);
    return a ? [[at, at + Math.round(a.seconds * FPS)] as const] : [];
  });
  const voActive = (f: number) => voIntervals.some(([a, z]) => f >= a - 4 && f <= z + 4);
  const volume = (f: number) => {
    let duck = 0;
    for (let d = -9; d <= 9; d += 3) duck += voActive(f + d) ? 1 : 0;
    duck /= 7;
    const lift = Math.max(0, ...lifts.map(([a, z, gain]) => gain * Math.min(ramp(f, a, a + 6), ramp(f, z - 12, z, 1, 0))));
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
            <Audio src={src} volume={vol * SFX_GAIN} />
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
    {/* the take runs 24-793 with no gaps: music sits about 10 dB under it, rises with the impact on 300 and after the last line */}
    <Soundtrack music="music" vo={VO} sfx={SFX} total={TOTAL} duck={0.32} idle={0.6} lifts={[[290, 318, 0.6]]} />
  </AbsoluteFill>
);
