import React from "react";
import { AbsoluteFill, Easing, interpolate, OffthreadVideo, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { noise2D } from "@remotion/noise";
import { C, clipSrc, DISPLAY, MONO, SANS } from "./theme";

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);

export const ramp = (f: number, a: number, b: number, from = 0, to = 1, ease = easeOut) =>
  interpolate(f, [a, b], [from, to], { ...clamp, easing: ease });

// piecewise keyframes with ease-in-out between points
export const keys = (f: number, pts: [number, number][]) => {
  if (f <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (f <= pts[i][0]) return ramp(f, pts[i - 1][0], pts[i][0], pts[i - 1][1], pts[i][1], easeInOut);
  }
  return pts[pts.length - 1][1];
};

export const useSpring = (delay = 0, config: Partial<{ damping: number; stiffness: number; mass: number }> = {}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 140, mass: 0.9, ...config } });
};

export const Background: React.FC<{ intensity?: number }> = ({ intensity = 1 }) => {
  const frame = useCurrentFrame();
  const t = frame / 260;
  const blob = (seed: string, color: string, size: number, bx: number, by: number) => (
    <div
      style={{
        position: "absolute",
        left: bx + noise2D(seed, t, 0) * 220 - size / 2,
        top: by + noise2D(seed, 0, t) * 160 - size / 2,
        width: size,
        height: size,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${color} 0%, transparent 65%)`,
        opacity: 0.5 * intensity,
        filter: "blur(50px)",
      }}
    />
  );
  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${C.bg}, ${C.bgDeep})`, overflow: "hidden" }}>
      {blob("a", "rgba(139,92,246,0.28)", 1400, 1500, 300)}
      {blob("b", "rgba(34,211,238,0.16)", 1300, 380, 860)}
      {blob("c", "rgba(59,130,246,0.18)", 1100, 960, 100)}
    </AbsoluteFill>
  );
};

export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.06 }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "overlay", opacity }}>
      <svg width="100%" height="100%">
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={frame % 12} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </AbsoluteFill>
  );
};

export const Vignette: React.FC = () => (
  <AbsoluteFill
    style={{ pointerEvents: "none", background: "radial-gradient(ellipse 80% 75% at 50% 50%, transparent 55%, rgba(0,0,0,0.6) 100%)" }}
  />
);

export const Flash: React.FC<{ at: number; color?: string; dur?: number; max?: number }> = ({ at, color = "#ffffff", dur = 14, max = 0.7 }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [at, at + 2, at + dur], [0, max, 0], clamp);
  if (o <= 0) return null;
  return <AbsoluteFill style={{ background: color, opacity: o, mixBlendMode: "screen", pointerEvents: "none" }} />;
};

export const Shockwave: React.FC<{ at: number; x?: number; y?: number; color?: string; size?: number; dur?: number }> = ({ at, x = 960, y = 540, color = C.cyan, size = 1500, dur = 30 }) => {
  const frame = useCurrentFrame();
  const p = ramp(frame, at, at + dur, 0, 1, Easing.out(Easing.quad));
  if (frame < at || p >= 1) return null;
  const r = size * p;
  return (
    <div
      style={{
        position: "absolute", left: x - r / 2, top: y - r / 2, width: r, height: r, borderRadius: "50%",
        border: `${6 * (1 - p) + 1}px solid ${color}`, opacity: 1 - p, boxShadow: `0 0 60px ${color}, inset 0 0 60px ${color}`,
      }}
    />
  );
};

// fade a scene in and out with a short blur
export const SceneFade: React.FC<{ dur: number; inF?: number; outF?: number; children: React.ReactNode }> = ({ dur, inF = 8, outF = 6, children }) => {
  const frame = useCurrentFrame();
  const a = ramp(frame, 0, inF);
  const b = ramp(frame, dur - outF, dur, 1, 0, Easing.in(Easing.quad));
  const o = Math.min(a, b);
  return <AbsoluteFill style={{ opacity: o, filter: o < 1 ? `blur(${(1 - o) * 10}px)` : undefined }}>{children}</AbsoluteFill>;
};

// ---------------- glass frame + clip ----------------
export const GlassFrame: React.FC<{ w: number; h: number; glow?: string; strength?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ w, h, glow = C.violetBright, strength = 0.4, children, style }) => (
  <div
    style={{
      position: "relative", width: w, height: h, borderRadius: 22, padding: 8, boxSizing: "border-box",
      background: "linear-gradient(145deg, rgba(255,255,255,0.14), rgba(255,255,255,0.04))",
      border: "1px solid rgba(255,255,255,0.22)",
      boxShadow: `0 40px 90px rgba(0,0,0,0.55), 0 0 ${60 * strength}px ${glow}${Math.round(strength * 120).toString(16).padStart(2, "0")}, inset 0 1px 0 rgba(255,255,255,0.25)`,
      backdropFilter: "blur(20px)",
      ...style,
    }}
  >
    <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: 15, overflow: "hidden", background: C.bg }}>{children}</div>
  </div>
);

