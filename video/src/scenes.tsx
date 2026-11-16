import React from "react";
import { AbsoluteFill, Easing, interpolate, Sequence, useCurrentFrame } from "remotion";
import { C, FPS, MONO, SANS, T } from "./theme";
import { FLIGHT_RATE, FlightClip } from "./FlightClip";
import { ClipView, Flash, GlassFrame, Label, Mono, SceneFade, Shockwave, Wordmark, clamp, keys, ramp, useSpring, type Camera } from "./components";

// ---------------- 1-3: globe hud ----------------
export const Hud: React.FC<{ tl?: (f: number) => number }> = ({ tl }) => {
  const raw = useCurrentFrame();
  const f = tl ? tl(raw) : raw;
  const nodes = Math.min(12, Math.max(0, Math.floor(ramp(f, 126, 210, 0, 12.99))));
  const links =
    f < 214 ? Math.floor(ramp(f, 126, 206, 0, 9.99)) : f < 300 ? Math.round(keys(f, [[214, 9], [240, 3], [300, 3]])) : Math.round(ramp(f, 304, 350, 3, 66));
  const o = ramp(f, 118, 134) * ramp(f, 440, 456, 1, 0);
  if (o <= 0) return null;
  const treaty = f >= 214 && f < 300;
  const col = treaty ? C.faint : f >= 300 ? C.cyanBright : C.muted;
  return (
    <div style={{ position: "absolute", left: 96, top: 84, opacity: o, display: "flex", gap: 56 }}>
      {[
        ["NODES", String(nodes).padStart(2, "0")],
        ["LINKS", String(links).padStart(2, "0")],
      ].map(([k, v]) => (
        <div key={k}>
          <Mono size={18} color={C.faint}>{k}</Mono>
          <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 64, color: col, textShadow: f >= 300 ? "0 0 24px rgba(34,211,238,0.5)" : undefined }}>{v}</div>
        </div>
      ))}
      <div style={{ alignSelf: "end", paddingBottom: 10 }}>
        <Mono size={18} color={treaty ? C.over : C.faint}>{treaty ? "ONE TREATY AT A TIME" : f >= 300 ? "OPEN NETWORK" : "LAUNCH SITES / DEEP SPACE NETWORK"}</Mono>
      </div>
    </div>
  );
};

// ---------------- 4: reveal ----------------
// dur: frames on screen; wordAt / tagAt: when the wordmark and the tagline come in (the 30 s cut says "Enter SpaceDAO" at once)
export const Reveal: React.FC<{ dur?: number; wordAt?: number; tagAt?: number; tagline?: string }> = ({ dur = 150, wordAt = 22, tagAt = 56, tagline = "One open network for space" }) => {
  const f = useCurrentFrame();
  const out = ramp(f, dur - 12, dur, 1, 0, Easing.in(Easing.quad));
  const settle = ramp(f, 0, 50);
  return (
    <AbsoluteFill>
      <Flash at={0} color="#c4b5fd" max={0.8} dur={22} />
      <Shockwave at={0} color={C.violetBright} size={2400} dur={40} />
      <Shockwave at={4} color={C.cyan} size={1800} dur={34} />
      <AbsoluteFill style={{ opacity: out * ramp(f, 16, 40), background: "radial-gradient(ellipse 52% 30% at 50% 50%, rgba(4,5,13,0.92) 0%, rgba(4,5,13,0.78) 45%, rgba(4,5,13,0) 100%)" }} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: out, filter: `blur(${(1 - out) * 14}px)` }}>
        <div style={{ transform: `scale(${1.1 - settle * 0.1})`, marginTop: -40 }}>
          <Wordmark size={132} start={wordAt} spacing={0.16} />
        </div>
        <Mono size={24} color={C.cyanBright} style={{ marginTop: 34, opacity: ramp(f, tagAt, tagAt + 24), letterSpacing: `${ramp(f, tagAt, tagAt + 44, 0.6, 0.34)}em` }}>
          {tagline}
        </Mono>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------------- 5: share: a carousel, the card the narration names sits large in the centre ----------------
const SHARE: { name: string; label: string }[] = [
  { name: "opentech", label: "OPEN TECH" },
  { name: "rideshare", label: "RIDESHARE" },
  { name: "data", label: "LIVE DATA" },
];
// [scene frame, card in focus]: "technology" (open tech), "resources" (spare rocket room) from 36, "knowledge" (data) from 70
export const SHARE_FOCUS: [number, number][] = [[0, 0], [30, 0], [40, 1], [62, 1], [72, 2]];

