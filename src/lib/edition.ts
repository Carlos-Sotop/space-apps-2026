/**
 * Build edition. The NASA Space Apps build stays brand-neutral (no commercial names).
 * `VITE_EDITION=moondao` builds the partner edition shown to the MoonDAO track.
 */
export const EDITION: "nasa" | "moondao" = import.meta.env.VITE_EDITION === "moondao" ? "moondao" : "nasa";

/** Who commissions a mission in this edition, if anyone. */
export function missionClient(missionId: string): string | undefined {
  return EDITION === "moondao" && missionId === "moon-base-zero" ? "MoonDAO" : undefined;
}
