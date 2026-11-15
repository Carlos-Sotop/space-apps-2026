import type { ReactNode } from "react";

interface Props {
  /** left slot, e.g. the current selection */
  left?: ReactNode;
  /** right slot, the primary action */
  children: ReactNode;
  className?: string;
}

/** Sticky bottom bar: context on the left, the primary action on the right. */
export function ActionBar({ left, children, className = "" }: Props) {
  return (
    <div className={`glass-strong sticky bottom-0 z-30 flex items-center justify-between gap-3 rounded-none border-x-0 border-b-0 px-4 pt-3 sm:px-6 ${className}`} style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
      <div className="min-w-0 flex-1 text-sm">{left}</div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
  );
}