export const Share: React.FC = () => {
  const f = useCurrentFrame();
  const focus = keys(f, SHARE_FOCUS);
  return (
    <SceneFade dur={T.share[1] - T.share[0]} outF={8}>
      <AbsoluteFill style={{ perspective: 2400 }}>
        {SHARE.map((c, i) => {
          const enter = useSpring(i * 5, { damping: 17, stiffness: 120 });
          const s = i - focus;
          const d = Math.min(Math.abs(s), 1.3);
          const lit = 1 - Math.min(d, 1);
          const w = 1120 * (1 - 0.42 * Math.min(d, 1));
          const h = (w * 9) / 16;
          const cx = 960 + Math.sign(s) * d * 650 + Math.sin(f * 0.02 + i) * 6;
          const cy = 450 + Math.sin(f * 0.045 + i * 2) * 6 + (1 - enter) * 220;
          return (
            <div
              key={c.name}
              style={{
                position: "absolute", left: cx - w / 2, top: cy - h / 2, zIndex: Math.round(100 - d * 40),
                opacity: Math.min(enter * 1.6, 1), transform: `rotateY(${-s * 16}deg)`, filter: `brightness(${0.5 + 0.5 * lit})`,
              }}
            >
              <GlassFrame w={w} h={h} glow={lit > 0.5 ? C.cyan : C.violetBright} strength={0.3 + 0.7 * lit}>
                <ClipView name={c.name} />
              </GlassFrame>
              <div style={{ marginTop: 22, textAlign: "center", opacity: 0.45 + 0.55 * lit }}>
                <Label size={26 + 12 * lit} color={lit > 0.5 ? C.cyanBright : C.text} style={{ textShadow: lit > 0.5 ? "0 0 26px rgba(34,211,238,0.7)" : undefined }}>
                  {c.label}
                </Label>
              </div>
            </div>
          );
        })}
      </AbsoluteFill>
    </SceneFade>
  );
};

// ---------------- 6: decide / sign ----------------
const SEALS = [
  { label: "AGENCY", at: 32 },
  { label: "COMPANY", at: 48 },
  { label: "SCIENCE", at: 64 },
  { label: "FUNDER", at: 78 },
];

export const SealRow: React.FC<{ seals?: { label: string; at: number }[]; top?: number; title?: string }> = ({ seals = SEALS, top = 700, title = "SIGNATURES" }) => {
  const f = useCurrentFrame();
  const lit = seals.filter((s) => f >= s.at).length;
  return (
  <div style={{ position: "absolute", left: 0, right: 0, top, display: "flex", justifyContent: "center", alignItems: "center", gap: 46 }}>
    {seals.map((s, i) => {
      const k = ramp(f, s.at, s.at + 10);
      const on = f >= s.at;
      return (
        <div key={s.label} style={{ textAlign: "center", width: 150 }}>
          <div style={{ position: "relative", width: 96, height: 96, margin: "0 auto" }}>
            {on && f < s.at + 22 && (
              <div style={{ position: "absolute", inset: -((f - s.at) * 2.4), borderRadius: "50%", border: `2px solid ${C.cyan}`, opacity: 1 - (f - s.at) / 22 }} />
            )}
            <svg width="96" height="96" viewBox="0 0 96 96">
              <circle cx="48" cy="48" r="42" fill={on ? "rgba(10,40,52,0.85)" : "rgba(8,10,26,0.8)"} stroke={on ? C.cyan : "rgba(255,255,255,0.18)"} strokeWidth="2.5" style={{ filter: on ? `drop-shadow(0 0 ${14 * k}px ${C.cyan})` : undefined }} />
              <circle cx="48" cy="48" r="32" fill="none" stroke={on ? "rgba(103,232,249,0.5)" : "rgba(255,255,255,0.08)"} strokeWidth="1" strokeDasharray="3 5" />
              <path d="M31 49 L43 61 L66 36" fill="none" stroke={C.cyanBright} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="60" strokeDashoffset={60 * (1 - k)} style={{ filter: `drop-shadow(0 0 8px ${C.cyan})` }} />
            </svg>
          </div>
          <Mono size={16} color={on ? C.cyanBright : C.muted} style={{ marginTop: 14, letterSpacing: "0.2em" }}>{s.label}</Mono>
          {i < 3 && null}
        </div>
      );
    })}
    <div style={{ marginLeft: 30, paddingLeft: 40, borderLeft: `1px solid ${C.line}` }}>
      <Mono size={16} color={C.faint}>{title}</Mono>
      <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 72, color: lit === 4 ? C.cyanBright : C.text, textShadow: lit === 4 ? "0 0 34px rgba(34,211,238,0.7)" : undefined }}>
        {lit}<span style={{ color: C.faint }}> / 4</span>
      </div>
    </div>
  </div>
  );
};

