import { useId } from "react";
import { motion } from "motion/react";

export type RockyPose = "wave" | "point" | "think" | "cheer" | "worried";

interface Props {
  pose?: RockyPose;
  size?: number;
  /** mirror Rocky so the pointing arm aims left */
  flip?: boolean;
  className?: string;
}

type Angle = number | number[];

interface PoseSpec {
  /** arm rotation in degrees, clockwise from hanging down (left arm: positive swings outward) */
  left: Angle;
  right: Angle;
  mouth: string;
  mouthFill?: boolean;
  eyeRy: number;
  browTilt: number;
  flame: number;
}

const POSES: Record<RockyPose, PoseSpec> = {
  wave: { left: 14, right: [-135, -165, -135], mouth: "M52 68 Q60 75 68 68", eyeRy: 4.4, browTilt: 0, flame: 1 },
  point: { left: 14, right: -92, mouth: "M52 68 Q60 74 68 68", eyeRy: 4.4, browTilt: 0, flame: 1 },
  think: { left: 14, right: -128, mouth: "M55 70 L65 70", eyeRy: 3.6, browTilt: 4, flame: 0.8 },
  cheer: { left: 150, right: -150, mouth: "M50 66 Q60 80 70 66 Z", mouthFill: true, eyeRy: 4.8, browTilt: 0, flame: 1.5 },
  worried: { left: 38, right: -38, mouth: "M53 72 Q60 66 67 72", eyeRy: 4.8, browTilt: -5, flame: 0.6 },
};

const armStyle = { originX: 0, originY: 0, transformBox: "view-box" } as const;

function Arm({ x, y, angle }: { x: number; y: number; angle: Angle }) {
  const loop = Array.isArray(angle);
  return (
    <g transform={`translate(${x} ${y})`}>
      <motion.g
        style={armStyle}
        initial={false}
        animate={{ rotate: angle }}
        transition={loop ? { duration: 0.9, repeat: Infinity, ease: "easeInOut" } : { type: "spring", stiffness: 160, damping: 14 }}
      >
        <path d="M0 0 L0 15" stroke="#c4b5fd" strokeWidth="5.5" strokeLinecap="round" />
        <circle cx="0" cy="16.5" r="4" fill="#ede9fe" />
      </motion.g>
    </g>
  );
}

