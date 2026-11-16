import { useState } from "react";
import { motion } from "motion/react";
import { sfx } from "@/components/audio";
import { Icon } from "@/components/ui";
import { LEVELS, useGame, type PlayerLevel } from "@/store/game";
import { Rocky, type RockyPose } from "./Rocky";

interface Card {
  name: string;
  line: string;
  /** 1 to 4 */
  stars: number;
  pose: RockyPose;
}

/** The four ways in. Same game, same missions: what changes is how much it explains and fills in. */
export const LEVEL_CARDS: Record<PlayerLevel, Card> = {
  cadet: { name: "Cadet", line: "New to space? Rocky shows you everything.", stars: 1, pose: "cheer" },
  explorer: { name: "Explorer", line: "Curious about space? Learn by building.", stars: 2, pose: "wave" },
  scientist: { name: "Scientist", line: "You know your orbits. Numbers up front.", stars: 3, pose: "think" },
  director: { name: "Flight Director", line: "You run missions. Full control.", stars: 4, pose: "point" },
};

function Stars({ n }: { n: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`Difficulty ${n} of 4`}>
      {[1, 2, 3, 4].map((i) => (
        <Icon key={i} name="star" size={13} className={i <= n ? "text-cyan" : "text-white/15"} fill={i <= n ? "currentColor" : "none"} />
      ))}
    </span>
  );
}

/**
 * "Who's flying today?" Picking a level picks the Rocky who guides the whole run, so the player
 * sees from the first screen that the game is for them.
 */
export function LevelPicker({ onPick }: { onPick: (l: PlayerLevel) => void }) {
  const level = useGame((s) => s.level);
  const [active, setActive] = useState<PlayerLevel | null>(null);
  return (
    <div className="mx-auto w-full max-w-6xl">
      <p className="mb-5 text-center text-sm text-muted">Same missions either way. This sets how much the game explains and fills in. You can change it later from the Tutorial button.</p>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-coach="level.cards">
        {LEVELS.map((id) => {
          const c = LEVEL_CARDS[id];
          const on = active === id;
          return (
            <li key={id}>
              <motion.button
                type="button"
                aria-pressed={level === id}
                onClick={() => { sfx("confirm"); onPick(id); }}
                onPointerEnter={() => { if (active !== id) sfx("hover"); setActive(id); }}
                onPointerLeave={() => setActive((a) => (a === id ? null : a))}
                onFocus={() => setActive(id)}
                onBlur={() => setActive((a) => (a === id ? null : a))}
                className={`glass flex h-full w-full flex-col items-center gap-2 p-4 text-center transition-[border-color,box-shadow] ${on ? "border-cyan shadow-select" : ""}`}
                whileHover={{ y: -6 }}
                whileFocus={{ y: -6 }}
                transition={{ type: "spring", stiffness: 300, damping: 22 }}
              >
                {/* the Rocky of this level, animated only while the card is hovered or focused */}
                <Rocky variant={id} pose={on ? c.pose : "wave"} size={96} />
                <span className="font-display text-[15px]">{c.name}</span>
                <Stars n={c.stars} />
                <span className="text-[13px] leading-snug text-muted">{c.line}</span>
              </motion.button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