// "Decide together": the Go / No-Go poll, large, while the council's four seals light (the video names no company)
export const SIGN_SEALS = [
  { label: "NASA", at: 8 },
  { label: "JAXA", at: 16 },
  { label: "ESA", at: 24 },
  { label: "ISRO", at: 32 },
];
export const Sign: React.FC = () => {
  const f = useCurrentFrame();
  const a = useSpring(-5, { damping: 18, stiffness: 110 });
  const w = 1180;
  const h = (w * 9) / 16;
  return (
    <SceneFade dur={T.sign[1] - T.sign[0]} outF={6}>
      <AbsoluteFill style={{ perspective: 2400 }}>
        <div style={{ position: "absolute", left: (1920 - w) / 2, top: 50 + (1 - a) * 140, opacity: Math.min(a * 1.6, 1), transform: `rotateX(${(1 - a) * 8}deg) rotateY(${Math.sin(f * 0.03) * 1.2}deg)` }}>
          <GlassFrame w={w} h={h} glow={C.cyan} strength={0.8}>
            <ClipView name="review" />
          </GlassFrame>
        </div>
        <SealRow top={748} seals={SIGN_SEALS} title="GO / NO-GO" />
      </AbsoluteFill>
    </SceneFade>
  );
};

// ---------------- 7: flight push-in ----------------
export const Flight: React.FC = () => {
  const f = useCurrentFrame();
  const dur = T.flight[1] - T.flight[0];
  const push = interpolate(f, [0, dur], [1, 1.24], { ...clamp, easing: Easing.inOut(Easing.quad) });
  const enter = ramp(f, 0, 14);
  return (
    <SceneFade dur={dur} inF={6} outF={6}>
      <Flash at={0} color={C.cyanBright} max={0.35} dur={12} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", perspective: 2400 }}>
        <div style={{ transform: `scale(${push * (0.94 + enter * 0.06)}) rotateX(${(1 - enter) * 8}deg) rotateY(${Math.sin(f * 0.04) * 1.5}deg)`, marginTop: -30 }}>
          <GlassFrame w={1500} h={844} glow={C.cyan} strength={0.9}>
            {/* 44 frames: the end of the countdown, liftoff and the rise, played 1.6x */}
            <FlightClip from={0.012} rate={1.6 * FLIGHT_RATE} />
          </GlassFrame>
        </div>
      </AbsoluteFill>
      <div style={{ position: "absolute", left: 100, top: 48, opacity: ramp(f, 10, 24), padding: "10px 20px", borderRadius: 999, background: "rgba(4,5,13,0.82)", border: "1px solid rgba(255,255,255,0.14)", boxShadow: "0 8px 30px rgba(0,0,0,0.5)" }}>
        <Mono size={20} color={C.cyanBright}>LAUNCH / LIVE FLIGHT</Mono>
      </div>
    </SceneFade>
  );
};

// ---------------- 8: montage ----------------
// trim: the clip frame each cut starts on (cuts last CUT_LEN frames); in order under
// "Design | your mission with | live NASA | data. | Play | SpaceDAO."
// flight: the cut renders the game's 3D flight (FlightClip) instead of a capture, trim frames into it, cropped in on
// the live NASA chips (zoom, focus as fractions of the view)
const CUTS: { name: string; label: string; trim: number; zoom?: Camera; flight?: { zoom: number; focus: [number, number] } }[] = [
  { name: "missions", label: "MISSION SELECT", trim: 0 },
  { name: "ops", label: "MOON OPERATIONS", trim: 160 },
  { name: "flight", label: "LIVE NASA DATA", trim: 240, flight: { zoom: 1.6, focus: [0, 1] } },
  { name: "debrief", label: "DEBRIEF NETWORK", trim: 60 },
  { name: "rocky", label: "ROCKY", trim: 20 },
  { name: "intro", label: "PLAY", trim: 20 },
];
const CUT_LEN = 20;