/** Rocky, the SpaceDAO tutorial mascot. Original artwork drawn in code. */
export function Rocky({ pose = "wave", size = 120, flip = false, className = "" }: Props) {
  const id = useId();
  const p = POSES[pose];
  const bob = pose === "cheer" ? { y: [0, -9, 0] } : pose === "worried" ? { x: [-1.2, 1.2, -1.2] } : { y: [0, -3.5, 0] };
  const bobT = pose === "cheer" ? { duration: 0.6 } : pose === "worried" ? { duration: 0.18 } : { duration: 3 };

  return (
    <svg
      viewBox="0 0 120 150" width={size} height={(size * 150) / 120} role="img" aria-label={`Rocky the rocket mascot, ${pose}`}
      className={`shrink-0 overflow-visible ${className}`} style={flip ? { transform: "scaleX(-1)" } : undefined}
    >
      <defs>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ede9fe" />
          <stop offset="0.55" stopColor="#c4b5fd" />
          <stop offset="1" stopColor="#a78bfa" />
        </linearGradient>
        <radialGradient id={`${id}f`} cx="0.5" cy="0.2" r="0.8">
          <stop offset="0" stopColor="#fef3c7" />
          <stop offset="0.5" stopColor="#fbbf24" />
          <stop offset="1" stopColor="#fb7185" stopOpacity="0.7" />
        </radialGradient>
      </defs>

      <ellipse cx="60" cy="143" rx="22" ry="3.5" fill="#000" opacity="0.18" />

      <motion.g animate={bob} transition={{ ...bobT, repeat: Infinity, ease: "easeInOut" }}>
        <motion.g
          style={{ originX: "60px", originY: "112px", transformBox: "view-box" }}
          animate={{ scaleY: [p.flame, p.flame * 1.25, p.flame], scaleX: [1, 0.88, 1] }}
          transition={{ duration: 0.28, repeat: Infinity, ease: "easeInOut" }}
        >
          <path d="M50 110 Q46 126 60 138 Q74 126 70 110 Z" fill={`url(#${id}f)`} />
          <path d="M55 110 Q54 120 60 128 Q66 120 65 110 Z" fill="#fff7d6" opacity="0.9" />
        </motion.g>

        <path d="M51 108 L49 124" stroke="#8b5cf6" strokeWidth="5.5" strokeLinecap="round" />
        <path d="M69 108 L71 124" stroke="#8b5cf6" strokeWidth="5.5" strokeLinecap="round" />
        <ellipse cx="47.5" cy="126" rx="6" ry="3.2" fill="#7c4ddb" />
        <ellipse cx="72.5" cy="126" rx="6" ry="3.2" fill="#7c4ddb" />

        <Arm x={38} y={82} angle={p.left} />
        <Arm x={82} y={82} angle={p.right} />

        <path d="M39 86 L21 111 Q23 118 31 115 L41 106 Z" fill="#8b5cf6" />
        <path d="M81 86 L99 111 Q97 118 89 115 L79 106 Z" fill="#8b5cf6" />

        <path d="M60 8 C81 25 85 52 83 94 Q82 113 60 113 Q38 113 37 94 C35 52 39 25 60 8Z" fill={`url(#${id}b)`} />
        <path d="M60 8 C70 16 76 27 79 40 L41 40 C44 27 50 16 60 8Z" fill="#8b5cf6" />
        <path d="M37.6 98 Q60 107 82.4 98 L82.8 104 Q60 113 37.2 104Z" fill="#8b5cf6" opacity="0.6" />
        <path d="M44 34 C41 52 41 74 43 92" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.35" fill="none" />

        <circle cx="60" cy="62" r="21" fill="#f5f3ff" />
        <circle cx="60" cy="62" r="17" fill="#10122e" />
        <path d="M46 52 Q52 46 62 46" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.25" fill="none" />

        {p.browTilt !== 0 && (
          <>
            <path d={`M49 ${52 - p.browTilt} L57 ${52 + p.browTilt}`} stroke="#67e8f9" strokeWidth="1.8" strokeLinecap="round" />
            <path d={`M71 ${52 - p.browTilt} L63 ${52 + p.browTilt}`} stroke="#67e8f9" strokeWidth="1.8" strokeLinecap="round" />
          </>
        )}
        <motion.g
          animate={{ scaleY: [1, 1, 0.1, 1, 1] }} transition={{ duration: 4, times: [0, 0.44, 0.47, 0.5, 1], repeat: Infinity }}
          style={{ originX: "60px", originY: "60px", transformBox: "view-box" }}
        >
          <ellipse cx="53" cy="60" rx="3.6" ry={p.eyeRy} fill="#22d3ee" />
          <ellipse cx="67" cy="60" rx="3.6" ry={p.eyeRy} fill="#22d3ee" />
          <circle cx="54.2" cy="58.4" r="1.1" fill="#fff" />
          <circle cx="68.2" cy="58.4" r="1.1" fill="#fff" />
        </motion.g>
        <path d={p.mouth} stroke="#22d3ee" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill={p.mouthFill ? "#0e7490" : "none"} />

        {pose === "think" && (
          <g fill="#67e8f9">
            <circle cx="92" cy="30" r="2.2" opacity="0.5" />
            <circle cx="99" cy="21" r="3.2" opacity="0.75" />
            <circle cx="108" cy="9" r="4.4" />
          </g>
        )}
        {pose === "worried" && <path d="M78 46 Q82 52 78 56 Q74 52 78 46Z" fill="#67e8f9" opacity="0.9" />}
        {pose === "cheer" && (
          <path d="M18 30 L24 36 M18 36 L24 30 M96 22 L102 28 M96 28 L102 22" stroke="#fde68a" strokeWidth="2" strokeLinecap="round" />
        )}
      </motion.g>
    </svg>
  );
}
