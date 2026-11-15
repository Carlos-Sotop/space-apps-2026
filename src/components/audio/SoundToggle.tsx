import { Icon } from "@/components/ui/Icon";
import { useSound } from "./index";

/** Mute / unmute music and sound effects (saved in localStorage). */
export function SoundToggle() {
  const { muted, toggle } = useSound();
  return (
    <button
      type="button" onClick={toggle} aria-pressed={!muted} aria-label={muted ? "Turn sound on" : "Turn sound off"}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line bg-glass text-muted transition hover:text-fg"
    >
      <Icon name={muted ? "mute" : "sound"} size={16} />
    </button>
  );
}
