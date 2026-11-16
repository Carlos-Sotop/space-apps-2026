import { useState, type ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { LogoMark } from "@/components/brand/Logo";
import { useTutorial } from "@/components/tutorial";
import { LevelPicker } from "@/components/tutorial/LevelPicker";
import { Modal } from "@/components/ui/Modal";
import { useGame } from "@/store/game";
import { JourneyBar } from "./JourneyBar";
import { NasaLiveChip } from "./NasaLiveChip";

interface Props {
  title?: string;
  onBack?: () => void;
  backLabel?: string;
  right?: ReactNode;
}

export function TopBar({ title, onBack, backLabel = "Back", right }: Props) {
  const tutorial = useTutorial();
  const setLevel = useGame((s) => s.setLevel);
  const [levels, setLevels] = useState(false);
  return (
    <>
    <header className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        {onBack && (
          <button type="button" onClick={onBack} aria-label={backLabel} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-glass text-muted transition hover:text-fg">
            <Icon name="back" size={17} />
          </button>
        )}
        <LogoMark size={32} className="shrink-0" />
        {title && <h1 className="font-display truncate text-sm sm:text-base">{title}</h1>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button" onClick={tutorial.toggle} aria-pressed={tutorial.enabled} aria-label="Tutorial"
          className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-[13px] transition ${tutorial.enabled ? "border-cyan bg-cyan/15 text-cyan-bright" : "border-line bg-glass text-muted hover:text-fg"}`}
        >
          <Icon name="sparkle" size={15} /> <span className="hidden sm:inline">Tutorial</span>
        </button>
        <button
          type="button" onClick={() => setLevels(true)} aria-label="Change level"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-glass text-muted transition hover:text-fg"
        >
          <Icon name="star" size={15} />
        </button>
        <NasaLiveChip />
        {right}
      </div>
    </header>
    <JourneyBar />
    <Modal open={levels} onClose={() => setLevels(false)} title="Who's flying today?" wide>
      <LevelPicker onPick={(l) => { setLevel(l); setLevels(false); }} />
    </Modal>
    </>
  );
}
