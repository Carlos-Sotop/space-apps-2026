import React, { useRef } from "react";
import { AbsoluteFill, Easing, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
// Keep gameTextures above the scene import: it points the game's TEX at video/public/textures before the scene loads.
import "./gameTextures";
// SCENE SWITCH, one line. When FlightSceneCore exists in ../src/three/FlightScene3D.tsx, replace the next line with:
//   import { FlightSceneCore as FlightScene } from "@/three/FlightScene3D";
import { StubFlightScene as FlightScene } from "./FlightStub";
import type { LiveSpaceWeather } from "@/engine/types";
import { getMission } from "@/lib/catalog";
import { fmtKm } from "@/lib/format";
import { buildTimeline, dayAt, phaseAt, type Timeline } from "@/screens/flightTimeline";
import moonSnapshot from "@/data/snapshots/moon.json";
import dsnSnapshot from "@/data/snapshots/dsn.json";
import weatherSnapshot from "@/data/snapshots/space-weather.json";
import { C, DISPLAY, MONO, SANS } from "./theme";

/** Flight progress per second at the game's 1x: the whole flight plays in 24 s (DURATION_S in src/screens/Flight.tsx). */
export const FLIGHT_RATE = 1 / 24;

const MISSION_ID = "moon-base-zero";
const mission = getMission(MISSION_ID);
if (!mission) throw new Error(`FlightClip: no mission "${MISSION_ID}" in the game catalog`);
const TIMELINE = buildTimeline(mission.phases);
// as in Flight.tsx: a destination reached by trans-lunar injection flies the Earth-Moon view
const LUNAR = mission.destinations[0]?.orbitClass === "TLI";

// ---------------- the NASA data the flight runs on (Flight.tsx liveItems, from the game's bundled snapshots) ----------------
type Chip = { label: string; value: string };
type Dish = { name: string; targets: string[]; downlinkActive: boolean };
// DSN codes of agency missions (NASA, ESA, KARI). The game shows the first dish tracking anything; the video skips any
// target not listed here, so a company spacecraft never reaches the picture.
const AGENCY_TARGETS = new Set(["SOHO", "M20", "MSL", "IMAP", "SPP", "LRO", "NHPC", "KPLO", "RST", "JNO", "ESCA", "ESCB", "M01O", "MRO", "MVN", "TGO", "VGR1", "VGR2", "PSYC", "EURC", "LUCY", "JWST"]);

const LIVE: Chip[] = (() => {
  const chips: Chip[] = [];
  if (LUNAR && moonSnapshot.moonDistanceKm) chips.push({ label: "Moon now", value: fmtKm(moonSnapshot.moonDistanceKm) });
  const dishes = (dsnSnapshot.stations as { dishes: Dish[] }[])
    .flatMap((st) => st.dishes)
    .map((d) => ({ ...d, targets: d.targets.filter((t) => AGENCY_TARGETS.has(t)) }));
  const tracking = dishes.find((d) => d.downlinkActive && d.targets.length) ?? dishes.find((d) => d.targets.length);
  if (tracking) chips.push({ label: "DSN", value: `${tracking.name} to ${tracking.targets[0]}` });
  const storm = (weatherSnapshot.items as LiveSpaceWeather[])[0];
  if (storm) {
    chips.push({
      label: storm.kind === "GST" ? "Geomagnetic storm" : storm.kind === "FLR" ? "Solar flare" : "Coronal mass ejection",
      // in UTC, so the date does not depend on the rendering machine's time zone
      value: storm.magnitude ?? new Date(storm.time).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
    });
  }
  return chips;
})();

// ---------------- HUD: src/screens/FlightHud.tsx in inline styles, its animations as functions of time ----------------
// The game's flight panel is about 874 x 437 px in a 1440 px window; the HUD's pixel sizes scale from there.
const PANEL_W = 874, PANEL_H = 437;
const unit = (x: number) => Math.min(1, Math.max(0, x));
const pad = (n: number, w = 2) => String(Math.max(0, Math.floor(n))).padStart(w, "0");
const CALLOUT = Easing.bezier(0.22, 1, 0.36, 1);
const EASE_IN_OUT = Easing.bezier(0.42, 0, 0.58, 1);
const EASE_OUT = Easing.bezier(0, 0, 0.58, 1);

type HudProps = { timeline: Timeline; p: number; t: number; rate: number; width: number; height: number; lunar: boolean };

const FlightHud: React.FC<HudProps> = ({ timeline, p, t, rate, width, height, lunar }) => {
  const k = Math.min(width / PANEL_W, height / PANEL_H);
  // seconds of video the flight takes to cover dp of progress (the game animates in real seconds at 1x)
  const secs = (dp: number) => (rate > 0 ? dp / rate : Infinity);
  const { index } = phaseAt(timeline, p);
  const total = timeline.phases.length;
  const start = timeline.starts[index] ?? 0;
  const span = (timeline.starts[index + 1] ?? 1) - start;
  const sinceStart = secs(p);
  const sincePhase = secs(p - start);
  const ended = p >= 1;
  const color = C.violetBright;

  // phase callout (AnimatePresence mode="wait"): the old label leaves in 0.45 s, then the new one comes in for 0.45 s
  const leaving = index > 0 && sincePhase < 0.45;
  const shown = leaving ? index - 1 : index;
  const out = leaving ? CALLOUT(unit(sincePhase / 0.45)) : 0;
  const inn = leaving ? 1 : CALLOUT(unit((index > 0 ? sincePhase - 0.45 : sincePhase) / 0.45));
  const callBlur = leaving ? 4 * out : 6 * (1 - inn);

  // mission clock: the digits flash from 0.35 opacity each time the day turns
  const day = dayAt(timeline, p);
  const daysPerSec = span > 0 && rate > 0 ? ((timeline.phases[index]?.days ?? 0) * rate) / span : 0;
  const sinceDay = Math.min(sinceStart, daysPerSec > 0 ? (day - Math.floor(day)) / daysPerSec : Infinity);
  const digits = 0.35 + 0.65 * EASE_OUT(unit(sinceDay / 0.3));

  // one 1.1 s sweep across the frame when the phase changes
  const sweep = unit(sincePhase / 1.1);
  const sweepO = sweep < 0.5 ? EASE_IN_OUT(sweep * 2) : EASE_IN_OUT((1 - sweep) * 2);
  const corners = EASE_OUT(unit((sinceStart - 0.1) / 0.5));
  const dot = 0.675 + 0.325 * Math.cos((2 * Math.PI * t) / 1.8); // the pulse-dot keyframes, 1.8 s

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {(["tl", "tr", "bl", "br"] as const).map((at) => {
        const flipX = at === "tr" || at === "br", flipY = at === "bl" || at === "br";
        return (
          <svg
            key={at} viewBox="0 0 40 40" width={34 * k} height={34 * k}
            style={{ position: "absolute", [flipY ? "bottom" : "top"]: 10 * k, [flipX ? "right" : "left"]: 10 * k, transform: `scale(${flipX ? -1 : 1}, ${flipY ? -1 : 1})`, opacity: corners }}
          >
            <path d="M2 16 L2 2 L16 2" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.9" />
            <path d="M22 2 L30 2" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.3" />
          </svg>
        );
      })}

      {!ended && sweep < 1 && (
        <div
          style={{
            position: "absolute", top: 0, bottom: 0, width: 96 * k, left: `${-10 + 120 * EASE_IN_OUT(sweep)}%`, opacity: sweepO,
            background: "linear-gradient(90deg, transparent, rgba(167,139,250,0.10), transparent)",
          }}
        />
      )}

      {/* phase callout */}
      <div
        style={{
          position: "absolute", left: 24 * k, top: 48 * k, opacity: leaving ? 1 - out : inn,
          transform: `translateY(${(leaving ? -10 * out : 14 * (1 - inn)) * k}px)`, filter: callBlur > 0.01 ? `blur(${callBlur * k}px)` : undefined,
        }}
      >
        <div style={{ fontFamily: MONO, fontSize: 10 * k, letterSpacing: "0.3em", color, fontVariantNumeric: "tabular-nums" }}>
          PHASE {pad(shown + 1)} / {pad(total)}
        </div>
        <div style={{ fontFamily: DISPLAY, fontSize: 24 * k, marginTop: 2 * k, lineHeight: 1, letterSpacing: "0.08em", textTransform: "uppercase", color: C.text }}>
          {timeline.phases[shown]?.label}
        </div>
      </div>

      {/* mission clock */}
      <div style={{ position: "absolute", right: 24 * k, top: 48 * k, textAlign: "right" }}>
        <div style={{ fontFamily: MONO, fontSize: 10 * k, letterSpacing: "0.3em", color: C.faint }}>MISSION CLOCK</div>
        <div style={{ fontFamily: MONO, fontSize: 24 * k, marginTop: 2 * k, lineHeight: 1, color: C.text, fontVariantNumeric: "tabular-nums" }}>
          T+<span style={{ opacity: digits }}>{pad(day, 3)}</span>
          <span style={{ color: C.faint }}>d</span>
        </div>
      </div>

      {/* the NASA data this flight runs on */}
      {LIVE.length > 0 && (
        <div style={{ position: "absolute", left: 24 * k, bottom: 64 * k, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6 * k }}>
          {LIVE.map((it) => (
            <div
              key={it.label}
              style={{
                display: "flex", alignItems: "center", gap: 6 * k, padding: `${4 * k}px ${10 * k}px`, borderRadius: 999,
                border: `${k}px solid ${C.line}`, background: "rgba(7,10,24,0.8)", backdropFilter: `blur(${8 * k}px)`,
              }}
            >
              <span style={{ width: 6 * k, height: 6 * k, flexShrink: 0, borderRadius: 999, background: C.cyan, opacity: dot }} />
              <span style={{ fontFamily: SANS, fontSize: 10 * k, letterSpacing: "0.05em", textTransform: "uppercase", color: C.faint }}>{it.label}</span>
              <span style={{ fontFamily: MONO, fontSize: 11 * k, color: C.text, fontVariantNumeric: "tabular-nums" }}>{it.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* progress ticks */}
      <div style={{ position: "absolute", left: 24 * k, right: 24 * k, bottom: 36 * k, display: "flex", alignItems: "flex-end", gap: 3 * k }}>
        {Array.from({ length: 48 }, (_, i) => {
          const on = i / 47 <= p;
          const g = on ? EASE_OUT(unit(secs(p - i / 47) / 0.25)) : 0;
          const full = i % 6 === 0 ? 10 : 5;
          return (
            <span
              key={i}
              style={{ flex: 1, borderRadius: 999, background: on ? color : "rgba(255,255,255,0.14)", height: (3 + (full - 3) * g) * k, opacity: 0.5 + 0.5 * g }}
            />
          );
        })}
      </div>

      <div style={{ position: "absolute", right: 56 * k, bottom: 10 * k, fontFamily: SANS, fontSize: 10 * k, letterSpacing: "0.05em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)" }}>
        {lunar ? "Not to scale" : "Earth orbit, not to scale"}
      </div>
    </div>
  );
};

// ---------------- the clip ----------------
type FlightClipProps = {
  /** flight progress (0..1) at the clip's first frame */
  from?: number;
  /** flight progress per second of video; the game's 1x by default */
  rate?: number;
  hud?: boolean;
  width?: number;
  height?: number;
  /** crop in: 1 shows the whole view; focus is the point (fractions of the view) the crop centres on, clamped to the edges */
  zoom?: number;
  focus?: [number, number];
};

/**
 * The game's 3D flight for Moon Base Zero, rendered frame by frame (no screen capture), with the game's flight HUD.
 * The default size is the inside of the 1500 x 844 GlassFrame in scenes.tsx (8 px padding and 1 px border a side).
 */
export const FlightClip: React.FC<FlightClipProps> = ({ from = 0, rate = FLIGHT_RATE, hud = true, width = 1482, height = 826, zoom = 1, focus = [0.5, 0.5] }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = useRef(0);
  const clock = useRef(0);
  // Set before ThreeCanvas renders: it advances the scene in an effect after each frame change, and the scene's
  // useFrame reads these two values.
  const p = unit(from + (rate * frame) / fps);
  progress.current = p;
  clock.current = frame / fps;
  // a crop scales the whole view (canvas and HUD) from the corner; the canvas renders at the zoom's pixel ratio so it stays sharp
  const z = Math.max(1, zoom);
  const left = Math.min(Math.max(focus[0] * width - width / z / 2, 0), width - width / z);
  const top = Math.min(Math.max(focus[1] * height - height / z / 2, 0), height - height / z);
  return (
    <AbsoluteFill style={{ width, height, overflow: "hidden", background: "#04060f" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width, height, transformOrigin: "0 0", transform: z > 1 ? `scale(${z}) translate(${-left}px, ${-top}px)` : undefined }}>
        <ThreeCanvas width={width} height={height} dpr={z} gl={{ antialias: true }}>
          <FlightScene timeline={TIMELINE} lunar={LUNAR} progress={progress} clock={clock} />
        </ThreeCanvas>
        {hud && <FlightHud timeline={TIMELINE} p={p} t={frame / fps} rate={rate} width={width} height={height} lunar={LUNAR} />}
      </div>
    </AbsoluteFill>
  );
};
