import React from "react";
import { useCurrentFrame } from "remotion";
import { captions } from "./captions";
import { ramp } from "./components";
import { C, SANS } from "./theme";

export const Subtitles: React.FC = () => {
  const frame = useCurrentFrame();
  const cap = captions.find((c) => c.burn !== false && frame >= c.from - 2 && frame <= c.to + 6);
  if (!cap) return null;
  const words = cap.text.split(" ");
  const span = cap.to - cap.from;
  const inP = ramp(frame, cap.from - 2, cap.from + 5);
  const outP = ramp(frame, cap.to, cap.to + 6, 1, 0);
  const o = Math.min(inP, outP);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 58, display: "flex", justifyContent: "center", opacity: o, transform: `translateY(${(1 - o) * 14}px)` }}>
      <div
        style={{
          maxWidth: 1480, padding: "20px 44px", borderRadius: 999, textAlign: "center",
          background: "rgba(8,10,26,0.72)", border: "1px solid rgba(255,255,255,0.14)", backdropFilter: "blur(18px) saturate(160%)",
          boxShadow: "0 12px 50px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)",
          fontFamily: SANS, fontSize: 42, fontWeight: 500, lineHeight: 1.25, letterSpacing: "-0.01em",
        }}
      >
        {words.map((w, i) => {
          const at = cap.from + (i / words.length) * span * 0.92;
          const state = frame >= at ? (frame < at + 9 ? "active" : "past") : "next";
          const k = ramp(frame, at, at + 6, 0, 1);
          return (
            <span
              key={i}
              style={{
                display: "inline-block", marginRight: "0.28em",
                color: state === "next" ? "rgba(238,240,255,0.42)" : state === "active" ? C.cyanBright : C.text,
                textShadow: state === "active" ? "0 0 18px rgba(34,211,238,0.6)" : undefined,
                transform: `translateY(${(1 - k) * 4}px)`,
              }}
            >
              {w}
            </span>
          );
        })}
      </div>
    </div>
  );
};

