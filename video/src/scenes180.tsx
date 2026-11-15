import React from "react";
import { AbsoluteFill, Easing, Sequence, useCurrentFrame } from "remotion";
import { C, DISPLAY, MONO, SANS, T180 } from "./theme";
import { captions180 } from "./captions180";
import { ClipView, Flash, GlassFrame, Label, Mono, Shockwave, Wordmark, ramp, useSpring, type Camera } from "./components";

// local frame (inside a scene starting at `start`) of the caption that begins with `prefix`
export const cue = (prefix: string, start: number) => {
  const c = captions180.find((x) => x.text.startsWith(prefix));
  return c ? { from: c.from - start, to: c.to - start } : { from: 0, to: 60 };
};

const grad = `linear-gradient(90deg, ${C.violetBright}, ${C.cyan})`;

// ---------------- clip stage with cross-dissolves and gentle drift ----------------
// each clip starts from its own first frame when its item appears (from), not from the scene start
type Item = { name: string; from: number; to: number; label?: string; zoom?: Camera };
export const ClipShow: React.FC<{ items: Item[]; w?: number; top?: number; left?: number; glow?: string; fadeLast?: boolean; labelTop?: number }> = ({ items, w = 1500, top = 110, left, glow = C.violetBright, fadeLast, labelTop }) => {
  const f = useCurrentFrame();
  const h = (w * 9) / 16;
  return (
    <AbsoluteFill style={{ perspective: 2400 }}>
      {items.map((it, i) => {
        if (f < it.from - 2 || f > it.to + 2) return null;
        const last = i === items.length - 1 && !fadeLast;
        const p = Math.min(1, Math.max(0, (f - it.from) / (it.to - it.from)));
        const vis = ramp(f, it.from, it.from + 16, i === 0 ? 0 : 0, 1, Easing.inOut(Easing.quad)) * (last ? 1 : ramp(f, it.to - 16, it.to, 1, 0, Easing.inOut(Easing.quad)));
        const dir = i % 2 ? -1 : 1;
        return (
          <div key={i}>
            <div
              style={{
                position: "absolute", left: left ?? (1920 - w) / 2, top, opacity: vis,
                transform: `translateX(${dir * 22 * (p - 0.5)}px) scale(${1 + 0.055 * p}) rotateY(${dir * (2 - 4 * p)}deg) rotateX(${1.2 - 2 * p}deg)`,
                transformOrigin: "50% 50%",
              }}
            >
              <GlassFrame w={w} h={h} glow={i % 2 ? C.cyan : glow} strength={0.8}>
                <Sequence from={it.from} layout="none">
                  <ClipView name={it.name} zoom={it.zoom} />
                </Sequence>
              </GlassFrame>
            </div>
            {it.label && (
              <div style={{ position: "absolute", left: 120, top: labelTop ?? Math.max(20, top - 50), opacity: vis, display: "flex", alignItems: "center", gap: 20 }}>
                <div style={{ width: 11, height: 11, borderRadius: 11, background: C.cyan, boxShadow: `0 0 14px ${C.cyan}` }} />
                <Label size={26}>{it.label}</Label>
              </div>
            )}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// ---------------- 01: facts ----------------
const Fact: React.FC<{ text: string; source: string; from: number; to: number }> = ({ text, source, from, to }) => {
  const f = useCurrentFrame();
  const o = ramp(f, from, from + 18) * ramp(f, to - 14, to, 1, 0);
  if (o <= 0) return null;
  return (
    <div
      style={{
        position: "absolute", left: 96, bottom: 196, opacity: o, transform: `translateX(${(1 - o) * -30}px)`, padding: "18px 34px 16px 28px",
        borderLeft: `3px solid ${C.cyan}`, borderRadius: 6, background: "linear-gradient(90deg, rgba(8,10,26,0.82), rgba(8,10,26,0.35))", backdropFilter: "blur(14px)",
        boxShadow: "0 0 40px rgba(34,211,238,0.12)",
      }}
    >
      <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 32, letterSpacing: "0.08em", color: C.text, textTransform: "uppercase" }}>{text}</div>
      <Mono size={14} color={C.faint} style={{ marginTop: 8, letterSpacing: "0.16em" }}>{source}</Mono>
    </div>
  );
};

export const Facts: React.FC = () => {
  const a = cue("Today, five", T180.s01[0]);
  const b = cue("And more than", T180.s01[0]);
  return (
    <>
      <Fact text="5 agencies · 15 nations · 1 station" source="SOURCE: NASA.GOV / INTERNATIONAL SPACE STATION" from={a.from} to={b.from - 4} />
      <Fact text="70+ nations · Artemis Accords" source="SOURCE: NASA.GOV / ARTEMIS ACCORDS" from={b.from} to={b.to + 40} />
    </>
  );
};

// ---------------- 02: kinetic cards ----------------
const CARDS = [
  { prefix: "Designs stay", text: "EXPORT RULES" },
  { prefix: "Data sits", text: "SEPARATE ARCHIVES" },
  { prefix: "And most of the world", text: "WATCHING FROM OUTSIDE" },
];

export const Treaty: React.FC = () => {
  const f = useCurrentFrame();
  const t0 = T180.s02[0];
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 60% 34% at 50% 46%, rgba(4,5,13,0.85) 0%, rgba(4,5,13,0.45) 60%, transparent 100%)", opacity: ramp(f, 200, 240) }} />
      {CARDS.map((c, i) => {
        const q = cue(c.prefix, t0);
        const from = q.from - 2;
        const to = q.to + 8;
        const o = ramp(f, from, from + 12) * ramp(f, to - 12, to, 1, 0);
        if (o <= 0) return null;
        const k = f - from;
        const jit = k < 8 ? Math.sin(k * 9.1) * (8 - k) * 3 : 0;
        return (
          <AbsoluteFill key={c.text} style={{ alignItems: "center", justifyContent: "center", opacity: o }}>
            <div style={{ transform: `translateX(${jit}px)`, textAlign: "center", marginTop: -40 }}>
              <Mono size={20} color={C.over} style={{ marginBottom: 26, letterSpacing: "0.4em" }}>{`0${i + 1} / 03`}</Mono>
              <div style={{ fontFamily: DISPLAY, fontSize: 88, letterSpacing: "0.1em", color: C.text, textShadow: "0 0 50px rgba(251,113,133,0.35), 0 4px 30px rgba(0,0,0,0.8)", filter: `blur(${(1 - ramp(f, from, from + 14)) * 14}px)` }}>
                {c.text}
              </div>
              <div style={{ margin: "34px auto 0", height: 3, width: 560 * ramp(f, from + 4, from + 30), background: `linear-gradient(90deg, transparent, ${C.over}, transparent)`, boxShadow: `0 0 16px ${C.over}` }} />
            </div>
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
};

// ---------------- 03: pillars ----------------
const stroke = { fill: "none", stroke: "url(#pg)", strokeWidth: 3.2, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const ICONS: Record<string, React.ReactNode> = {
  tech: (
    <g {...stroke}>
      <path d="M60 12 L102 36 V84 L60 108 L18 84 V36 Z" />
      <path d="M60 60 L102 36 M60 60 L18 36 M60 60 V108" opacity={0.7} />
      <circle cx="60" cy="60" r="5" fill="url(#pg)" />
    </g>
  ),
  capacity: (
    <g {...stroke}>
      <path d="M60 10 C80 30 84 58 76 84 H44 C36 58 40 30 60 10 Z" />
      <circle cx="60" cy="46" r="9" />
      <path d="M44 72 L28 96 L46 88 M76 72 L92 96 L74 88" />
      <path d="M54 92 Q60 114 66 92" opacity={0.7} />
    </g>
  ),
  data: (
    <g {...stroke}>
      <ellipse cx="60" cy="28" rx="36" ry="13" />
      <path d="M24 28 V84 C24 98 96 98 96 84 V28" />
      <path d="M24 56 C24 70 96 70 96 56" opacity={0.7} />
      <path d="M60 104 V118 M52 112 L60 120 L68 112" opacity={0} />
    </g>
  ),
  decide: (
    <g {...stroke}>
      <circle cx="28" cy="60" r="8" /><circle cx="92" cy="60" r="8" /><circle cx="60" cy="26" r="8" /><circle cx="60" cy="96" r="8" />
      <path d="M36 60 H52 M84 60 H68 M60 34 V46 M60 86 V74" opacity={0.7} />
      <path d="M46 62 L56 72 L76 50" />
    </g>
  ),
};
const PILLARS = [
  { prefix: "Share technology", icon: "tech", title: "Share technology", sub: "OPEN BLUEPRINTS" },
  { prefix: "Share spare", icon: "capacity", title: "Share capacity", sub: "SPARE ROCKET SEATS" },
  { prefix: "Share the data", icon: "data", title: "Share data", sub: "WHAT COMES BACK" },
  { prefix: "And decide", icon: "decide", title: "Decide together", sub: "RULES ANYONE CAN VERIFY" },
];

const PillarCard: React.FC<{ p: (typeof PILLARS)[number]; at: number; x: number; dim: number }> = ({ p, at, x, dim }) => {
  const f = useCurrentFrame();
  const s = useSpring(at, { damping: 16, stiffness: 120 });
  const breathe = 0.5 + 0.5 * Math.sin(f * 0.05 + x * 0.01);
  return (
    <div
      style={{
        position: "absolute", left: x, top: 250, width: 390, height: 440, borderRadius: 26, boxSizing: "border-box", padding: "46px 34px",
        opacity: Math.min(s * 1.5, 1) * dim, transform: `translateY(${(1 - s) * 70}px) scale(${0.94 + 0.06 * s})`,
        background: "linear-gradient(160deg, rgba(255,255,255,0.12), rgba(255,255,255,0.03))", border: "1px solid rgba(255,255,255,0.2)", backdropFilter: "blur(22px)",
        boxShadow: `0 40px 90px rgba(0,0,0,0.5), 0 0 ${40 + breathe * 30}px rgba(139,92,246,0.25), inset 0 1px 0 rgba(255,255,255,0.25)`,
        display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
      }}
    >
      <svg width="150" height="150" viewBox="0 0 120 120" style={{ filter: "drop-shadow(0 0 14px rgba(34,211,238,0.5))" }}>
        <defs>
          <linearGradient id="pg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={C.violetBright} /><stop offset="1" stopColor={C.cyan} /></linearGradient>
        </defs>
        {ICONS[p.icon]}
      </svg>
      <Label size={27} style={{ marginTop: 40, lineHeight: 1.35 }}>{p.title}</Label>
      <div style={{ margin: "22px 0 18px", height: 3, width: 70, background: grad, borderRadius: 3 }} />
      <Mono size={17} color={C.cyanBright} style={{ letterSpacing: "0.2em" }}>{p.sub}</Mono>
    </div>
  );
};

export const Pillars: React.FC = () => {
  const f = useCurrentFrame();
  const t0 = T180.s03[0];
  const fin = cue("The more we connect", t0).from - 6;
  const dim = ramp(f, fin, fin + 18, 1, 0.1);
  const fo = ramp(f, fin, fin + 20);
  return (
    <AbsoluteFill>
      {PILLARS.map((p, i) => (
        <PillarCard key={p.title} p={p} at={cue(p.prefix, t0).from - 4} x={135 + i * 420} dim={dim} />
      ))}
      {fo > 0 && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: fo }}>
          <AbsoluteFill style={{ background: "radial-gradient(ellipse 62% 30% at 50% 46%, rgba(4,5,13,0.9) 0%, rgba(4,5,13,0.6) 55%, transparent 100%)" }} />
          <div style={{ fontFamily: DISPLAY, fontSize: 58, letterSpacing: "0.1em", textAlign: "center", lineHeight: 1.45, color: C.text, textShadow: "0 0 40px rgba(139,92,246,0.5)", marginTop: -50, filter: `blur(${(1 - fo) * 12}px)` }}>
            THE MORE WE CONNECT,
            <br />
            <span style={{ background: grad, WebkitBackgroundClip: "text", color: "transparent" }}>THE FARTHER WE GO</span>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

// ---------------- 06: seals live in Main180 (SealRow) ----------------

// ---------------- 08: network with a new node ----------------
const hash = (n: number) => {
  const s = Math.sin(n * 91.7 + 13.3) * 43758.5453;
  return s - Math.floor(s);
};
const NODES = Array.from({ length: 16 }, (_, i) => {
  const a = (i / 16) * Math.PI * 2 + hash(i) * 0.5;
  const r = 0.55 + hash(i + 40) * 0.45;
  return { x: 960 + Math.cos(a) * r * 640, y: 500 + Math.sin(a) * r * 300 };
});
const LINKS: [number, number][] = (() => {
  const out: [number, number][] = [];
  NODES.forEach((n, i) => {
    NODES.map((m, j) => ({ j, d: (m.x - n.x) ** 2 + (m.y - n.y) ** 2 }))
      .filter((o) => o.j !== i)
      .sort((a, b) => a.d - b.d)
      .slice(0, 2)
      .forEach((o) => {
        if (!out.some(([a, b]) => (a === i && b === o.j) || (a === o.j && b === i))) out.push([i, o.j]);
      });
  });
  return out;
})();
const NEW_TARGET = { x: 960, y: 500 };

export const Network: React.FC<{ joinAt: number }> = ({ joinAt }) => {
  const f = useCurrentFrame();
  const appear = ramp(f, 0, 30);
  const k = Easing.out(Easing.cubic)(Math.min(1, Math.max(0, (f - joinAt) / 50)));
  const nx = 1680 + (NEW_TARGET.x - 1680) * k;
  const ny = 160 + (NEW_TARGET.y - 160) * k;
  const near = NODES.map((n, i) => ({ i, d: (n.x - NEW_TARGET.x) ** 2 + (n.y - NEW_TARGET.y) ** 2 })).sort((a, b) => a.d - b.d).slice(0, 4);
  const landed = f - (joinAt + 50);
  return (
    <AbsoluteFill style={{ opacity: appear }}>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 60% 55% at 50% 48%, rgba(4,5,13,0.75), transparent)" }} />
      <svg width="1920" height="1080" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="ng" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor={C.violetBright} /><stop offset="1" stopColor={C.cyan} /></linearGradient>
        </defs>
        {LINKS.map(([a, b], i) => {
          const A = NODES[a], B = NODES[b];
          const t = ((f * 0.012 + hash(i + 7)) % 1 + 1) % 1;
          return (
            <g key={i}>
              <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke="url(#ng)" strokeWidth="1.6" opacity="0.4" />
              <circle cx={A.x + (B.x - A.x) * t} cy={A.y + (B.y - A.y) * t} r="4" fill="#fff" style={{ filter: `drop-shadow(0 0 8px ${C.cyan})` }} />
            </g>
          );
        })}
        {near.map(({ i }) => {
          const B = NODES[i];
          const dr = ramp(f, joinAt + 40, joinAt + 80);
          return <line key={`n${i}`} x1={NEW_TARGET.x} y1={NEW_TARGET.y} x2={B.x} y2={B.y} stroke={C.cyanBright} strokeWidth="3" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - dr} style={{ filter: `drop-shadow(0 0 10px ${C.cyan})` }} />;
        })}
        {NODES.map((n, i) => {
          const hit = near.some((o) => o.i === i) ? ramp(landed, 20, 30) * ramp(landed, 30, 70, 1, 0) : 0;
          return (
            <g key={i}>
              <circle cx={n.x} cy={n.y} r={22 + hit * 18} fill={`rgba(34,211,238,${hit * 0.25})`} />
              <circle cx={n.x} cy={n.y} r="8" fill="#e9e7ff" style={{ filter: `drop-shadow(0 0 ${10 + hit * 16}px ${hit > 0 ? C.cyan : C.violetBright})` }} />
            </g>
          );
        })}
        {f >= joinAt && (
          <g>
            <circle cx={nx} cy={ny} r="34" fill="none" stroke={C.cyan} strokeWidth="2" opacity={0.5 + 0.4 * Math.sin(f * 0.3)} />
            <circle cx={nx} cy={ny} r="13" fill="#fff" style={{ filter: `drop-shadow(0 0 22px ${C.cyan})` }} />
            {landed > 0 && landed < 40 && <circle cx={nx} cy={ny} r={34 + landed * 8} fill="none" stroke={C.cyan} strokeWidth={4 * (1 - landed / 40)} opacity={1 - landed / 40} />}
          </g>
        )}
      </svg>
      {f >= joinAt && (
        <div style={{ position: "absolute", left: nx + 40, top: ny - 16, opacity: ramp(f, joinAt, joinAt + 14) * ramp(landed, 40, 70, 1, 0.9) }}>
          <Mono size={20} color={C.cyanBright}>YOUR DESIGN</Mono>
        </div>
      )}
      <div style={{ position: "absolute", left: 0, right: 0, top: 84, textAlign: "center" }}>
        <Label size={34}>Your mission joins the network</Label>
        <Mono size={20} color={C.muted} style={{ marginTop: 18 }}>
          NODES {landed > 0 ? 17 : 16}
          <span style={{ color: C.faint }}> / NEXT MISSION STARTS FROM YOURS</span>
        </Mono>
      </div>
    </AbsoluteFill>
  );
};

// ---------------- 09: data source chips ----------------
const SOURCES = [
  ["NASA DONKI", "SPACE WEATHER"], ["NASA EONET", "EARTH EVENTS"], ["JPL HORIZONS", "EPHEMERIDES"],
  ["NASA SSCWEB", "STATION POSITION"], ["NASA DSN NOW", "DEEP SPACE NETWORK"], ["NASA APOD", "PICTURE OF THE DAY"],
];
export const DataChips: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <>
      {SOURCES.map(([name, sub], i) => {
        const s = useSpring(40 + i * 22, { damping: 16, stiffness: 130 });
        const x = 1130 + (i % 2) * 380;
        const y = 270 + Math.floor(i / 2) * 170;
        const pulse = 0.5 + 0.5 * Math.sin(f * 0.08 + i * 1.3);
        return (
          <div
            key={name}
            style={{
              position: "absolute", left: x, top: y, width: 350, height: 128, boxSizing: "border-box", padding: "26px 28px", borderRadius: 22,
              opacity: Math.min(s * 1.5, 1), transform: `translateY(${(1 - s) * 40}px) scale(${0.94 + 0.06 * s})`,
              background: "linear-gradient(150deg, rgba(34,211,238,0.14), rgba(255,255,255,0.03))", border: "1px solid rgba(34,211,238,0.4)", backdropFilter: "blur(18px)",
              boxShadow: `0 0 ${24 + pulse * 22}px rgba(34,211,238,${0.18 + pulse * 0.14}), inset 0 1px 0 rgba(255,255,255,0.2)`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 11, height: 11, borderRadius: 11, background: C.ok, boxShadow: `0 0 ${8 + pulse * 10}px ${C.ok}` }} />
              <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 28, color: C.text, letterSpacing: "0.01em" }}>{name}</div>
            </div>
            <Mono size={15} color={C.cyanBright} style={{ marginTop: 16, letterSpacing: "0.2em" }}>{sub}</Mono>
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 1130, top: 190, opacity: ramp(f, 20, 40) }}>
        <Mono size={18} color={C.muted}>LIVE SOURCES / EVERY NUMBER LINKS BACK</Mono>
      </div>
    </>
  );
};

// ---------------- 10: closing ----------------
export const Closing180: React.FC = () => {
  const f = useCurrentFrame();
  const w = useSpring(34, { damping: 14, stiffness: 120 });
  const l1 = ramp(f, 62, 84);
  const l2 = ramp(f, 122, 146);
  const btn = useSpring(172, { damping: 13, stiffness: 140 });
  const pulse = 0.5 + 0.5 * Math.sin(f * 0.14);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 58% 48% at 50% 38%, rgba(4,5,13,0.92) 0%, rgba(4,5,13,0.7) 55%, rgba(4,5,13,0) 100%)" }} />
      <Flash at={36} color="#ffffff" max={0.6} dur={20} />
      <Shockwave at={38} y={230} color={C.violetBright} size={2400} dur={44} />
      <Shockwave at={176} y={560} color={C.cyan} size={1800} dur={40} />
      <Flash at={176} color={C.cyanBright} max={0.35} dur={14} />
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 120 }}>
        <div style={{ transform: `scale(${1.18 - 0.18 * w})`, opacity: Math.min(w * 1.4, 1) }}>
          <Wordmark size={118} start={34} spacing={0.16} />
        </div>
        <div style={{ marginTop: 42, fontFamily: SANS, fontWeight: 700, fontSize: 70, letterSpacing: "-0.02em", color: "#fff", textShadow: "0 0 30px rgba(167,139,250,0.55), 0 2px 18px rgba(0,0,0,0.8)", opacity: l1, transform: `translateY(${(1 - l1) * 18}px)`, filter: `blur(${(1 - l1) * 8}px)` }}>
          Space belongs to humanity.
        </div>
        <div style={{ marginTop: 18, fontFamily: SANS, fontWeight: 500, fontSize: 46, letterSpacing: "-0.01em", color: C.cyanBright, textShadow: "0 0 24px rgba(34,211,238,0.5)", opacity: l2, transform: `translateY(${(1 - l2) * 14}px)`, filter: `blur(${(1 - l2) * 6}px)` }}>
          Let's explore it together.
        </div>
        <div
          style={{
            marginTop: 40, display: "flex", alignItems: "center", gap: 22, padding: "24px 60px", borderRadius: 999, opacity: Math.min(btn * 1.5, 1), transform: `scale(${0.8 + 0.2 * btn})`,
            background: "linear-gradient(90deg, #8b5cf6, #3b82f6)", boxShadow: `0 0 ${40 + pulse * 40}px rgba(139,92,246,${0.5 + pulse * 0.3}), 0 0 ${20 + pulse * 20}px rgba(34,211,238,0.3), inset 0 1px 0 rgba(255,255,255,0.4)`,
          }}
        >
          <svg width="34" height="34" viewBox="0 0 34 34"><path d="M8 4 L29 17 L8 30 Z" fill="#fff" /></svg>
          <div style={{ fontFamily: DISPLAY, fontSize: 34, letterSpacing: "0.16em", color: "#fff" }}>PLAY SPACEDAO</div>
        </div>
        <Mono size={20} color={C.muted} style={{ marginTop: 26, letterSpacing: "0.08em", textTransform: "none", opacity: ramp(f, 190, 210) }}>spacedao.dayon-x.workers.dev</Mono>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

