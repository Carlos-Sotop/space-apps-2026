import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { C, MONO, SANS, T } from "./theme";
import { ClipView, Flash, GlassFrame, LIVE_ZOOM, Label, Mono, ROCKY_ZOOM, SceneFade, Shockwave, Wordmark, clamp, keys, ramp, useSpring, type Zoom } from "./components";

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
export const Reveal: React.FC = () => {
  const f = useCurrentFrame();
  const out = ramp(f, 138, 150, 1, 0, Easing.in(Easing.quad));
  const settle = ramp(f, 0, 50);
  return (
    <AbsoluteFill>
      <Flash at={0} color="#c4b5fd" max={0.8} dur={22} />
      <Shockwave at={0} color={C.violetBright} size={2400} dur={40} />
      <Shockwave at={4} color={C.cyan} size={1800} dur={34} />
      <AbsoluteFill style={{ opacity: out * ramp(f, 16, 40), background: "radial-gradient(ellipse 52% 30% at 50% 50%, rgba(4,5,13,0.92) 0%, rgba(4,5,13,0.78) 45%, rgba(4,5,13,0) 100%)" }} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: out, filter: `blur(${(1 - out) * 14}px)` }}>
        <div style={{ transform: `scale(${1.1 - settle * 0.1})`, marginTop: -40 }}>
          <Wordmark size={132} start={22} spacing={0.16} />
        </div>
        <Mono size={24} color={C.cyanBright} style={{ marginTop: 34, opacity: ramp(f, 56, 80), letterSpacing: `${ramp(f, 56, 100, 0.6, 0.34)}em` }}>
          One open network for space
        </Mono>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------------- 5: three clips ----------------
const SHARE: { name: string; label: string; x: number; ry: number; at: number; scale: number; y: number; zoom?: Zoom }[] = [
  { name: "opentech", label: "OPEN TECH", x: 330, ry: 20, at: 6, scale: 1, y: 40 },
  { name: "data", label: "DATA", x: 960, ry: 0, at: 40, scale: 1.16, y: 0, zoom: LIVE_ZOOM },
  { name: "rideshare", label: "RIDESHARE", x: 1590, ry: -20, at: 74, scale: 1, y: 40 },
];