const Placeholder: React.FC<{ name: string }> = ({ name }) => {
  const f = useCurrentFrame();
  const sweep = ((f * 6) % 1800) - 300;
  return (
    <AbsoluteFill style={{ background: `linear-gradient(160deg, ${C.bgDeep}, #12103a 55%, #0a1a2e)` }}>
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${C.line} 1px, transparent 1px), linear-gradient(90deg, ${C.line} 1px, transparent 1px)`,
          backgroundSize: "48px 48px", opacity: 0.25,
        }}
      />
      <div style={{ position: "absolute", left: "6%", top: "9%", width: "34%", height: "7%", borderRadius: 8, background: "rgba(255,255,255,0.08)" }} />
      <div style={{ position: "absolute", left: "6%", top: "22%", width: "52%", height: "52%", borderRadius: 14, background: "rgba(139,92,246,0.10)", border: "1px solid rgba(167,139,250,0.25)" }} />
      <div style={{ position: "absolute", left: "64%", top: "22%", width: "30%", height: "24%", borderRadius: 14, background: "rgba(34,211,238,0.08)", border: "1px solid rgba(34,211,238,0.22)" }} />
      <div style={{ position: "absolute", left: "64%", top: "52%", width: "30%", height: "22%", borderRadius: 14, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
      <div style={{ position: "absolute", left: sweep, top: 0, width: 180, height: "100%", background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent)", transform: "skewX(-18deg)" }} />
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 10 }}>
        <div style={{ fontFamily: MONO, fontSize: 18, letterSpacing: "0.3em", color: C.faint }}>APP CLIP</div>
        <div style={{ fontFamily: DISPLAY, fontSize: 40, letterSpacing: "0.12em", color: C.text, textTransform: "uppercase" }}>{name}</div>
      </div>
    </AbsoluteFill>
  );
};

export const ClipView: React.FC<{ name: string; trimBefore?: number }> = ({ name, trimBefore = 0 }) => {
  const src = clipSrc(name);
  if (!src) return <Placeholder name={name} />;
  return <OffthreadVideo src={src} muted startFrom={trimBefore} style={{ width: "100%", height: "100%", objectFit: "cover" }} />;
};

// ---------------- wordmark ----------------
export const Wordmark: React.FC<{ size: number; start: number; spacing?: number }> = ({ size, start, spacing = 0.2 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const text = "SPACEDAO";
  const open = ramp(frame, start, start + 40, 0.9, spacing);
  return (
    <div
      style={{
        fontFamily: DISPLAY, fontSize: size, letterSpacing: `${open}em`, marginRight: `-${open}em`, display: "flex", whiteSpace: "nowrap",
        filter: `drop-shadow(0 0 ${size * 0.18}px rgba(139,92,246,0.55)) drop-shadow(0 0 ${size * 0.5}px rgba(34,211,238,0.25))`,
      }}
    >
      {text.split("").map((ch, i) => {
        const s = spring({ frame: frame - start - i * 2, fps, config: { damping: 18, stiffness: 150, mass: 0.8 } });
        const x = i / (text.length - 1);
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: Math.min(s * 1.5, 1),
              transform: `translateY(${(1 - s) * size * 0.3}px) scale(${0.9 + s * 0.1})`,
              filter: `blur(${(1 - s) * 16}px)`,
              color: `color-mix(in srgb, ${C.violetBright} ${Math.round((1 - x) * 100)}%, ${C.cyan})`,
            }}
          >
            {ch}
          </span>
        );
      })}
    </div>
  );
};

export const Mono: React.FC<{ children: React.ReactNode; size?: number; color?: string; style?: React.CSSProperties }> = ({ children, size = 22, color = C.muted, style }) => (
  <div style={{ fontFamily: MONO, fontSize: size, letterSpacing: "0.18em", textTransform: "uppercase", color, ...style }}>{children}</div>
);

export const Label: React.FC<{ children: React.ReactNode; size?: number; color?: string; style?: React.CSSProperties }> = ({ children, size = 34, color = C.text, style }) => (
  <div style={{ fontFamily: DISPLAY, fontSize: size, letterSpacing: "0.14em", textTransform: "uppercase", color, ...style }}>{children}</div>
);

export { SANS };
