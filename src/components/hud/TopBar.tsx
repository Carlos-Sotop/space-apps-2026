import type { ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { LogoMark } from "@/components/brand/Logo";

interface Props {
  title?: string;
  onBack?: () => void;
  backLabel?: string;
  right?: ReactNode;
}

export function TopBar({ title, onBack, backLabel = "Back", right }: Props) {
  return (
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
      <div className="flex shrink-0 items-center gap-2">{right}</div>
    </header>
  );
}