export const Montage: React.FC = () => {
  const f = useCurrentFrame();
  const i = Math.min(CUTS.length - 1, Math.floor(f / CUT_LEN));
  const local = f - i * CUT_LEN;
  const cut = CUTS[i];
  const punch = Easing.out(Easing.cubic)(Math.min(local / 8, 1));
  const dir = i % 2 ? -1 : 1;
  const w = 1500;
  const h = (w * 9) / 16;
  return (
    <AbsoluteFill style={{ perspective: 2400 }}>
      <Flash at={i * CUT_LEN} color="#ffffff" max={0.28} dur={7} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ transform: `scale(${1.1 - 0.1 * punch + local * 0.0012}) rotateY(${dir * (4 - 4 * punch)}deg) rotateZ(${dir * (1.2 - 1.2 * punch)}deg)`, marginTop: -30 }}>
          <GlassFrame w={w} h={h} glow={i % 2 ? C.cyan : C.violetBright} strength={0.9}>
            <Sequence key={i} from={i * CUT_LEN} layout="none">
              {cut.flight ? (
                <FlightClip from={(cut.trim / FPS) * FLIGHT_RATE} zoom={cut.flight.zoom} focus={cut.flight.focus} />
              ) : (
                <ClipView name={cut.name} trimBefore={cut.trim} zoom={cut.zoom} />
              )}
            </Sequence>
          </GlassFrame>
        </div>
      </AbsoluteFill>
      <div style={{ position: "absolute", left: 110, top: 44, display: "flex", alignItems: "center", gap: 18, padding: "10px 20px", borderRadius: 999, background: "rgba(4,5,13,0.82)", border: "1px solid rgba(255,255,255,0.14)", boxShadow: "0 8px 30px rgba(0,0,0,0.5)" }}>
        <div style={{ width: 12, height: 12, borderRadius: 12, background: C.cyan, boxShadow: `0 0 16px ${C.cyan}` }} />
        <Label size={30} color={C.text}>{cut.label}</Label>
      </div>
      <div style={{ position: "absolute", right: 110, top: 44, padding: "10px 20px", borderRadius: 999, background: "rgba(4,5,13,0.82)", border: "1px solid rgba(255,255,255,0.14)", boxShadow: "0 8px 30px rgba(0,0,0,0.5)" }}>
        <Mono size={22} color={C.muted}>{String(i + 1).padStart(2, "0")} / {String(CUTS.length).padStart(2, "0")}</Mono>
      </div>
    </AbsoluteFill>
  );
};

// ---------------- 9: end card ----------------
// dur: frames on screen. The line arrives with the voice ("Space belongs to humanity." from frame 4) and holds to the fade.
export const EndCard: React.FC<{ dur?: number }> = ({ dur = 60 }) => {
  const f = useCurrentFrame();
  const s = useSpring(4, { damping: 14, stiffness: 120 });
  const line = ramp(f, 6, 28);
  const url = ramp(f, 40, 60);
  const fade = ramp(f, dur - 8, dur, 1, 0);
  return (
    <AbsoluteFill style={{ opacity: fade }}>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 55% 34% at 50% 40%, rgba(4,5,13,0.92) 0%, rgba(4,5,13,0.75) 50%, rgba(4,5,13,0) 100%)" }} />
      <Flash at={4} color="#ffffff" max={0.75} dur={20} />
      <Shockwave at={4} y={400} color={C.violetBright} size={2600} dur={44} />
      <Shockwave at={8} y={400} color={C.cyan} size={1900} dur={36} />
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 200 }}>
        <div style={{ transform: `scale(${1.2 - 0.2 * s})`, opacity: Math.min(s * 1.4, 1) }}>
          <Wordmark size={132} start={6} spacing={0.16} />
        </div>
        <div style={{ marginTop: 44, fontFamily: SANS, fontWeight: 700, fontSize: 76, letterSpacing: "-0.02em", color: "#ffffff", textShadow: "0 0 30px rgba(167,139,250,0.55), 0 2px 18px rgba(0,0,0,0.8)", opacity: line, transform: `translateY(${(1 - line) * 20}px)`, filter: `blur(${(1 - line) * 8}px)` }}>
          Space belongs to humanity.
        </div>
        <div
          style={{
            marginTop: 34, padding: "12px 32px", borderRadius: 999, fontFamily: MONO, fontWeight: 500, fontSize: 28, color: C.cyanBright, letterSpacing: "0.04em",
            background: "rgba(8,10,26,0.7)", border: "1px solid rgba(34,211,238,0.4)", boxShadow: "0 0 36px rgba(34,211,238,0.22), inset 0 1px 0 rgba(255,255,255,0.1)",
            backdropFilter: "blur(16px)", opacity: url, transform: `translateY(${(1 - url) * 16}px)`,
          }}
        >
          spacedao.dayon-x.workers.dev
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

