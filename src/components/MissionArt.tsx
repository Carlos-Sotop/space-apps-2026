import type { MissionId } from "@/engine/types";

/** CSS and SVG destination art, one per mission with a generic fallback. No photos, no logos. */
export function MissionArt({ id }: { id: MissionId | string }) {
  return (
    <svg viewBox="0 0 320 150" className="h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <radialGradient id={`g-${id}`} cx="50%" cy="100%" r="80%">
          <stop offset="0" stopColor={id === "moon-base-zero" ? "#cbd5e1" : id === "earth-guardian" ? "#34d399" : "#60a5fa"} stopOpacity="0.9" />
          <stop offset="1" stopColor="#0a0b1e" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`s-${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#a78bfa" /><stop offset="1" stopColor="#60a5fa" />
        </linearGradient>
      </defs>
      <rect width="320" height="150" fill="#070817" />
      {id === "orbital-lab" && (
        <>
          <ellipse cx="160" cy="260" rx="250" ry="150" fill="#102a5c" /><ellipse cx="160" cy="260" rx="250" ry="150" fill={`url(#g-${id})`} />
          <ellipse cx="160" cy="118" rx="190" ry="26" fill="none" stroke={`url(#s-${id})`} strokeWidth="1.5" strokeDasharray="3 5" />
          <g transform="translate(212 98)">
            <rect x="-14" y="-2" width="28" height="4" fill="#e0e7ff" /><rect x="-3" y="-9" width="6" height="18" fill="#a78bfa" />
            <rect x="-24" y="-7" width="8" height="14" fill="#60a5fa" /><rect x="16" y="-7" width="8" height="14" fill="#60a5fa" />
          </g>
        </>
      )}
      {id === "earth-guardian" && (
        <>
          <circle cx="160" cy="250" r="190" fill="#0b3b3a" /><circle cx="160" cy="250" r="190" fill={`url(#g-${id})`} />
          <path d="M60 76c60-18 140-18 200 0" fill="none" stroke="#fb7185" strokeWidth="1.5" opacity="0.8" />
          <circle cx="110" cy="92" r="3" fill="#fb923c" /><circle cx="205" cy="84" r="3" fill="#fb923c" /><circle cx="160" cy="98" r="2.4" fill="#fbbf24" />
          <path d="M40 40 150 100 270 40" fill="none" stroke="#22d3ee" strokeWidth="1" opacity="0.5" strokeDasharray="2 4" />
        </>
      )}
      {id === "moon-base-zero" && (
        <>
          <circle cx="160" cy="260" r="200" fill="#3a3f55" /><circle cx="160" cy="260" r="200" fill={`url(#g-${id})`} />
          <ellipse cx="110" cy="92" rx="22" ry="5" fill="#252a3f" /><ellipse cx="228" cy="100" rx="14" ry="3.5" fill="#252a3f" />
          <g transform="translate(160 66)">
            <rect x="-8" y="-6" width="16" height="12" rx="2" fill="#a78bfa" /><path d="M-8 6l-6 8M8 6l6 8" stroke="#e0e7ff" strokeWidth="1.5" />
            <circle cx="0" cy="-10" r="6" fill="#fbbf24" opacity="0.18" />
          </g>
          <circle cx="262" cy="30" r="9" fill="#60a5fa" /><circle cx="262" cy="30" r="9" fill="none" stroke="#a78bfa" opacity="0.5" />
        </>
      )}
      {!["orbital-lab", "earth-guardian", "moon-base-zero"].includes(id) && (
        <circle cx="160" cy="260" r="190" fill="#1f2547" />
      )}
    </svg>
  );
}