export const Share: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <SceneFade dur={T.share[1] - T.share[0]} outF={8}>
      <AbsoluteFill style={{ perspective: 2200 }}>
        {SHARE.map((c, i) => {
          const s = useSpring(c.at, { damping: 17, stiffness: 120 });
          const active = f >= c.at && f < c.at + 36;
          const focus = ramp(f, c.at, c.at + 10) * ramp(f, c.at + 30, c.at + 44, 1, 0.55);
          const bob = Math.sin(f * 0.045 + i * 2) * 10;
          const px = Math.sin(f * 0.02 + i) * 12;
          const w = 600 * c.scale;
          const h = (w * 9) / 16;
          return (
            <div
              key={c.name}
              style={{
                position: "absolute", left: c.x - w / 2 + px, top: 470 - h / 2 + c.y + bob + (1 - s) * 240,
                opacity: Math.min(s * 1.6, 1),
                transform: `rotateY(${c.ry * (0.6 + 0.4 * s) + Math.sin(f * 0.03 + i) * 2}deg) rotateX(${3 - s * 3}deg) scale(${0.96 + 0.06 * focus})`,
                transformStyle: "preserve-3d",
                filter: `brightness(${0.62 + 0.38 * Math.max(focus, i === 1 && f > 100 ? 1 : 0)})`,
              }}
            >
              <GlassFrame w={w} h={h} glow={i === 1 ? C.cyan : C.violetBright} strength={0.3 + 0.7 * focus}>
                <ClipView name={c.name} zoom={c.zoom} />
              </GlassFrame>
              <div style={{ marginTop: 34, textAlign: "center", transform: "translateZ(30px)" }}>
                <Label size={34} color={active ? C.cyanBright : C.text} style={{ textShadow: active ? "0 0 26px rgba(34,211,238,0.7)" : undefined }}>
                  {c.label}
                </Label>
                <div style={{ margin: "14px auto 0", height: 3, width: 90 * Math.max(focus, 0.3), background: `linear-gradient(90deg, ${C.violetBright}, ${C.cyan})`, boxShadow: "0 0 14px rgba(34,211,238,0.6)", borderRadius: 3 }} />
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

export const SealRow: React.FC<{ seals?: { label: string; at: number }[]; top?: number }> = ({ seals = SEALS, top = 700 }) => {
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
      <Mono size={16} color={C.faint}>SIGNATURES</Mono>
      <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 72, color: lit === 4 ? C.cyanBright : C.text, textShadow: lit === 4 ? "0 0 34px rgba(34,211,238,0.7)" : undefined }}>
        {lit}<span style={{ color: C.faint }}> / 4</span>
      </div>
    </div>
  </div>
  );
};

export const Sign: React.FC = () => {
  const f = useCurrentFrame();
  const a = useSpring(2, { damping: 18, stiffness: 110 });
  const b = useSpring(18, { damping: 18, stiffness: 110 });
  return (
    <SceneFade dur={T.sign[1] - T.sign[0]} outF={6}>
      <AbsoluteFill style={{ perspective: 2400 }}>
        <div style={{ position: "absolute", left: 90, top: 80 + (1 - a) * 160, opacity: Math.min(a * 1.6, 1), transform: `rotateY(${10 - 3 * a + Math.sin(f * 0.03) * 1.5}deg)` }}>
          <GlassFrame w={1000} h={562} glow={C.violetBright} strength={0.7}>
            <ClipView name="review" />
          </GlassFrame>
        </div>
        <div style={{ position: "absolute", left: 1150, top: 150 + (1 - b) * 180, opacity: Math.min(b * 1.6, 1), transform: `rotateY(${-14 + 4 * b + Math.sin(f * 0.03 + 1) * 1.5}deg)` }}>
          <GlassFrame w={680} h={382} glow={C.cyan} strength={0.7}>
            <ClipView name="sign" />
          </GlassFrame>
        </div>
        <SealRow />
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
            <ClipView name="flight" />
          </GlassFrame>
        </div>
      </AbsoluteFill>
      <div style={{ position: "absolute", left: 120, top: 84, opacity: ramp(f, 10, 24) }}>
        <Mono size={20} color={C.cyanBright}>LAUNCH / LIVE FLIGHT</Mono>
      </div>
    </SceneFade>
  );
};

// ---------------- 8: montage ----------------
// trim is added to the montage frame: cut i shows clip frames [i * CUT_LEN + trim, (i + 1) * CUT_LEN + trim)
const CUTS: { name: string; label: string; trim: number; zoom?: Zoom }[] = [
  { name: "missions", label: "MISSION SELECT", trim: 0 },
  { name: "rocky", label: "ROCKY", trim: 0, zoom: ROCKY_ZOOM },
  { name: "ops", label: "MOON OPERATIONS", trim: 0 },
  { name: "debrief", label: "DEBRIEF NETWORK", trim: 0 },
  { name: "missions", label: "LIVE NASA DATA", trim: 60, zoom: { scale: 1.35, origin: "20% 85%" } },
  { name: "rocky", label: "PLAY", trim: 60, zoom: ROCKY_ZOOM },
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
            <ClipView name={cut.name} trimBefore={cut.trim} zoom={cut.zoom} />
          </GlassFrame>
        </div>
      </AbsoluteFill>
      <div style={{ position: "absolute", left: 130, top: 78, display: "flex", alignItems: "center", gap: 22 }}>
        <div style={{ width: 12, height: 12, borderRadius: 12, background: C.cyan, boxShadow: `0 0 16px ${C.cyan}` }} />
        <Label size={30} color={C.text}>{cut.label}</Label>
      </div>
      <div style={{ position: "absolute", right: 130, top: 78 }}>
        <Mono size={22} color={C.muted}>{String(i + 1).padStart(2, "0")} / {String(CUTS.length).padStart(2, "0")}</Mono>
      </div>
    </AbsoluteFill>
  );
};

// ---------------- 9: end card ----------------
export const EndCard: React.FC = () => {
  const f = useCurrentFrame();
  const s = useSpring(6, { damping: 14, stiffness: 120 });
  const line = ramp(f, 18, 40);
  const url = ramp(f, 36, 56);
  const fade = ramp(f, 52, 60, 1, 0);
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

